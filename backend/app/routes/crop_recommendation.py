from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.crop_recommendation import CropRecommendation

router = APIRouter(
    prefix="/crop-recommendation",
    tags=["Crop Recommendation"]
)


@router.post("/")
def create_crop_recommendation(
    user_id: int,
    crop_id: int,
    predicted_yield: float,
    forecast_price: float,
    recommendation_rank: int,
    recommendation_date: str,
    db: Session = Depends(get_db)
):
    recommendation = CropRecommendation(
        user_id=user_id,
        crop_id=crop_id,
        predicted_yield=predicted_yield,
        forecast_price=forecast_price,
        recommendation_rank=recommendation_rank,
        recommendation_date=recommendation_date
    )

    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    return recommendation


@router.get("/")
def get_crop_recommendations(
    db: Session = Depends(get_db)
):
    return db.query(CropRecommendation).all()