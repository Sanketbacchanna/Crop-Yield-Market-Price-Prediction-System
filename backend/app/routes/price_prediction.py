from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.price_prediction import PricePrediction

router = APIRouter(
    prefix="/price-prediction",
    tags=["Price Prediction"]
)


@router.post("/")
def create_price_prediction(
    user_id: int,
    crop_id: int,
    forecast_price: float,
    model_used: str,
    forecast_date: str,
    db: Session = Depends(get_db)
):
    prediction = PricePrediction(
        user_id=user_id,
        crop_id=crop_id,
        forecast_price=forecast_price,
        model_used=model_used,
        forecast_date=forecast_date
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return {
        "message": "Price prediction added successfully",
        "price_prediction_id": prediction.price_prediction_id,
        "user_id": prediction.user_id,
        "crop_id": prediction.crop_id,
        "forecast_price": prediction.forecast_price,
        "model_used": prediction.model_used,
        "forecast_date": prediction.forecast_date
    }


@router.get("/")
def get_price_predictions(
    db: Session = Depends(get_db)
):
    return db.query(PricePrediction).all()