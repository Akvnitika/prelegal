from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Process configuration, read from environment variables.

    This class does not parse .env itself: in Docker the defaults are baked
    into the image and secrets arrive via `docker run --env-file .env`; for
    local development use `uv run --env-file ../.env fastapi dev app/main.py`.
    """

    database_path: str = "data/prelegal.db"
    static_dir: str = "static"
    environment: str = "production"
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
