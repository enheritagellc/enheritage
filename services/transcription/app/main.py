"""FastAPI application factory for the Enheritage Transcription Service."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, transcriptions
from app.worker.SQSWorker import SQSWorker

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_worker: SQSWorker | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage the SQSWorker lifecycle alongside the FastAPI process."""
    global _worker  # noqa: PLW0603
    logger.info("Transcription service starting up…")
    _worker = SQSWorker()
    _worker.start()

    yield  # Application runs here

    logger.info("Transcription service shutting down…")
    if _worker is not None:
        _worker.stop()


def create_app() -> FastAPI:
    application = FastAPI(
        title="Enheritage Transcription Service",
        description="Transcribes audio using Whisper and produces structured transcripts.",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(transcriptions.router)

    return application


app = create_app()
