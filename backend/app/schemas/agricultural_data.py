from pydantic import BaseModel
from typing import Optional


class AgriculturalDataCreate(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    season: Optional[str] = None
    crop_id: Optional[int] = None
    cultivated_area: Optional[float] = None
    soil_type: Optional[str] = None


class AgriculturalDataResponse(AgriculturalDataCreate):
    agricultural_id: int

    class Config:
        from_attributes = True