from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User, UserSession
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserOut
from app.security import (
    generate_token,
    get_current_session,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["auth"])

EMAIL_TAKEN = "An account with this email already exists."
BAD_CREDENTIALS = "Incorrect email or password."


async def _issue_session(user: User, db: AsyncSession) -> str:
    session = UserSession(token=generate_token(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session.token


def _response(token: str, user: User) -> AuthResponse:
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/signup", response_model=AuthResponse)
async def signup(
    payload: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)

    # PBKDF2 at production iteration counts takes ~0.3s — run it in the
    # threadpool so the event loop stays free.
    iterations = request.app.state.settings.pbkdf2_iterations
    password_hash = await to_thread.run_sync(
        hash_password, payload.password, iterations
    )
    user = User(email=payload.email, name=payload.name, password_hash=password_hash)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Lost a concurrent race creating the same email (unique constraint);
        # unlike the PL-5 stub, the loser now surfaces the conflict.
        await db.rollback()
        raise HTTPException(status_code=409, detail=EMAIL_TAKEN)
    await db.refresh(user)
    return _response(await _issue_session(user, db), user)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    # Same 401 for unknown email and wrong password: don't reveal which.
    if user is None:
        raise HTTPException(status_code=401, detail=BAD_CREDENTIALS)
    valid = await to_thread.run_sync(
        verify_password, payload.password, user.password_hash
    )
    if not valid:
        raise HTTPException(status_code=401, detail=BAD_CREDENTIALS)
    return _response(await _issue_session(user, db), user)


@router.post("/signout", status_code=204)
async def signout(
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.delete(session)
    await db.commit()
    return Response(status_code=204)
