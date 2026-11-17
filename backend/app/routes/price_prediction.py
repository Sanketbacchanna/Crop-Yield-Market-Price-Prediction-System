
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.price_prediction import PricePrediction
from app.models.crop import Crop
from app.models.user import User
from app.ml.price_predictor import predict_price

router = APIRouter(
    prefix="/price-prediction",
    tags=["Price Prediction"]
)


@router.post("/forecast")
def generate_price_forecast(
    crop_id: int = Query(gt=0),
    price_previous_month: float = Query(ge=0, allow_inf_nan=False),
    price_previous_2_months: float = Query(ge=0, allow_inf_nan=False),
    price_previous_3_months: float = Query(ge=0, allow_inf_nan=False),
    price_avg_previous_3_months: float = Query(ge=0, allow_inf_nan=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the crop exists
    crop = db.query(Crop).filter(Crop.crop_id == crop_id).first()

    if crop is None:
        raise HTTPException(status_code=404, detail="Crop not found")

    crop_name = (crop.crop_name or "").strip()

    if not crop_name:
        raise HTTPException(
            status_code=400,
            detail="Crop name is missing for the selected crop.",
        )

    # Generate the next-month forecast. The backend automatically falls back to
    # a stable average-based estimate when the crop isn't in the limited training
    # set, so the UI can use the full crop catalogue from the dataset.
    try:
        forecast_price = predict_price(
            crop=crop_name,
            price_previous_month=price_previous_month,
            price_previous_2_months=price_previous_2_months,
            price_previous_3_months=price_previous_3_months,
            price_avg_previous_3_months=price_avg_previous_3_months,
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate price forecast",
        ) from error

    # Save the forecast in the existing database table
    prediction = PricePrediction(
        user_id=current_user.user_id,
        crop_id=crop_id,
        forecast_price=round(forecast_price),
        model_used="RandomForestRegressor",
        forecast_date=date.today(),
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return {
        "message": "Price forecast generated and saved successfully",
        "price_prediction_id": prediction.price_prediction_id,
        "crop": crop_name,
        "forecast_price": round(forecast_price, 2),
        "model_used": prediction.model_used,
        "forecast_date": prediction.forecast_date,
    }


@router.get("/")
def get_price_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(PricePrediction)
        .filter(PricePrediction.user_id == current_user.user_id)
        .order_by(PricePrediction.forecast_date.desc())
        .all()
    )
