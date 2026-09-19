"""Password hashing and bearer-token auth (PL-8). Stdlib only.

Hash format: "pbkdf2_sha256$<iterations>$<salt_hex>$<digest_hex>". The
iteration count lives in the hash itself, so changing the setting never
breaks existing rows (moot with a wipe-on-boot DB, but cheap correctness).
"""

import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User, UserSession

HASH_SCHEME = "pbkdf2_sha256"


def hash_password(password: str, iterations: int) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), iterations
    )
    return f"{HASH_SCHEME}${iterations}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt, expected = stored.split("$")
        if scheme != HASH_SCHEME:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest.hex(), expected)


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.removeprefix("Bearer ").strip()
    return ""


_NOT_SIGNED_IN = HTTPException(
    status_code=401,
    detail="Not signed in.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_session(
    request: Request, db: AsyncSession = Depends(get_db)
) -> UserSession:
    token = _bearer_token(request)
    if not token:
        raise _NOT_SIGNED_IN
    result = await db.execute(
        select(UserSession).where(UserSession.token == token)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise _NOT_SIGNED_IN
    return session


async def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, session.user_id)
    if user is None:
        raise _NOT_SIGNED_IN
    return user
