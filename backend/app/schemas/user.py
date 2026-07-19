import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

from app.models.enums import UserRole, AuthProvider


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
    confirm_password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("password and confirm_password do not match")
        return self


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="The ID token returned by Google Identity Services")


class GoogleAuthResponse(BaseModel):
    """
    Returned by POST /auth/google. Two shapes, distinguished by `status`:
    - status="login": an existing account was found (or just linked) -- access_token /
      refresh_token are populated, same as a normal login.
    - status="needs_profile": this is a brand-new signup. No account has been created
      yet. `registration_token` must be sent to /auth/google/complete-profile along
      with the additional fields (role, department, etc.) to actually create it.
    """

    status: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    registration_token: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None


class GoogleProfileCompletion(BaseModel):
    registration_token: str
    role: UserRole = UserRole.STUDENT
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = Field(None, ge=1, le=6)
    student_id: Optional[str] = None


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
    auth_provider: AuthProvider
    bio: Optional[str] = None
    skills: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    is_suspended: bool
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


class PublicUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    profile_picture_url: Optional[str] = None
    trust_score: int
    sharing_score: int
    created_at: datetime
    # We will let the router attach a list of public resources or history if needed,
    # or just keep it simple and return a separate field or let the frontend query resources by owner.