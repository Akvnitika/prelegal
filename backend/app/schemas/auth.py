from pydantic import ConfigDict, EmailStr, Field

from app.schemas.camel import CamelModel


class SignupRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = None


class LoginRequest(CamelModel):
    email: EmailStr
    # No length rule here: a wrong short password is a 401, not a 422.
    password: str


class UserOut(CamelModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None


class AuthResponse(CamelModel):
    token: str
    user: UserOut
