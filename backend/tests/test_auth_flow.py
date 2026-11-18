import os
from datetime import date

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
from app.models.price_prediction import PricePrediction
from app.models.agricultural_data import AgriculturalData
from app.models.crop import Crop
from app.models.weather_data import WeatherData
from app.models.user import User
from app.models.yield_prediction import YieldPrediction
from app.main import app
from app.routes.crops import _get_dataset_crop_names

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
    updated = client.put(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "new-farmer@example.com"},
    )
    assert updated.status_code == 200, updated.text
    still_authenticated = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert still_authenticated.status_code == 200, still_authenticated.text
    assert still_authenticated.json()["email"] == "new-farmer@example.com"


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
    admin_user = admin_response.json()["user"]
    assert admin_user["role"] == "farmer"
    db = database.SessionLocal()
    try:
        db.query(User).filter(User.user_id == admin_user["user_id"]).update(
            {User.role: "admin"}
        )
        db.commit()
    finally:
        db.close()
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


def test_password_reset_and_email_verification_flow(monkeypatch):
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

    issued_tokens = []
    monkeypatch.setattr(
        "app.routes.auth._password_reset_email_settings",
        lambda: ("smtp.example.com", 587, "noreply@example.com", "", "", "http://localhost:5173", True),
    )
    monkeypatch.setattr(
        "app.routes.auth.send_password_reset_email",
        lambda email, reset_token, settings: issued_tokens.append(reset_token),
    )
    reset_response = client.post(
        "/auth/request-password-reset",
        json={"email": "reset@example.com"},
    )
    assert reset_response.status_code == 200, reset_response.text
    assert "reset_token" not in reset_response.json()
    assert len(issued_tokens) == 1

    password_reset = client.post(
        "/auth/reset-password",
        json={
            "token": issued_tokens[0],
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


def test_region_roles_and_admin_assignment():
    admin_response = client.post(
        "/auth/register",
        json={
            "name": "Region Admin",
            "email": "region-admin@example.com",
            "password": "adminpass123",
        },
    )
    admin_user_id = admin_response.json()["user"]["user_id"]
    admin_db = database.SessionLocal()
    try:
        admin_db.query(User).filter(User.user_id == admin_user_id).update(
            {User.role: "admin"}
        )
        admin_db.commit()
    finally:
        admin_db.close()

    farmer_response = client.post(
        "/auth/register",
        json={
            "name": "Regional Farmer",
            "email": "regional-farmer@example.com",
            "password": "farmerpass123",
        },
    )
    farmer_user = farmer_response.json()["user"]
    admin_headers = {
        "Authorization": f"Bearer {admin_response.json()['access_token']}"
    }

    assignment = client.put(
        f"/auth/users/{farmer_user['user_id']}/role",
        headers=admin_headers,
        json={"role": "regional_admin", "region": "Mysuru"},
    )
    assert assignment.status_code == 200, assignment.text
    regional_headers = {
        "Authorization": f"Bearer {farmer_response.json()['access_token']}"
    }
    farmer_assignment = client.put(
        f"/auth/users/{farmer_user['user_id']}/role",
        headers=regional_headers,
        json={"role": "admin"},
    )
    assert farmer_assignment.status_code == 403

    same_region = client.post(
        "/auth/register",
        json={
            "name": "Mysuru Farmer",
            "email": "mysuru-farmer@example.com",
            "password": "farmerpass123",
            "region": "Mysuru",
        },
    )
    regional_users = client.get(
        "/auth/region/users",
        headers=regional_headers,
    )
    assert regional_users.status_code == 200, regional_users.text
    assert [user["email"] for user in regional_users.json()] == [
        "mysuru-farmer@example.com"
    ]
    forbidden_region_change = client.put(
        "/auth/me",
        headers=regional_headers,
        json={"region": "Bengaluru"},
    )
    assert forbidden_region_change.status_code == 403


def test_crop_history_and_prediction_history_are_private():
    first = client.post(
        "/auth/register",
        json={
            "name": "History Owner",
            "email": "history-owner@example.com",
            "password": "farmerpass123",
        },
    ).json()
    second = client.post(
        "/auth/register",
        json={
            "name": "History Guest",
            "email": "history-guest@example.com",
            "password": "farmerpass123",
        },
    ).json()
    first_headers = {"Authorization": f"Bearer {first['access_token']}"}
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}
    assert client.get("/yield-prediction/").status_code == 401
    assert client.get("/price-prediction/").status_code == 401
    assert client.get("/crop-recommendation/").status_code == 401

    crop_history = client.post(
        "/crop-history/",
        headers=first_headers,
        json={
            "crop_name": "Rice",
            "season": "Kharif",
            "district": "Mysuru",
            "planted_date": "2026-06-01",
            "area_acres": 2.5,
        },
    )
    assert crop_history.status_code == 201, crop_history.text
    assert len(client.get("/crop-history/", headers=first_headers).json()) == 1
    assert client.get("/crop-history/", headers=second_headers).json() == []
    foreign_delete = client.delete(
        f"/crop-history/{crop_history.json()['history_id']}",
        headers=second_headers,
    )
    assert foreign_delete.status_code == 404

    db = database.SessionLocal()
    try:
        first_id = first["user"]["user_id"]
        second_id = second["user"]["user_id"]
        db.add_all(
            [
                YieldPrediction(user_id=first_id, predicted_yield=10),
                YieldPrediction(user_id=second_id, predicted_yield=20),
                PricePrediction(user_id=first_id, forecast_price=100),
                PricePrediction(user_id=second_id, forecast_price=200),
            ]
        )
        db.commit()
    finally:
        db.close()

    yield_history = client.get("/yield-prediction/", headers=first_headers)
    price_history = client.get("/price-prediction/", headers=first_headers)
    assert yield_history.status_code == 200, yield_history.text
    assert [float(item["predicted_yield"]) for item in yield_history.json()] == [10]
    assert price_history.status_code == 200, price_history.text
    assert [float(item["forecast_price"]) for item in price_history.json()] == [100]


def test_farm_profiles_are_private_and_support_crud():
    first_user_response = client.post(
        "/auth/register",
        json={
            "name": "Farm Owner One",
            "email": "farm-owner-one@example.com",
            "password": "farmerpass123",
        },
    )
    second_user_response = client.post(
        "/auth/register",
        json={
            "name": "Farm Owner Two",
            "email": "farm-owner-two@example.com",
            "password": "farmerpass123",
        },
    )
    first_user_token = first_user_response.json()["access_token"]
    second_user_token = second_user_response.json()["access_token"]
    first_user_headers = {"Authorization": f"Bearer {first_user_token}"}
    second_user_headers = {"Authorization": f"Bearer {second_user_token}"}

    create_response = client.post(
        "/farms/",
        headers=first_user_headers,
        json={
            "farm_name": "North Field",
            "district": "Dakshina Kannada",
            "area_acres": 2.5,
            "soil_type": "Red soil",
            "irrigation_type": "Drip",
            "primary_crop": "Arecanut",
            "season": "Kharif",
        },
    )
    assert create_response.status_code == 201, create_response.text
    farm = create_response.json()
    assert farm["district"] == "Dakshina Kannada"
    assert farm["area_acres"] == 2.5

    first_user_farms = client.get("/farms/", headers=first_user_headers)
    assert first_user_farms.status_code == 200, first_user_farms.text
    assert [item["farm_id"] for item in first_user_farms.json()] == [
        farm["farm_id"]
    ]

    second_user_farms = client.get("/farms/", headers=second_user_headers)
    assert second_user_farms.status_code == 200, second_user_farms.text
    assert second_user_farms.json() == []

    forbidden_update = client.put(
        f"/farms/{farm['farm_id']}",
        headers=second_user_headers,
        json={"farm_name": "Changed Farm"},
    )
    assert forbidden_update.status_code == 404, forbidden_update.text

    update_response = client.put(
        f"/farms/{farm['farm_id']}",
        headers=first_user_headers,
        json={"farm_name": "South Field", "area_acres": 3.25},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["farm_name"] == "South Field"
    assert update_response.json()["area_acres"] == 3.25

    delete_response = client.delete(
        f"/farms/{farm['farm_id']}",
        headers=first_user_headers,
    )
    assert delete_response.status_code == 204, delete_response.text
    assert client.get("/farms/", headers=first_user_headers).json() == []


def test_farm_profiles_require_auth_and_supported_district():
    unauthenticated = client.get("/farms/")
    assert unauthenticated.status_code == 401

    register_response = client.post(
        "/auth/register",
        json={
            "name": "District Test",
            "email": "district-test@example.com",
            "password": "farmerpass123",
        },
    )
    headers = {
        "Authorization": f"Bearer {register_response.json()['access_token']}"
    }

    invalid_district = client.post(
        "/farms/",
        headers=headers,
        json={
            "farm_name": "Invalid District Farm",
            "district": "Not a Karnataka district",
            "area_acres": 1,
        },
    )
    assert invalid_district.status_code == 422, invalid_district.text


def test_crop_recommendations_use_only_the_current_users_forecasts(monkeypatch):
    farmer = client.post(
        "/auth/register",
        json={
            "name": "Recommendation Farmer",
            "email": "recommendation-farmer@example.com",
            "password": "farmerpass123",
        },
    ).json()
    other_farmer = client.post(
        "/auth/register",
        json={
            "name": "Other Recommendation Farmer",
            "email": "other-recommendation-farmer@example.com",
            "password": "farmerpass123",
        },
    ).json()
    headers = {"Authorization": f"Bearer {farmer['access_token']}"}

    db = database.SessionLocal()
    try:
        crop = Crop(crop_name="Rice", season="Kharif")
        db.add(crop)
        db.flush()
        agricultural = AgriculturalData(
            state="Karnataka",
            district="MYSORE",
            season="Kharif",
            crop_id=crop.crop_id,
            cultivated_area=2,
            crop_year="2001-02",
        )
        db.add_all(
            [
                agricultural,
                WeatherData(
                    location="MYSORE",
                    temperature=25,
                    rainfall=10,
                    humidity=70,
                    recorded_date=date.today(),
                ),
                PricePrediction(
                    user_id=other_farmer["user"]["user_id"],
                    crop_id=crop.crop_id,
                    forecast_price=5000,
                    forecast_date=date.today(),
                ),
            ]
        )
        db.commit()
        agricultural_id = agricultural.agricultural_id
        crop_id = crop.crop_id
    finally:
        db.close()

    monkeypatch.setattr(
        "app.routes.crop_recommendation.predict_yield",
        lambda **kwargs: 2.5,
    )
    response = client.post(
        f"/crop-recommendation/recommend?agricultural_id={agricultural_id}",
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["recommendation_basis"] == "yield_only"
    assert response.json()["recommendations"][0]["forecast_price"] is None

    db = database.SessionLocal()
    try:
        db.add(
            PricePrediction(
                user_id=farmer["user"]["user_id"],
                crop_id=crop_id,
                forecast_price=4200,
                forecast_date=date.today(),
            )
        )
        db.commit()
    finally:
        db.close()

    personalized_response = client.post(
        f"/crop-recommendation/recommend?agricultural_id={agricultural_id}",
        headers=headers,
    )
    assert personalized_response.status_code == 200, personalized_response.text
    assert (
        personalized_response.json()["recommendation_basis"]
        == "yield_and_forecast_price"
    )
    assert personalized_response.json()["recommendations"][0]["forecast_price"] == 4200


def test_crop_catalog_includes_all_karnataka_yield_dataset_crops():
    expected_crops = set(_get_dataset_crop_names())
    response = client.get("/crops/")

    assert response.status_code == 200, response.text
    actual_crops = {crop["crop_name"] for crop in response.json()}
    assert actual_crops == expected_crops
    assert len(expected_crops) == 43
