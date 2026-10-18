
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.price_prediction import PricePrediction
from app.models.crop import Crop
from app.ml.price_predictor import predict_price

router = APIRouter(
    prefix="/price-prediction",
    tags=["Price Prediction"]
)

SUPPORTED_CROPS = {
    1: "Rice",
    2: "Wheat",
    3: "Maize",
}


@router.post("/forecast")
def generate_price_forecast(
    user_id: int,
    crop_id: int,
    price_previous_month: float,
    price_previous_2_months: float,
    price_previous_3_months: float,
    price_avg_previous_3_months: float,
    db: Session = Depends(get_db),
):
    # Verify the crop exists
    crop = db.query(Crop).filter(Crop.crop_id == crop_id).first()

    if crop is None:
        raise HTTPException(status_code=404, detail="Crop not found")

    # This model was trained only on Rice, Wheat, and Maize
    crop_name = SUPPORTED_CROPS.get(crop_id)

    if crop_name is None:
        raise HTTPException(
            status_code=400,
            detail="Price forecasting is currently supported for Rice, Wheat, and Maize only.",
        )

    # Validate that supplied prices are reasonable
    prices = [
        price_previous_month,
        price_previous_2_months,
        price_previous_3_months,
        price_avg_previous_3_months,
    ]

    if any(price < 0 for price in prices):
        raise HTTPException(
            status_code=400,
            detail="Historical prices cannot be negative",
        )

    # Generate the next-month forecast
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
        user_id=user_id,
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
):
    return db.query(PricePrediction).all()
