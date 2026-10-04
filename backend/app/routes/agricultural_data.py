from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.agricultural_data import AgriculturalData
from app.schemas.agricultural_data import (
    AgriculturalDataCreate,
    AgriculturalDataResponse
)

router = APIRouter(
    prefix="/agricultural-data",
    tags=["Agricultural Data"]
)


@router.post("/", response_model=AgriculturalDataResponse)
def create_agricultural_data(
    data: AgriculturalDataCreate,
    db: Session = Depends(get_db)
):
    new_data = AgriculturalData(
        state=data.state,
        district=data.district,
        season=data.season,
        crop_id=data.crop_id,
        cultivated_area=data.cultivated_area,
        soil_type=data.soil_type
    )

    db.add(new_data)
    db.commit()
    db.refresh(new_data)

    return new_data


@router.get("/")
def get_agricultural_data(
    db: Session = Depends(get_db)
):
    return db.query(AgriculturalData).all()