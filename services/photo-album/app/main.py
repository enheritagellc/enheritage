"""Enheritage Photo Album Service."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import albums, health, photos


def create_app() -> FastAPI:
    application = FastAPI(
        title="Enheritage Photo Album Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(albums.router)
    application.include_router(photos.router)

    return application


app = create_app()
