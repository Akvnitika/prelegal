from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """All ORM models register their table on this metadata (see models/__init__.py)."""


async def init_db(
    database_path: str,
) -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    """Delete any existing SQLite file and rebuild the schema from the current
    models. Called once per process from the application lifespan, so the
    database starts from scratch on every boot."""
    from app import models  # noqa: F401  (registers tables on Base.metadata)

    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)

    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    session_factory = request.app.state.session_factory
    async with session_factory() as session:
        yield session
