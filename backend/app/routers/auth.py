from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.user import User
from app.schemas.auth import AuthRequest, AuthResponse, UserOut

router = APIRouter(tags=["auth"])


async def _find_or_create(payload: AuthRequest, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    user = User(email=payload.email, name=payload.name, password=payload.password)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# PL-5 ships a fake login: both endpoints find-or-create by email and the
# password is accepted but never checked. Real auth later keeps these paths
# and this response shape, adding 401/409 failures and a session/token.


@router.post("/signup", response_model=AuthResponse)
async def signup(
    payload: AuthRequest, db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    return AuthResponse(user=UserOut.model_validate(await _find_or_create(payload, db)))


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: AuthRequest, db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    return AuthResponse(user=UserOut.model_validate(await _find_or_create(payload, db)))
