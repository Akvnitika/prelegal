from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.db import init_db
from app.routers import auth, chat, doc_chat, documents, health


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine, session_factory = await init_db(settings.database_path)
        app.state.engine = engine
        app.state.session_factory = session_factory
        yield
        await engine.dispose()

    app = FastAPI(title="Prelegal API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings

    # Cross-origin requests only happen in local development, where
    # `next dev` runs on :3000 against this backend on :8003. In Docker the
    # frontend is served same-origin by the static mount below.
    if settings.environment == "development":
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api/auth")
    app.include_router(chat.router, prefix="/api")
    app.include_router(documents.router, prefix="/api")
    app.include_router(doc_chat.router, prefix="/api")

    # The static mount must be registered after every API router: a mount at
    # "/" matches all paths, so anything registered later is unreachable.
    static_dir = Path(settings.static_dir)
    if static_dir.is_dir():
        app.mount(
            "/", StaticFiles(directory=static_dir, html=True), name="frontend"
        )

    return app


app = create_app()
