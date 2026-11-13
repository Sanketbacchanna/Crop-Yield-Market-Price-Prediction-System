from pydantic import BaseModel
from pydantic import Field
from typing import Optional


class AgriculturalDataCreate(BaseModel):
    state: Optional[str] = Field(default=None, max_length=105)
    district: Optional[str] = Field(default=None, max_length=45)
    season: Optional[str] = Field(default=None, max_length=45)
    crop_id: Optional[int] = Field(default=None, gt=0)
    cultivated_area: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    soil_type: Optional[str] = Field(default=None, max_length=100)
    crop_year: Optional[str] = Field(default=None, max_length=20)


class AgriculturalDataResponse(AgriculturalDataCreate):
    agricultural_id: int

    class Config:
        from_attributes = True