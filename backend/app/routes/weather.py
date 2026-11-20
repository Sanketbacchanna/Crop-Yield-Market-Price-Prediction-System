from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.weather_data import WeatherData
from app.services.weather_service import (
    WeatherProviderError,
    get_current_weather,
    get_weather_outlook,
)


router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current")
def current_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    db: Session = Depends(get_db),
):
    try:
        current = get_current_weather(latitude, longitude)
    except WeatherProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    recorded_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    location = (
        str(current.get("location") or "Current location")
        if current.get("source") == "IMD"
        else f"{latitude:.4f},{longitude:.4f}"
    )[:45]
    saved_weather = (
        db.query(WeatherData)
        .filter(
            WeatherData.location == location,
            WeatherData.recorded_date == recorded_date,
        )
        .first()
    )
    if saved_weather is None:
        saved_weather = WeatherData(location=location, recorded_date=recorded_date)
        db.add(saved_weather)

    saved_weather.temperature = current.get("temperature")
    saved_weather.rainfall = current.get("rainfall")
    saved_weather.humidity = current.get("humidity")
    db.commit()

    return current


@router.get("/outlook")
def weather_outlook(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    district: str | None = Query(default=None, max_length=100),
):
    try:
        return get_weather_outlook(latitude, longitude, district)
    except WeatherProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
