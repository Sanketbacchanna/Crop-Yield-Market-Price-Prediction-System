from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.crop_recommendation import CropRecommendation
from app.models.agricultural_data import AgriculturalData
from app.models.crop import Crop
from app.models.price_prediction import PricePrediction
from app.ml.yield_predictor import predict_yield


router = APIRouter(
    prefix="/crop-recommendation",
    tags=["Crop Recommendation"]
)


@router.post("/recommend")
def generate_crop_recommendations(
    user_id: int,
    agricultural_id: int,
    db: Session = Depends(get_db)
):
    # ---------------------------------------------------------
    # 1. Get agricultural information
    # ---------------------------------------------------------
    agricultural = db.query(AgriculturalData).filter(
        AgriculturalData.agricultural_id == agricultural_id
    ).first()

    if not agricultural:
        raise HTTPException(
            status_code=404,
            detail="Agricultural data not found"
        )

    # ---------------------------------------------------------
    # 2. Validate agricultural information
    # ---------------------------------------------------------
    if not agricultural.district:
        raise HTTPException(
            status_code=400,
            detail="District is missing"
        )

    if not agricultural.season:
        raise HTTPException(
            status_code=400,
            detail="Season is missing"
        )

    if agricultural.cultivated_area is None:
        raise HTTPException(
            status_code=400,
            detail="Cultivated area is missing"
        )

    if not agricultural.crop_year:
        raise HTTPException(
            status_code=400,
            detail="Crop year is missing"
        )

    # ---------------------------------------------------------
    # 3. Get all crops
    # ---------------------------------------------------------
    crops = db.query(Crop).all()

    if not crops:
        raise HTTPException(
            status_code=404,
            detail="No crops found in crop_table"
        )

    # ---------------------------------------------------------
    # 4. Prepare common ML inputs
    # ---------------------------------------------------------
    district = agricultural.district
    season = agricultural.season
    crop_year = agricultural.crop_year
    area = float(agricultural.cultivated_area)

    candidates = []

    # ---------------------------------------------------------
    # 5. Predict yield + get price for every crop
    # ---------------------------------------------------------
    for crop in crops:

        if not crop.crop_name:
            continue

        # ---------------------------------------------
        # Check season compatibility
        # ---------------------------------------------
        if crop.season:
            if crop.season.lower() != season.lower():
                continue

        # ---------------------------------------------
        # Check soil compatibility if both are available
        # ---------------------------------------------
        if crop.soil_type and agricultural.soil_type:
            if crop.soil_type.lower() != agricultural.soil_type.lower():
                continue

        # ---------------------------------------------
        # Predict yield using existing Random Forest
        # ---------------------------------------------
        try:
            predicted_yield = predict_yield(
                district=district,
                crop=crop.crop_name,
                crop_year=crop_year,
                season=season,
                area=area
            )
        except Exception as e:
            # Skip crops that the trained model cannot process
            continue

        # ---------------------------------------------
        # Get latest forecast price
        # ---------------------------------------------
        price_prediction = (
            db.query(PricePrediction)
            .filter(
                PricePrediction.user_id == user_id,
                PricePrediction.crop_id == crop.crop_id
            )
            .order_by(
                PricePrediction.price_prediction_id.desc()
            )
            .first()
        )

        if not price_prediction:
            continue

        if price_prediction.forecast_price is None:
            continue

        forecast_price = float(price_prediction.forecast_price)

        candidates.append({
            "crop_id": crop.crop_id,
            "crop_name": crop.crop_name,
            "predicted_yield": predicted_yield,
            "forecast_price": forecast_price
        })

    # ---------------------------------------------------------
    # 6. Check whether enough candidates are available
    # ---------------------------------------------------------
    if not candidates:
        raise HTTPException(
            status_code=404,
            detail=(
                "No crops could be recommended. "
                "Make sure matching crops exist and forecast "
                "prices are available in price_prediction_table."
            )
        )

    # ---------------------------------------------------------
    # 7. Calculate normalized recommendation score
    #
    # 50% Yield + 50% Price
    # ---------------------------------------------------------
    yields = [
        item["predicted_yield"]
        for item in candidates
    ]

    prices = [
        item["forecast_price"]
        for item in candidates
    ]

    min_yield = min(yields)
    max_yield = max(yields)

    min_price = min(prices)
    max_price = max(prices)

    for item in candidates:

        # Normalize yield between 0 and 1
        if max_yield == min_yield:
            yield_score = 1.0
        else:
            yield_score = (
                (item["predicted_yield"] - min_yield)
                / (max_yield - min_yield)
            )

        # Normalize price between 0 and 1
        if max_price == min_price:
            price_score = 1.0
        else:
            price_score = (
                (item["forecast_price"] - min_price)
                / (max_price - min_price)
            )

        # 50% yield + 50% price
        item["recommendation_score"] = (
            0.5 * yield_score +
            0.5 * price_score
        )

    # ---------------------------------------------------------
    # 8. Sort crops by recommendation score
    # ---------------------------------------------------------
    candidates.sort(
        key=lambda x: x["recommendation_score"],
        reverse=True
    )

    # ---------------------------------------------------------
    # 9. Keep TOP 3
    # ---------------------------------------------------------
    top_crops = candidates[:3]

    # ---------------------------------------------------------
    # 10. Save TOP 3 recommendations
    # ---------------------------------------------------------

    recommendation_date = datetime.now()

    saved_recommendations = []

    for rank, item in enumerate(top_crops, start=1):

        recommendation = CropRecommendation(
            user_id=user_id,
            crop_id=item["crop_id"],
            predicted_yield=item["predicted_yield"],
            forecast_price=item["forecast_price"],
            recommendation_rank=rank,
            recommendation_date=recommendation_date
        )

        db.add(recommendation)

        saved_recommendations.append({
            "recommendation_rank": rank,
            "crop_id": item["crop_id"],
            "crop_name": item["crop_name"],
            "predicted_yield": item["predicted_yield"],
            "forecast_price": item["forecast_price"],
            "recommendation_score": round(
                item["recommendation_score"],
                4
            )
        })

    db.commit()

    # ---------------------------------------------------------
    # 11. Return recommendation result
    # ---------------------------------------------------------
    return {
        "message": "Crop recommendations generated successfully",
        "user_id": user_id,
        "agricultural_id": agricultural_id,
        "district": district,
        "season": season,
        "crop_year": crop_year,
        "cultivated_area": area,
        "recommendations": saved_recommendations
    }


# -------------------------------------------------------------
# Existing manual POST endpoint
# -------------------------------------------------------------
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

    return {
        "message": "Crop recommendation added successfully",
        "recommendation_id": recommendation.recommendation_id,
        "user_id": recommendation.user_id,
        "crop_id": recommendation.crop_id,
        "predicted_yield": recommendation.predicted_yield,
        "forecast_price": recommendation.forecast_price,
        "recommendation_rank": recommendation.recommendation_rank,
        "recommendation_date": recommendation.recommendation_date
    }


# -------------------------------------------------------------
# Get all recommendations
# -------------------------------------------------------------
@router.get("/")
def get_crop_recommendations(
    db: Session = Depends(get_db)
):
    return db.query(CropRecommendation).all()