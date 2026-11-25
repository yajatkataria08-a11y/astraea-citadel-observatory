"""
Minimal, dependency-free auth: scrypt password hashing, HMAC-signed bearer tokens, SQLite users table,
and an in-memory login throttle. Good for a demo/hackathon backend; for production put it behind HTTPS and
swap the signing secret via ASTRAEA_SECRET.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")
MAX_FAILS, WINDOW = 5, 600  # 5 failed logins / 10 minutes per (email, ip)


class AuthError(Exception):
    def __init__(self, status: int, detail: str):
        self.status, self.detail = status, detail


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    try:
        dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
        return f"scrypt${_b64(salt)}${_b64(dk)}"
    except (AttributeError, ValueError):  # Python built without OpenSSL scrypt
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000, 32)
        return f"pbkdf2${_b64(salt)}${_b64(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        kind, salt_s, dk_s = stored.split("$")
        salt, want = _unb64(salt_s), _unb64(dk_s)
        if kind == "scrypt":
            got = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
        elif kind == "pbkdf2":
            got = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000, 32)
        else:
            return False
        return hmac.compare_digest(got, want)
    except Exception:  # noqa: BLE001
        return False


class AuthService:
    def __init__(self, db_path: Path, data_dir: Path, ttl: int):
        self.db_path, self.ttl = Path(db_path), ttl
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._secret = self._load_secret(Path(data_dir) / "secret.key")
        self._fails: Dict[Tuple[str, str], list] = {}
        with closing(self._conn()) as c:
            c.execute("""CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                pw_hash TEXT NOT NULL,
                created_at TEXT NOT NULL)""")
            c.execute("""CREATE TABLE IF NOT EXISTS oauth_identities (
                provider TEXT NOT NULL,
                subject TEXT NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id),
                PRIMARY KEY (provider, subject))""")
            c.commit()

    @staticmethod
    def _load_secret(path: Path) -> bytes:
        env = os.getenv("ASTRAEA_SECRET")
        if env:
            return env.encode()
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            return path.read_bytes()
        key = secrets.token_bytes(32)
        path.write_bytes(key)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
        return key

    def _conn(self):
        c = sqlite3.connect(self.db_path, timeout=10)
        c.row_factory = sqlite3.Row
        return c

    # ---- tokens ----
    def make_token(self, user: Dict[str, Any]) -> str:
        body = _b64(json.dumps({"sub": user["id"], "name": user["name"], "email": user["email"],
                                "exp": int(time.time()) + self.ttl}, separators=(",", ":")).encode())
        sig = _b64(hmac.new(self._secret, body.encode(), hashlib.sha256).digest())
        return f"{body}.{sig}"

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            body, sig = token.split(".")
            want = _b64(hmac.new(self._secret, body.encode(), hashlib.sha256).digest())
            if not hmac.compare_digest(sig, want):
                return None
            payload = json.loads(_unb64(body))
            if payload["exp"] < time.time():
                return None
            return {"id": payload["sub"], "name": payload["name"], "email": payload["email"]}
        except Exception:  # noqa: BLE001
            return None

    # ---- accounts ----
    def signup(self, name: str, email: str, password: str) -> Dict[str, Any]:
        name, email = name.strip(), email.strip().lower()
        if not (1 <= len(name) <= 80):
            raise AuthError(422, "Name must be 1-80 characters.")
        if not EMAIL_RE.match(email):
            raise AuthError(422, "Enter a valid email address.")
        if not (8 <= len(password) <= 128):
            raise AuthError(422, "Password must be 8-128 characters.")
        try:
            with closing(self._conn()) as c:
                cur = c.execute("INSERT INTO users(email,name,pw_hash,created_at) VALUES(?,?,?,?)",
                                (email, name, hash_password(password), datetime.now(timezone.utc).isoformat()))
                c.commit()
                uid = cur.lastrowid
        except sqlite3.IntegrityError:
            raise AuthError(409, "An account with this email already exists. Try signing in.")
        return {"id": uid, "name": name, "email": email}

    def login(self, email: str, password: str, ip: str = "") -> Dict[str, Any]:
        email = email.strip().lower()
        key = (email, ip)
        now = time.time()
        recent = [t for t in self._fails.get(key, []) if now - t < WINDOW]
        if len(recent) >= MAX_FAILS:
            raise AuthError(429, "Too many failed attempts. Try again in a few minutes.")
        with closing(self._conn()) as c:
            row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        # Always run a hash to keep timing similar whether or not the account exists.
        ok = verify_password(password, row["pw_hash"] if row else hash_password("x"))
        if not (row and ok):
            self._fails[key] = recent + [now]
            raise AuthError(401, "Invalid email or password.")
        self._fails.pop(key, None)
        return {"id": row["id"], "name": row["name"], "email": row["email"]}

    # ---- OAuth ----
    def sign_state(self, payload: Dict[str, Any]) -> str:
        body = _b64(json.dumps(payload, separators=(",", ":")).encode())
        return f"{body}.{_b64(hmac.new(self._secret, b'state:' + body.encode(), hashlib.sha256).digest())}"

    def read_state(self, state: str) -> Optional[Dict[str, Any]]:
        try:
            body, sig = state.split(".")
            want = _b64(hmac.new(self._secret, b"state:" + body.encode(), hashlib.sha256).digest())
            if not hmac.compare_digest(sig, want):
                return None
            payload = json.loads(_unb64(body))
            return payload if payload["exp"] >= time.time() else None
        except Exception:  # noqa: BLE001
            return None

    def oauth_login(self, provider: str, subject: str, email: str, name: str, email_verified: bool) -> Dict[str, Any]:
        """Find or create the user for a provider identity.

        An existing account is linked by email ONLY when the provider vouches that the email is verified;
        otherwise anyone could register an unverified address at a provider and take over that account.
        """
        email = (email or "").strip().lower()
        if not subject:
            raise AuthError(400, "Provider did not return an account id.")
        if not EMAIL_RE.match(email):
            raise AuthError(400, f"Your {provider.title()} account has no usable email address.")
        with closing(self._conn()) as c:
            ident = c.execute("SELECT user_id FROM oauth_identities WHERE provider=? AND subject=?", (provider, subject)).fetchone()
            if ident:
                row = c.execute("SELECT * FROM users WHERE id=?", (ident["user_id"],)).fetchone()
            else:
                row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
                if row and not email_verified:
                    raise AuthError(409, "An account with this email exists. Sign in with your password first "
                                         f"({provider.title()} did not confirm that you own this address).")
                if not row:
                    display = (name or email.split("@")[0]).strip()[:80] or "User"
                    cur = c.execute("INSERT INTO users(email,name,pw_hash,created_at) VALUES(?,?,?,?)",
                                    (email, display, "oauth$-$-", datetime.now(timezone.utc).isoformat()))  # unusable password hash
                    row = c.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
                c.execute("INSERT OR IGNORE INTO oauth_identities(provider,subject,user_id) VALUES(?,?,?)", (provider, subject, row["id"]))
            c.commit()
        return {"id": row["id"], "name": row["name"], "email": row["email"]}
