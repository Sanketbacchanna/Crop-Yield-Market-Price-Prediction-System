
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.business_data import get_historical_price_crops, get_historical_prices
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


@router.get("/historical/crops")
def list_historical_price_crops():
    try:
        return get_historical_price_crops()
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load historical crop prices.",
        ) from error


@router.get("/historical")
def get_historical_price_trend(
    crop_name: str = Query(min_length=1, max_length=100),
):
    if not crop_name.strip():
        raise HTTPException(status_code=400, detail="Crop name cannot be empty.")
    try:
        observations = get_historical_prices(crop_name)
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load historical crop prices.",
        ) from error
    if not observations:
        raise HTTPException(
            status_code=404,
            detail=f"No historical price observations found for {crop_name.strip()}.",
        )
    return observations


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
@router.get("/market-insight")
def get_market_insight(
    state: str = Query(min_length=1, max_length=100),
    district: str = Query(min_length=1, max_length=100),
    commodity: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    """
    Combines the latest mandi price with the existing ML price prediction.

    Current mandi price:
        Taken from live_market_prices.

    Prediction:
        Uses the existing price prediction model and the latest
        three historical modal prices available for the crop.
    """

    state = state.strip()
    district = district.strip()
    commodity = commodity.strip()

    # ---------------------------------------------------------
    # 1. Get the latest mandi price
    # ---------------------------------------------------------
    mandi_query = text("""
        SELECT
            market,
            commodity,
            variety,
            min_price,
            max_price,
            modal_price,
            arrival_date
        FROM live_market_prices
        WHERE LOWER(TRIM(state)) = LOWER(:state)
          AND LOWER(TRIM(district)) = LOWER(:district)
          AND LOWER(TRIM(commodity)) = LOWER(:commodity)
        ORDER BY arrival_date DESC, id DESC
        LIMIT 1
    """)

    mandi_result = db.execute(
        mandi_query,
        {
            "state": state,
            "district": district,
            "commodity": commodity,
        },
    ).mappings().first()

    if mandi_result is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No live mandi price found for "
                f"{commodity} in {district}, {state}."
            ),
        )

    current_price = float(mandi_result["modal_price"])

    # ---------------------------------------------------------
    # 2. Normalize crop name for the ML model
    # ---------------------------------------------------------
    crop_name = commodity

    # ---------------------------------------------------------
    # 3. Get historical prices
    # ---------------------------------------------------------
    try:
        historical_prices = get_historical_prices(crop_name)
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load historical crop prices.",
        ) from error

    if len(historical_prices) < 3:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough historical price data for {commodity}. "
                "At least 3 observations are required."
            ),
        )

    # ---------------------------------------------------------
    # 4. Take the latest 3 historical observations
    # ---------------------------------------------------------
    latest_three = historical_prices[-3:]

    price_previous_3_months = float(
        latest_three[0]["modal_price"]
    )

    price_previous_2_months = float(
        latest_three[1]["modal_price"]
    )

    price_previous_month = float(
        latest_three[2]["modal_price"]
    )

    price_avg_previous_3_months = (
        price_previous_month
        + price_previous_2_months
        + price_previous_3_months
    ) / 3

    # ---------------------------------------------------------
    # 5. Run existing ML model
    # ---------------------------------------------------------
    try:
        predicted_price = predict_price(
            crop=crop_name,
            price_previous_month=price_previous_month,
            price_previous_2_months=price_previous_2_months,
            price_previous_3_months=price_previous_3_months,
            price_avg_previous_3_months=price_avg_previous_3_months,
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate market price insight.",
        ) from error

    predicted_price = round(float(predicted_price), 2)

    # ---------------------------------------------------------
    # 6. Compare current mandi price with prediction
    # ---------------------------------------------------------
    change = round(
        predicted_price - current_price,
        2,
    )

    if current_price > 0:
        change_percent = round(
            (change / current_price) * 100,
            2,
        )
    else:
        change_percent = 0.0

    # ---------------------------------------------------------
    # 7. Generate farmer-friendly recommendation
    # ---------------------------------------------------------
    if change_percent > 5:
        recommendation = (
            "Prices are expected to increase significantly. "
            "Consider waiting before selling if storage is available."
        )

    elif change_percent > 0:
        recommendation = (
            "Prices are expected to increase slightly. "
            "You may consider waiting for a better price."
        )

    elif change_percent < -5:
        recommendation = (
            "Prices are expected to decrease significantly. "
            "Consider selling sooner if suitable."
        )

    elif change_percent < 0:
        recommendation = (
            "Prices are expected to decrease slightly. "
            "Consider monitoring the market before selling."
        )

    else:
        recommendation = (
            "Prices are expected to remain relatively stable."
        )

    # ---------------------------------------------------------
    # 8. Return complete market insight
    # ---------------------------------------------------------
    return {
        "success": True,
        "location": {
            "state": state,
            "district": district,
        },
        "commodity": commodity,
        "current_market": {
            "market": mandi_result["market"],
            "variety": mandi_result["variety"],
            "min_price": float(mandi_result["min_price"]),
            "max_price": float(mandi_result["max_price"]),
            "modal_price": current_price,
            "arrival_date": mandi_result["arrival_date"],
        },
        "historical_inputs": {
            "previous_3_months": price_previous_3_months,
            "previous_2_months": price_previous_2_months,
            "previous_month": price_previous_month,
            "average_previous_3_months": round(
                price_avg_previous_3_months,
                2,
            ),
        },
        "prediction": {
            "predicted_price": predicted_price,
            "change": change,
            "change_percent": change_percent,
        },
        "recommendation": recommendation,
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
