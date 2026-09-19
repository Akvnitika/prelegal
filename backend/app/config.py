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
    # litellm reads OPENROUTER_API_KEY from the environment itself; this field
    # mirrors it so the chat endpoint can fail fast with a clear error when
    # the key is absent instead of surfacing a provider auth failure.
    openrouter_api_key: str = ""
    # PBKDF2-HMAC-SHA256 work factor. Tests dial this down (hashing runs on
    # every signup fixture); production keeps the OWASP-recommended default.
    pbkdf2_iterations: int = 600_000

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
