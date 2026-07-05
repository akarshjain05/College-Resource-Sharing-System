import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppException, ConflictException
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.models.enums import AuthProvider, UserRole
from app.schemas.token import Token, RefreshRequest
from app.schemas.user import (
    UserRegister,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePassword,
    GoogleAuthRequest,
)
from app.services.email_service import send_verification_email, send_password_reset_email
from app.core.rate_limit import limiter
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise ConflictException("An account with this email already exists")

    if payload.student_id:
        existing_sid = db.query(User).filter(User.student_id == payload.student_id).first()
        if existing_sid:
            raise ConflictException("This student ID is already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        course=payload.course,
        year_of_study=payload.year_of_study,
        student_id=payload.student_id,
        phone_number=payload.phone_number,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_token = create_access_token(str(user.id), {"purpose": "email_verification"})
    verify_link = f"http://localhost:5173/verify-email?token={verify_token}"
    background_tasks.add_task(send_verification_email, user.email, user.full_name, verify_link)

    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if user and not user.hashed_password:
        raise AppException(
            "This account signs in with Google. Use the 'Continue with Google' button instead.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="GOOGLE_ACCOUNT_NO_PASSWORD",
        )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise AppException("Incorrect email or password", status_code=status.HTTP_401_UNAUTHORIZED, error_code="BAD_CREDENTIALS")
    if not user.is_active or user.is_suspended:
        raise AppException("Account is inactive or suspended", status_code=status.HTTP_403_FORBIDDEN, error_code="ACCOUNT_DISABLED")

    access_token = create_access_token(str(user.id), {"role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/google", response_model=Token)
def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise AppException(
            "Google Sign-In is not configured on this server (missing GOOGLE_CLIENT_ID).",
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            error_code="GOOGLE_NOT_CONFIGURED",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise AppException(
            "Invalid or expired Google credential.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="BAD_GOOGLE_TOKEN",
        )

    email = idinfo.get("email")
    google_sub = idinfo.get("sub")
    if not email or not google_sub:
        raise AppException(
            "Google did not return the expected account information.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INCOMPLETE_GOOGLE_PROFILE",
        )

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        # Brand new account — created straight from the verified Google profile,
        # with no local password at all.
        full_name = idinfo.get("name") or email.split("@")[0]
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=None,
            role=UserRole.STUDENT,
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_sub,
            profile_picture_url=idinfo.get("picture"),
            is_verified=True,  # Google has already verified this email address.
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_id:
        # Existing local-password account signing in with Google for the first time —
        # link the two rather than creating a duplicate account for the same email.
        user.google_id = google_sub
        if not user.profile_picture_url and idinfo.get("picture"):
            user.profile_picture_url = idinfo["picture"]
        db.commit()
        db.refresh(user)

    if not user.is_active or user.is_suspended:
        raise AppException("Account is inactive or suspended", status_code=status.HTTP_403_FORBIDDEN, error_code="ACCOUNT_DISABLED")

    access_token = create_access_token(str(user.id), {"role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise AppException("Invalid or expired refresh token", status_code=status.HTTP_401_UNAUTHORIZED, error_code="BAD_REFRESH_TOKEN")

    user = db.query(User).filter(User.id == uuid.UUID(data["sub"])).first()
    if not user:
        raise AppException("User no longer exists", status_code=status.HTTP_401_UNAUTHORIZED, error_code="USER_NOT_FOUND")

    access_token = create_access_token(str(user.id), {"role": user.role.value})
    new_refresh_token = create_refresh_token(str(user.id))
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-email", response_model=UserResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    data = decode_token(token)
    if not data or data.get("purpose") != "email_verification":
        raise AppException("Invalid or expired verification link", status_code=status.HTTP_400_BAD_REQUEST, error_code="BAD_VERIFY_TOKEN")
    user = db.query(User).filter(User.id == uuid.UUID(data["sub"])).first()
    if not user:
        raise AppException("User not found", status_code=status.HTTP_404_NOT_FOUND, error_code="USER_NOT_FOUND")
    user.is_verified = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.hashed_password:
        raise AppException(
            "This account signs in with Google and has no password to change.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="GOOGLE_ACCOUNT_NO_PASSWORD",
        )
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise AppException("Current password is incorrect", status_code=status.HTTP_400_BAD_REQUEST, error_code="BAD_PASSWORD")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return None


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(payload: PasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        reset_token = create_access_token(str(user.id), {"purpose": "password_reset"})
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
        background_tasks.add_task(send_password_reset_email, user.email, user.full_name, reset_link)
    # Always return 202 regardless of whether the email exists, to avoid user enumeration.
    return {"detail": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    data = decode_token(payload.token)
    if not data or data.get("purpose") != "password_reset":
        raise AppException("Invalid or expired reset token", status_code=status.HTTP_400_BAD_REQUEST, error_code="BAD_RESET_TOKEN")
    user = db.query(User).filter(User.id == uuid.UUID(data["sub"])).first()
    if not user:
        raise AppException("User not found", status_code=status.HTTP_404_NOT_FOUND, error_code="USER_NOT_FOUND")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return None
