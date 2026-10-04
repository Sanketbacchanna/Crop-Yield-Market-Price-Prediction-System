from pydantic import BaseModel
from typing import Optional
from datetime import date


class WeatherDataCreate(BaseModel):
    location: Optional[str] = None
    temperature: Optional[float] = None
    rainfall: Optional[float] = None
    humidity: Optional[float] = None
    recorded_date: Optional[date] = None


class WeatherDataResponse(WeatherDataCreate):
    weather_id: int

    class Config:
        from_attributes = True