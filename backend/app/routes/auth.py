import hashlib
import os
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Optional
from urllib.parse import quote

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
    region: Optional[str] = Field(default=None, max_length=100)


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=6, max_length=255)


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)
    email: Optional[str] = Field(default=None, min_length=3, max_length=150)
    password: Optional[str] = Field(default=None, min_length=6, max_length=255)
    region: Optional[str] = Field(default=None, max_length=100)


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., min_length=1, max_length=30)
    region: Optional[str] = Field(default=None, max_length=100)


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
        "region": user.region,
        "is_email_verified": bool(user.is_email_verified),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def create_verification_token(user: User) -> str:
    token = generate_secure_token()
    user.email_verification_token = token
    user.email_verification_expires_at = datetime.utcnow() + timedelta(hours=24)
    return token


def _password_reset_email_settings():
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()
    if not host or not sender:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email is not configured. Contact the administrator.",
        )

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email is not configured correctly.",
        ) from error
    if not 1 <= port <= 65535:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email is not configured correctly.",
        )

    return (
        host,
        port,
        sender,
        os.getenv("SMTP_USER", "").strip(),
        os.getenv("SMTP_PASSWORD", ""),
        os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/"),
        os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true",
    )


def send_password_reset_email(email: str, token: str, settings) -> None:
    host, port, sender, username, password, frontend_url, use_tls = settings
    reset_url = f"{frontend_url}/?reset_token={quote(token)}"
    message = EmailMessage()
    message["Subject"] = "Reset your AgriPredict password"
    message["From"] = sender
    message["To"] = email
    message.set_content(
        "A password reset was requested for your AgriPredict account.\n\n"
        f"Reset your password using this link (valid for 2 hours):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        if use_tls:
            smtp.starttls()
        if username:
            smtp.login(username, password)
        smtp.send_message(message)


@router.post("/register", response_model=AuthTokenResponse)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    existing_user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password=hash_password(payload.password),
        phone=payload.phone.strip() if payload.phone else None,
        role="farmer",
        region=payload.region.strip() if payload.region else None,
        created_at=datetime.utcnow(),
        is_email_verified=False,
    )
    create_verification_token(user)

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.email, user.user_id)

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

    access_token = create_access_token(user.email, user.user_id)

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

    if payload.region is not None:
        requested_region = payload.region.strip() or None
        current_region = current_user.region.strip() if current_user.region else None
        if (
            (current_user.role or "farmer").strip().lower() != "farmer"
            and requested_region != current_region
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change an assigned staff region.",
            )
        if (current_user.role or "farmer").strip().lower() == "farmer":
            current_user.region = requested_region

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return serialize_user(current_user)


@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    mail_settings = _password_reset_email_settings()
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if not user:
        return {"message": "If an account exists, a password reset link was sent."}

    reset_token = generate_secure_token()
    user.password_reset_token = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=2)
    db.add(user)
    db.commit()

    try:
        send_password_reset_email(user.email, reset_token, mail_settings)
    except (OSError, smtplib.SMTPException) as error:
        user.password_reset_token = None
        user.password_reset_expires_at = None
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send the password reset email. Please try again later.",
        ) from error

    return {"message": "If an account exists, a password reset link was sent."}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    reset_token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    user = db.query(User).filter(User.password_reset_token == reset_token_hash).first()
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


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    role = payload.role.strip().lower()
    if role not in {"farmer", "regional_admin", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role must be farmer, regional_admin, or admin.",
        )

    target_user = db.query(User).filter(User.user_id == user_id).first()
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.user_id == current_user.user_id and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own administrator role.",
        )

    if (target_user.role or "farmer").strip().lower() == "admin" and role != "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The last administrator cannot be demoted.",
            )

    if role == "regional_admin" and not (payload.region or target_user.region):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A region is required for regional administrators.",
        )

    target_user.role = role
    if payload.region is not None:
        target_user.region = payload.region.strip() or None

    db.add(target_user)
    db.commit()
    db.refresh(target_user)
    return serialize_user(target_user)


@router.get("/region/users")
def list_region_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("regional_admin")),
):
    if not current_user.region:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account does not have an assigned region.",
        )

    users = (
        db.query(User)
        .filter(
            User.region == current_user.region,
            User.role == "farmer",
        )
        .order_by(User.user_id.asc())
        .all()
    )
    return [serialize_user(user) for user in users]
