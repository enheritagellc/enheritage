"""Enheritage biography-gen service — FastAPI entrypoint."""
from __future__ import annotations

import logging

from fastapi import FastAPI

from app.config import settings
from app.routers import biography, health
from app.worker.SQSWorker import SQSWorker

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="enheritage-biography-gen", version="0.1.0")

_worker: SQSWorker | None = None


@app.on_event("startup")
async def _startup() -> None:
    global _worker
    _worker = SQSWorker()
    _worker.start()


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _worker:
        _worker.stop()


app.include_router(health.router)
app.include_router(biography.router, prefix="/biography")
