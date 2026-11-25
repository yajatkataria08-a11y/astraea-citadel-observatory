import secrets
import time
from typing import Any, Dict, Optional
from urllib.parse import quote

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from .. import state
from ..config import FRONTEND_URL
from ..services import oauth
from ..services.auth import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


def current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Optional bearer auth: returns the user dict, or None for guests / bad tokens."""
    if not authorization or not authorization.lower().startswith("bearer ") or state.auth is None:
        return None
    return state.auth.verify_token(authorization[7:].strip())


def _wrap(fn, *a):
    try:
        return fn(*a)
    except AuthError as e:
        raise HTTPException(e.status, detail=e.detail)


@router.post("/signup", status_code=201)
def signup(body: SignupIn):
    user = _wrap(state.auth.signup, body.name, body.email, body.password)
    return {"token": state.auth.make_token(user), "user": user}


@router.post("/login")
def login(body: LoginIn, request: Request):
    ip = request.client.host if request.client else ""
    user = _wrap(state.auth.login, body.email, body.password, ip)
    return {"token": state.auth.make_token(user), "user": user}


@router.get("/me")
def me(authorization: Optional[str] = Header(None)):
    user = current_user(authorization)
    if not user:
        raise HTTPException(401, detail="Not signed in or session expired.")
    return {"user": user}


# ---------------- OAuth ----------------
NONCE_COOKIE = "astraea_oauth_nonce"


def _safe_next(n: Optional[str]) -> str:
    return n if n and n.startswith("/") and not n.startswith("//") and len(n) < 200 else "/pipelines"


def _fail(msg: str) -> RedirectResponse:
    r = RedirectResponse(f"{FRONTEND_URL}/login?oauth_error={quote(msg)}", status_code=302)
    r.delete_cookie(NONCE_COOKIE)
    return r


@router.get("/providers")
def providers():
    return {"providers": oauth.enabled()}


@router.get("/oauth/{provider}/start")
def oauth_start(provider: str, next: Optional[str] = None):
    if provider not in oauth.PROVIDERS:
        raise HTTPException(404, detail="Unknown provider.")
    if not oauth.enabled()[provider]:
        return _fail(f"{provider.title()} sign-in is not configured on this server (missing client id/secret).")
    nonce = secrets.token_urlsafe(16)
    state_obj = state_sign({"p": provider, "n": nonce, "next": _safe_next(next), "exp": int(time.time()) + 600})
    r = RedirectResponse(oauth.authorize_url(provider, state_obj), status_code=302)
    r.set_cookie(NONCE_COOKIE, nonce, max_age=600, httponly=True, samesite="lax", secure=False)
    return r


def state_sign(payload: Dict[str, Any]) -> str:
    return state.auth.sign_state(payload)


@router.get("/oauth/{provider}/callback")
def oauth_callback(provider: str, request: Request, code: Optional[str] = None,
                   error: Optional[str] = None, error_description: Optional[str] = None):
    st_raw = request.query_params.get("state")
    if provider not in oauth.PROVIDERS:
        raise HTTPException(404, detail="Unknown provider.")
    if error:
        return _fail(error_description or error)
    payload = state.auth.read_state(st_raw or "")
    cookie = request.cookies.get(NONCE_COOKIE)
    if not payload or payload.get("p") != provider or not cookie or not secrets.compare_digest(str(payload.get("n")), cookie):
        return _fail("Sign-in session expired or was tampered with. Please try again.")
    if not code:
        return _fail("No authorization code returned.")
    try:
        prof = oauth.fetch_profile(provider, code)
        user = state.auth.oauth_login(provider, prof["subject"], prof["email"], prof["name"], prof["email_verified"])
    except AuthError as e:
        return _fail(e.detail)
    token = state.auth.make_token(user)
    r = RedirectResponse(f"{FRONTEND_URL}/login/callback#token={token}&next={quote(payload['next'])}", status_code=302)
    r.delete_cookie(NONCE_COOKIE)
    return r
