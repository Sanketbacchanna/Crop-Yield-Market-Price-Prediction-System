from pydantic import BaseModel
from pydantic import Field
from typing import Optional
from datetime import date


class WeatherDataCreate(BaseModel):
    location: Optional[str] = Field(default=None, max_length=45)
    temperature: Optional[float] = Field(
        default=None,
        ge=-100,
        le=100,
        allow_inf_nan=False,
    )
    rainfall: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    humidity: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        allow_inf_nan=False,
    )
    recorded_date: Optional[date] = None


class WeatherDataResponse(WeatherDataCreate):
    weather_id: int

    class Config:
        from_attributes = True