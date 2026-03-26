"""FastAPI application factory for the Enheritage NLP / NER Service."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import entities, health
from app.worker.SQSWorker import SQSWorker

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_worker: SQSWorker | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start the SQS NER worker on startup; stop it on shutdown."""
    global _worker  # noqa: PLW0603
    logger.info("NLP/NER service starting up…")
    _worker = SQSWorker()
    _worker.start()

    yield

    logger.info("NLP/NER service shutting down…")
    if _worker is not None:
        _worker.stop()


def create_app() -> FastAPI:
    application = FastAPI(
        title="Enheritage NLP/NER Service",
        description="Extracts named entities from transcripts using spaCy.",
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
    application.include_router(entities.router)

    return application


app = create_app()
