"""Start the API:  python run.py     (HOST / PORT env vars override 127.0.0.1:8000)

The server only opens its port after the catalog + vetting model are loaded (about 10-40 s the first time, because
the LightGBM model is trained on startup). The frontend retries automatically, so just wait for 'ready'.
"""
import os
import socket
import sys

import uvicorn

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))


def _port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        check_host = "127.0.0.1" if host == "0.0.0.0" else host
        return s.connect_ex((check_host, port)) != 0


if __name__ == "__main__":
    if not _port_free(HOST, PORT):
        sys.exit(
            f"\n[ASTRAEA] Port {PORT} is already in use - another backend (or app) is running there.\n"
            f"  Stop it, or use another port:  PORT=8001 python run.py   (then set NEXT_PUBLIC_API_URL=http://localhost:8001 in frontend/.env.local)\n"
        )
    print(f"[ASTRAEA] Loading catalogs + training the vetting model... API will be at http://{HOST}:{PORT}/api/v1  (docs: /docs)")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)
