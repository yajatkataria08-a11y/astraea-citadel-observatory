from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import state
from .config import API_PREFIX, CORS_ORIGINS, CORS_ORIGIN_REGEX
from .routers.api import router
from .routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.init()       # loads parquet, trains the vetting model (a few seconds), opens the SQLite triage DB
    yield


app = FastAPI(title="ASTRAEA backend", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else [],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {"service": "ASTRAEA backend", "docs": "/docs", "health": f"{API_PREFIX}/health"}
