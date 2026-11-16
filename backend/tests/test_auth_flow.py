import os

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "120")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as database
from app.database import Base
from app.main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
database.engine = engine
database.SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[database.get_db] = override_get_db
client = TestClient(app)


def test_register_and_login_user():
    response = client.post(
        "/auth/register",
        json={
            "name": "Test Farmer",
            "email": "farmer@example.com",
            "password": "secret123",
            "phone": "9876543210",
            "role": "farmer",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["user"]["email"] == "farmer@example.com"
    assert payload["user"]["role"] == "farmer"

    login_response = client.post(
        "/auth/login",
        json={
            "email": "farmer@example.com",
            "password": "secret123",
        },
    )

    assert login_response.status_code == 200, login_response.text
    token = login_response.json()["access_token"]
    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["email"] == "farmer@example.com"


def test_admin_access_and_role_enforcement():
    admin_response = client.post(
        "/auth/register",
        json={
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "adminpass123",
            "phone": "1111111111",
            "role": "admin",
        },
    )
    admin_token = admin_response.json()["access_token"]

    farmer_response = client.post(
        "/auth/register",
        json={
            "name": "Other Farmer",
            "email": "other@example.com",
            "password": "farmerpass123",
            "phone": "2222222222",
            "role": "farmer",
        },
    )
    farmer_token = farmer_response.json()["access_token"]

    protected_admin = client.get(
        "/auth/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert protected_admin.status_code == 200, protected_admin.text
    assert any(user["email"] == "admin@example.com" for user in protected_admin.json())

    forbidden_response = client.get(
        "/auth/users",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert forbidden_response.status_code == 403, forbidden_response.text


def test_password_reset_and_email_verification_flow():
    response = client.post(
        "/auth/register",
        json={
            "name": "Reset User",
            "email": "reset@example.com",
            "password": "resetpass123",
            "phone": "3333333333",
            "role": "farmer",
        },
    )
    token = response.json()["access_token"]

    reset_response = client.post(
        "/auth/request-password-reset",
        json={"email": "reset@example.com"},
    )
    assert reset_response.status_code == 200, reset_response.text
    reset_token = reset_response.json()["reset_token"]

    password_reset = client.post(
        "/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "new-password-456",
        },
    )
    assert password_reset.status_code == 200, password_reset.text

    login_response = client.post(
        "/auth/login",
        json={
            "email": "reset@example.com",
            "password": "new-password-456",
        },
    )
    assert login_response.status_code == 200, login_response.text

    verify_request = client.post(
        "/auth/request-email-verification",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert verify_request.status_code == 200, verify_request.text
    verification_token = verify_request.json()["verification_token"]

    verification_response = client.post(
        "/auth/verify-email",
        json={"token": verification_token},
    )
    assert verification_response.status_code == 200, verification_response.text
