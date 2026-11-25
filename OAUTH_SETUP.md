# Social login setup (Google / Microsoft / GitHub)

The buttons on /login stay greyed out until you give the backend a client id + secret. Takes ~5 min per provider.
The secrets live only in the backend's environment, never in the frontend.

Redirect URIs to register (exactly these, `localhost` not `127.0.0.1`):

| Provider  | Redirect URI |
|-----------|--------------|
| Google    | `http://localhost:8000/api/v1/auth/oauth/google/callback` |
| Microsoft | `http://localhost:8000/api/v1/auth/oauth/microsoft/callback` |
| GitHub    | `http://localhost:8000/api/v1/auth/oauth/github/callback` |

## Google
1. https://console.cloud.google.com/ -> APIs & Services -> OAuth consent screen: User type External, fill app name + your email, add yourself as a Test user.
2. Credentials -> Create credentials -> OAuth client ID -> Web application. Add the redirect URI above.
3. Copy Client ID and Client secret.

## Microsoft
1. https://entra.microsoft.com/ -> App registrations -> New registration. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts". Redirect URI: platform **Web**, URI above.
2. Copy the Application (client) ID. Certificates & secrets -> New client secret -> copy the **Value**.

## GitHub
1. https://github.com/settings/developers -> OAuth Apps -> New OAuth App. Homepage `http://localhost:3000`, callback URL above.
2. Copy Client ID, then Generate a new client secret.

## Run the backend with the keys
Mac/Linux:
```
export GOOGLE_CLIENT_ID=...   GOOGLE_CLIENT_SECRET=...
export MICROSOFT_CLIENT_ID=... MICROSOFT_CLIENT_SECRET=...
export GITHUB_CLIENT_ID=...   GITHUB_CLIENT_SECRET=...
./start-backend.sh
```
Windows (cmd):
```
set GOOGLE_CLIENT_ID=...
set GOOGLE_CLIENT_SECRET=...
start-backend.bat
```
Only set the providers you want; the rest stay disabled.

## Deploying
Set `BACKEND_PUBLIC_URL` (e.g. https://api.yoursite.com) and `FRONTEND_URL`, register the matching HTTPS redirect URIs, add the frontend origin to `CORS_ORIGINS`, and set `ASTRAEA_SECRET`. In `routers/auth.py` change the nonce cookie to `secure=True` when serving over HTTPS.

## Security notes
- State is HMAC-signed and bound to a short-lived httpOnly cookie (blocks login CSRF); `next` is restricted to local paths.
- An existing password account is auto-linked only if the provider confirms the email is verified (Google, GitHub). Microsoft does not, so a Microsoft sign-in with an email that already has a password account is refused until the user signs in with the password.
- The session token is passed in the URL fragment and removed from the address bar immediately.
