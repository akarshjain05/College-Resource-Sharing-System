import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models.enums import UserRole


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = Field(None, ge=1, le=6)
    student_id: Optional[str] = None
    phone_number: Optional[str] = None


class UserRegister(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRole
    bio: Optional[str] = None
    skills: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    trust_score: int
    sharing_score: int
    created_at: datetime


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
