from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
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
    password: Optional[str] = Field(default=None, min_length=6, max_length=255)


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
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


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
        role=(payload.role or "farmer").strip() or "farmer",
        created_at=datetime.utcnow(),
    )

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

    if payload.password is not None:
        current_user.password = hash_password(payload.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return serialize_user(current_user)
