from pydantic import BaseModel, ConfigDict, EmailStr


class AuthRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None


class AuthResponse(BaseModel):
    user: UserOut
