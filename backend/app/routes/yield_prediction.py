from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.yield_prediction import YieldPrediction

router = APIRouter(
    prefix="/yield-prediction",
    tags=["Yield Prediction"]
)


@router.post("/")
def create_yield_prediction(
    user_id: int,
    crop_id: int,
    agricultural_id: int,
    predicted_yield: float,
    model_used: str,
    prediction_date: str,
    db: Session = Depends(get_db)
):
    prediction = YieldPrediction(
        user_id=user_id,
        crop_id=crop_id,
        agricultural_id=agricultural_id,
        predicted_yield=predicted_yield,
        model_used=model_used,
        prediction_date=prediction_date
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return {
        "message": "Yield prediction added successfully",
        "prediction_id": prediction.prediction_id,
        "user_id": prediction.user_id,
        "crop_id": prediction.crop_id,
        "agricultural_id": prediction.agricultural_id,
        "predicted_yield": prediction.predicted_yield,
        "model_used": prediction.model_used,
        "prediction_date": prediction.prediction_date
    }


@router.get("/")
def get_yield_predictions(
    db: Session = Depends(get_db)
):
    return db.query(YieldPrediction).all()