"""Authorization-code OAuth for Google, Microsoft (Entra / personal) and GitHub. Server-side: client secrets never reach the browser."""
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx

from ..config import BACKEND_PUBLIC_URL, MICROSOFT_TENANT, OAUTH_CLIENTS
from .auth import AuthError

PROVIDERS: Dict[str, Dict[str, str]] = {
    "google": {
        "auth": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "microsoft": {
        "auth": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/authorize",
        "token": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/token",
        "userinfo": "https://graph.microsoft.com/oidc/userinfo",
        "scope": "openid email profile",
    },
    "github": {
        "auth": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        "scope": "read:user user:email",
    },
}


def enabled() -> Dict[str, bool]:
    return {p: bool(OAUTH_CLIENTS[p][0] and OAUTH_CLIENTS[p][1]) for p in PROVIDERS}


def redirect_uri(provider: str) -> str:
    return f"{BACKEND_PUBLIC_URL}/api/v1/auth/oauth/{provider}/callback"


def authorize_url(provider: str, state: str) -> str:
    cfg = PROVIDERS[provider]
    q = {"client_id": OAUTH_CLIENTS[provider][0], "redirect_uri": redirect_uri(provider),
         "response_type": "code", "scope": cfg["scope"], "state": state}
    if provider == "google":
        q["prompt"] = "select_account"
    if provider == "microsoft":
        q["prompt"] = "select_account"
        q["response_mode"] = "query"
    return f"{cfg['auth']}?{urlencode(q)}"


def fetch_profile(provider: str, code: str, client: Optional[httpx.Client] = None) -> Dict[str, Any]:
    """Exchange the code and return {subject, email, name, email_verified}."""
    cfg = PROVIDERS[provider]
    cid, secret = OAUTH_CLIENTS[provider]
    own = client is None
    client = client or httpx.Client(timeout=10)
    try:
        r = client.post(cfg["token"], headers={"Accept": "application/json"}, data={
            "client_id": cid, "client_secret": secret, "code": code,
            "redirect_uri": redirect_uri(provider), "grant_type": "authorization_code"})
        tok = r.json() if r.content else {}
        access = tok.get("access_token")
        if r.status_code >= 400 or not access:
            raise AuthError(502, f"{provider.title()} rejected the sign-in ({tok.get('error_description') or tok.get('error') or r.status_code}).")
        h = {"Authorization": f"Bearer {access}", "Accept": "application/json"}
        u = client.get(cfg["userinfo"], headers=h)
        if u.status_code >= 400:
            raise AuthError(502, f"Could not read your {provider.title()} profile.")
        info = u.json()
        if provider == "github":
            email, verified = info.get("email"), False
            e = client.get("https://api.github.com/user/emails", headers=h)
            if e.status_code == 200:
                emails = e.json()
                pick = next((x for x in emails if x.get("primary") and x.get("verified")), None) or next((x for x in emails if x.get("verified")), None)
                if pick:
                    email, verified = pick["email"], True
            return {"subject": str(info.get("id", "")), "email": email or "", "name": info.get("name") or info.get("login") or "", "email_verified": verified}
        if provider == "google":
            return {"subject": str(info.get("sub", "")), "email": info.get("email", ""), "name": info.get("name", ""),
                    "email_verified": bool(info.get("email_verified"))}
        # Microsoft does not assert email ownership in userinfo, so it never auto-links to an existing account.
        return {"subject": str(info.get("sub", "")), "email": info.get("email") or info.get("preferred_username") or "",
                "name": info.get("name", ""), "email_verified": False}
    except httpx.HTTPError:
        raise AuthError(502, f"Could not reach {provider.title()}. Check your internet connection.")
    finally:
        if own:
            client.close()
