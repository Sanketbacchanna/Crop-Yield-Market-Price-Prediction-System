from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    generate_secure_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=6, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=15)
    role: Optional[str] = Field(default="farmer", max_length=30)


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=6, max_length=255)


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)
    email: Optional[str] = Field(default=None, min_length=3, max_length=150)
    password: Optional[str] = Field(default=None, min_length=6, max_length=255)


class PasswordResetRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=255)
    new_password: str = Field(..., min_length=6, max_length=255)


class EmailVerificationRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=255)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def serialize_user(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_email_verified": bool(user.is_email_verified),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def create_verification_token(user: User) -> str:
    token = generate_secure_token()
    user.email_verification_token = token
    user.email_verification_expires_at = datetime.utcnow() + timedelta(hours=24)
    return token


@router.post("/register", response_model=AuthTokenResponse)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    existing_user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    role = (payload.role or "farmer").strip() or "farmer"
    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password=hash_password(payload.password),
        phone=payload.phone.strip() if payload.phone else None,
        role=role,
        created_at=datetime.utcnow(),
        is_email_verified=False,
    )
    create_verification_token(user)

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/login", response_model=AuthTokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@router.put("/me")
def update_current_user_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()

    if payload.phone is not None:
        current_user.phone = payload.phone.strip() or None

    if payload.email is not None:
        normalized_email = payload.email.strip().lower()
        if normalized_email != current_user.email:
            existing = db.query(User).filter(User.email.ilike(normalized_email)).first()
            if existing and existing.user_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already in use by another account.",
                )
            current_user.email = normalized_email
            current_user.is_email_verified = False
            create_verification_token(current_user)

    if payload.password is not None:
        current_user.password = hash_password(payload.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return serialize_user(current_user)


@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if not user:
        return {"message": "If an account exists, a password reset link was generated."}

    reset_token = generate_secure_token()
    user.password_reset_token = reset_token
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=2)
    db.add(user)
    db.commit()

    return {
        "message": "If an account exists, a password reset link was generated.",
        "reset_token": reset_token,
    }


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    if user.password_reset_expires_at is None or user.password_reset_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user.password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.add(user)
    db.commit()

    return {"message": "Password reset successful."}


@router.post("/request-email-verification")
def request_email_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = create_verification_token(current_user)
    db.add(current_user)
    db.commit()
    return {
        "message": "A verification token was generated for your email.",
        "verification_token": token,
    }


@router.post("/verify-email")
def verify_email(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token.",
        )

    if user.email_verification_expires_at is None or user.email_verification_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired.",
        )

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.add(user)
    db.commit()

    return {"message": "Email verified successfully."}


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.user_id.asc()).all()
    return [serialize_user(user) for user in users]
