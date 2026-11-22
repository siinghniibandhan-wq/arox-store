from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    @field_validator("password")
    @classmethod
    def password_has_variety(cls, value: str) -> str:
        if not any(c.islower() for c in value) or not any(c.isupper() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must contain upper-case, lower-case and numeric characters")
        return value
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=8, max_length=3000)
class ReviewPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    app_id: str
    rating: int
    title: str
    body: str
    created_at: datetime
class ReviewList(BaseModel):
    items: list[ReviewPublic]
    average_rating: float | None
    review_count: int
