from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.weather_data import WeatherData
from app.schemas.weather_data import (
    WeatherDataCreate,
    WeatherDataResponse
)

router = APIRouter(
    prefix="/weather-data",
    tags=["Weather Data"]
)


@router.post("/", response_model=WeatherDataResponse)
def create_weather_data(
    data: WeatherDataCreate,
    db: Session = Depends(get_db)
):
    new_data = WeatherData(
        location=data.location,
        temperature=data.temperature,
        rainfall=data.rainfall,
        humidity=data.humidity,
        recorded_date=data.recorded_date
    )

    db.add(new_data)
    db.commit()
    db.refresh(new_data)

    return new_data


@router.get("/")
def get_weather_data(
    db: Session = Depends(get_db)
):
    return db.query(WeatherData).all()