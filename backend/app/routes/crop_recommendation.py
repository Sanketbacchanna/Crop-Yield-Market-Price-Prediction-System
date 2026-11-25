from datetime import datetime
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.crop_recommendation import CropRecommendation
from app.models.agricultural_data import AgriculturalData
from app.models.crop import Crop
from app.models.price_prediction import PricePrediction
from app.models.user import User
from app.models.weather_data import WeatherData
from app.ml.yield_predictor import predict_yield
from app.business_data import get_historical_crop_summaries, get_historical_prices


router = APIRouter(
    prefix="/crop-recommendation",
    tags=["Crop Recommendation"]
)

SCORING_WEIGHTS = {
    "expected_profit": 0.55,
    "expected_yield": 0.10,
    "expected_market_price": 0.10,
    "weather_suitability": 0.10,
    "soil_suitability": 0.05,
    "water_requirement": 0.05,
    "historical_profitability": 0.05,
}

SCORE_FACTOR_LABELS = {
    "expected_profit": "Expected profit",
    "expected_yield": "Expected yield",
    "expected_market_price": "Expected market price",
    "weather_suitability": "Weather suitability",
    "soil_suitability": "Soil suitability",
    "water_requirement": "Water requirement",
    "historical_profitability": "Historical profitability",
}

CROP_PROFILES = {
    "rice": {"temperature": (20, 35), "rainfall": (100, 300), "water": "high"},
    "maize": {"temperature": (18, 32), "rainfall": (50, 150), "water": "medium"},
    "cotton": {"temperature": (21, 35), "rainfall": (50, 120), "water": "medium"},
    "groundnut": {"temperature": (20, 30), "rainfall": (45, 100), "water": "low"},
    "wheat": {"temperature": (15, 25), "rainfall": (30, 90), "water": "medium"},
    "sugarcane": {"temperature": (20, 35), "rainfall": (100, 250), "water": "high"},
}

# Planning estimates in INR per acre. These are intentionally returned with
# every recommendation so farmers can see exactly what drives profitability.
CROP_COSTS_PER_ACRE = {
    "maize": {
        "seed": 2500,
        "fertilizer": 5500,
        "pesticide": 2500,
        "labour": 9000,
        "irrigation": 5000,
        "transportation": 7000,
    },
    "rice": {
        "seed": 2200,
        "fertilizer": 6000,
        "pesticide": 3000,
        "labour": 12000,
        "irrigation": 5500,
        "transportation": 6500,
    },
    "wheat": {
        "seed": 1800,
        "fertilizer": 4800,
        "pesticide": 1800,
        "labour": 7000,
        "irrigation": 4200,
        "transportation": 5000,
    },
    "cotton": {
        "seed": 3200,
        "fertilizer": 6200,
        "pesticide": 5000,
        "labour": 10000,
        "irrigation": 4800,
        "transportation": 6500,
    },
    "sugarcane": {
        "seed": 6500,
        "fertilizer": 9000,
        "pesticide": 3500,
        "labour": 14000,
        "irrigation": 9000,
        "transportation": 11000,
    },
}
DEFAULT_COSTS_PER_ACRE = {
    "seed": 2500,
    "fertilizer": 5500,
    "pesticide": 3000,
    "labour": 9000,
    "irrigation": 5000,
    "transportation": 6500,
}


def _min_max(value, values):
    available = [item for item in values if item is not None]
    if value is None or not available:
        return 0.5
    low, high = min(available), max(available)
    return 1.0 if high == low else max(0.0, min(1.0, (value - low) / (high - low)))


def _range_score(value, acceptable_range):
    if value is None:
        return 0.5
    low, high = acceptable_range
    if low <= value <= high:
        return 1.0
    distance = low - value if value < low else value - high
    return max(0.0, 1.0 - distance / max(high - low, 1))


def _weather_score(crop_name, temperature, rainfall, humidity):
    profile = CROP_PROFILES.get(crop_name.casefold())
    if not profile:
        return 0.5
    scores = [
        _range_score(temperature, profile["temperature"]),
        _range_score(rainfall, profile["rainfall"]),
    ]
    if humidity is not None:
        scores.append(_range_score(humidity, (35, 85)))
    return mean(scores)


def _water_score(crop_name, rainfall):
    profile = CROP_PROFILES.get(crop_name.casefold())
    if not profile or rainfall is None:
        return 0.5
    requirement = profile["water"]
    if requirement == "high":
        return _range_score(rainfall, (100, 300))
    if requirement == "low":
        return max(0.0, 1.0 - _range_score(rainfall, (100, 300)))
    return _range_score(rainfall, (50, 150))


def _soil_score(crop, soil_type):
    if not soil_type or not crop.soil_type:
        return 0.5
    return 1.0 if crop.soil_type.casefold() == soil_type.casefold() else 0.15


def _profitability_estimate(
    crop_name: str,
    yield_tonnes_per_hectare: float | None,
    price_per_quintal: float | None,
    area_acres: float,
) -> dict:
    """Return an acreage-aware profit estimate in INR.

    The yield dataset stores yield as tonnes/hectare. One acre is 0.404686
    hectares and one tonne is 10 quintals, while mandi prices are per quintal.
    """
    costs_per_acre = CROP_COSTS_PER_ACRE.get(
        crop_name.casefold(), DEFAULT_COSTS_PER_ACRE
    )
    expense_breakdown = {
        key: round(value * area_acres, 2)
        for key, value in costs_per_acre.items()
    }
    estimated_expenses = round(sum(expense_breakdown.values()), 2)
    expected_yield_quintals = (
        round(yield_tonnes_per_hectare * area_acres * 0.404686 * 10, 2)
        if yield_tonnes_per_hectare is not None
        else None
    )
    expected_revenue = (
        round(expected_yield_quintals * price_per_quintal, 2)
        if expected_yield_quintals is not None and price_per_quintal is not None
        else None
    )
    expected_profit = (
        round(expected_revenue - estimated_expenses, 2)
        if expected_revenue is not None
        else None
    )
    return {
        "area_acres": round(area_acres, 2),
        "expected_yield_quintals": expected_yield_quintals,
        "expected_price_per_quintal": price_per_quintal,
        "expected_revenue": expected_revenue,
        "estimated_expenses": estimated_expenses,
        "expense_breakdown": expense_breakdown,
        "expected_profit": expected_profit,
    }


@router.post("/recommend-legacy")
def generate_crop_recommendations_legacy(
    agricultural_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    # ---------------------------------------------------------
    # Get latest weather data for the agricultural district
    # ---------------------------------------------------------
    weather = (
        db.query(WeatherData)
        .filter(WeatherData.location.ilike(district))
        .order_by(WeatherData.recorded_date.desc())
        .first()
    )

    if not weather:
        raise HTTPException(
            status_code=404,
            detail=f"No weather data found for district: {district}"
        )

    temperature = (
        float(weather.temperature)
        if weather.temperature is not None
        else None
    )

    rainfall = (
        float(weather.rainfall)
        if weather.rainfall is not None
        else None
    )

    humidity = (
        float(weather.humidity)
        if weather.humidity is not None
        else None
    )

    candidates = []

    # ---------------------------------------------------------
    # 5. Predict yield + get price for every crop
    # ---------------------------------------------------------
    for crop in crops:

        if not crop.crop_name:
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
                PricePrediction.user_id == current_user.user_id,
                PricePrediction.crop_id == crop.crop_id
            )
            .order_by(
                PricePrediction.price_prediction_id.desc()
            )
            .first()
        )

        forecast_price = (
            float(price_prediction.forecast_price)
            if price_prediction and price_prediction.forecast_price is not None
            else None
        )

        historical_prices = get_historical_prices(crop.crop_name)
        historical_average_price = (
            mean(item["modal_price"] for item in historical_prices)
            if historical_prices
            else None
        )
        expected_price = forecast_price or historical_average_price
        candidate = {
            "crop_id": crop.crop_id,
            "crop_name": crop.crop_name,
            "predicted_yield": predicted_yield,
            "forecast_price": forecast_price,
            "historical_average_price": historical_average_price,
            "season_suitable": not crop.season or crop.season.casefold() == season.casefold(),
            "soil_score": _soil_score(crop, agricultural.soil_type),
            "weather_score": _weather_score(crop.crop_name, temperature, rainfall, humidity),
            "water_score": _water_score(crop.crop_name, rainfall),
        }
        candidate.update(
            _profitability_estimate(
                crop.crop_name,
                predicted_yield,
                expected_price,
                area / 0.404686,
            )
        )
        candidates.append(candidate)

    # ---------------------------------------------------------
    # 6. Check whether enough candidates are available
    # ---------------------------------------------------------
    if not candidates:
        raise HTTPException(
            status_code=404,
            detail=(
                "No crops could be recommended. Make sure matching crops "
                "exist for the selected season, soil, and yield model."
            )
        )

    # Normalize the two market/yield factors against this recommendation set.
    yields = [item["predicted_yield"] for item in candidates]
    prices = [
        item["forecast_price"]
        if item["forecast_price"] is not None
        else item["historical_average_price"]
        for item in candidates
    ]
    profitability = [item["expected_profit"] for item in candidates]
    has_complete_price_forecasts = all(item["forecast_price"] is not None for item in candidates)

    for item, price, profit in zip(candidates, prices, profitability):
        yield_score = _min_max(item["predicted_yield"], yields)
        price_score = _min_max(price, prices)
        expected_profit_score = _min_max(profit, profitability)
        historical_profitability_score = _min_max(profit, profitability)
        season_score = 1.0 if item["season_suitable"] else 0.2
        weather_score = item["weather_score"] * season_score
        factors = {
            "expected_profit": round(expected_profit_score * 100, 1),
            "expected_yield": round(yield_score * 100, 1),
            "expected_market_price": round(price_score * 100, 1),
            "weather_suitability": round(weather_score * 100, 1),
            "soil_suitability": round(item["soil_score"] * 100, 1),
            "water_requirement": round(item["water_score"] * 100, 1),
            "historical_profitability": round(historical_profitability_score * 100, 1),
        }
        item["recommendation_score"] = sum(
            factors[factor] * weight for factor, weight in SCORING_WEIGHTS.items()
        )
        item["score_factors"] = factors
        item["market_price_source"] = "forecast" if item["forecast_price"] is not None else "historical average"
        item["expected_market_price"] = price

    # ---------------------------------------------------------
    # 8. Sort crops by recommendation score
    # ---------------------------------------------------------
    candidates.sort(
        key=lambda x: (
            x["expected_profit"] is not None,
            x["expected_profit"] if x["expected_profit"] is not None else float("-inf"),
            x["recommendation_score"],
        ),
        reverse=True,
    )

    # ---------------------------------------------------------
    # 9. Keep TOP 5 so farmers can compare more than one viable crop.
    # ---------------------------------------------------------
    top_crops = candidates[:5]
    has_profitable_crop = any(
        item["expected_profit"] is not None and item["expected_profit"] > 0
        for item in candidates
    )

    # ---------------------------------------------------------
    # 10. Save TOP 3 recommendations
    # ---------------------------------------------------------

    recommendation_date = datetime.now()

    saved_recommendations = []

    for rank, item in enumerate(top_crops, start=1):

        recommendation = CropRecommendation(
            user_id=current_user.user_id,
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
            "expected_market_price": item["expected_market_price"],
            "historical_average_price": item["historical_average_price"],
            "recommendation_score": round(
                item["recommendation_score"], 1
            ),
            "score_factors": item["score_factors"],
            "market_price_source": item["market_price_source"],
            "area_acres": item["area_acres"],
            "expected_yield_quintals": item["expected_yield_quintals"],
            "expected_price_per_quintal": item["expected_price_per_quintal"],
            "expected_revenue": item["expected_revenue"],
            "estimated_expenses": item["estimated_expenses"],
            "expense_breakdown": item["expense_breakdown"],
            "expected_profit": item["expected_profit"],
        })

    db.commit()

    # ---------------------------------------------------------
    # 11. Return recommendation result
    # ---------------------------------------------------------
    return {
        "message": "Crop recommendations generated successfully",
        "user_id": current_user.user_id,
        "agricultural_id": agricultural_id,
        "district": district,
        "season": season,
        "crop_year": crop_year,
        "cultivated_area": area,
        "recommendation_basis": (
            "yield_and_forecast_price"
            if has_complete_price_forecasts
            else "yield_only"
        ),
        "scoring_model": "weighted_decision_support",
        "profitability_model": "yield_price_minus_estimated_costs",
        "has_profitable_crop": has_profitable_crop,
        "score_weights": {key: round(value * 100) for key, value in SCORING_WEIGHTS.items()},
        "score_factor_labels": SCORE_FACTOR_LABELS,
        "recommendations": saved_recommendations
    }


@router.post("/recommend")
def generate_historical_crop_recommendations(
    area_acres: float = Query(default=1.0, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rank crops from historical Karnataka yield and mandi-price data only."""
    crops = db.query(Crop).all()
    crop_by_name = {
        (crop.crop_name or "").strip().casefold(): crop
        for crop in crops
        if crop.crop_name
    }
    summaries = get_historical_crop_summaries()
    candidates = []

    for summary in summaries:
        crop = crop_by_name.get(summary["crop_name"].casefold())
        if crop is None:
            continue
        historical_prices = get_historical_prices(summary["crop_name"])
        average_price = (
            mean(item["modal_price"] for item in historical_prices)
            if historical_prices
            else None
        )
        candidates.append({
            "crop_id": crop.crop_id,
            "crop_name": crop.crop_name,
            "historical_yield": summary["historical_yield"],
            "historical_average_price": average_price,
            "yield_stability": summary["yield_stability"],
            "historical_districts": summary["historical_districts"],
            "historical_observations": summary["historical_observations"],
        })

    if not candidates:
        raise HTTPException(status_code=404, detail="Historical crop data is unavailable.")

    yields = [item["historical_yield"] for item in candidates]
    prices = [item["historical_average_price"] for item in candidates]
    stability = [item["yield_stability"] for item in candidates]
    coverage = [item["historical_districts"] for item in candidates]
    profitability = []
    for item in candidates:
        estimate = _profitability_estimate(
            item["crop_name"],
            item["historical_yield"],
            item["historical_average_price"],
            area_acres,
        )
        item.update(estimate)
        profitability.append(item["expected_profit"])

    for item, price, profit in zip(candidates, prices, profitability):
        factors = {
            "expected_profit": round(_min_max(profit, profitability) * 100, 1),
            "expected_yield": round(_min_max(item["historical_yield"], yields) * 100, 1),
            "expected_market_price": round(_min_max(price, prices) * 100, 1),
            "weather_suitability": round(item["yield_stability"] * 100, 1),
            "soil_suitability": round(_min_max(item["historical_districts"], coverage) * 100, 1),
            "water_requirement": 50.0,
            "historical_profitability": round(_min_max(profit, profitability) * 100, 1),
        }
        item["recommendation_score"] = sum(
            factors[factor] * weight for factor, weight in SCORING_WEIGHTS.items()
        )
        item["score_factors"] = factors

    candidates.sort(
        key=lambda item: (
            item["expected_profit"] is not None,
            item["expected_profit"] if item["expected_profit"] is not None else float("-inf"),
            item["recommendation_score"],
        ),
        reverse=True,
    )
    recommendations = []
    has_profitable_crop = any(
        item["expected_profit"] is not None and item["expected_profit"] > 0
        for item in candidates
    )
    recommendation_date = datetime.now()
    for rank, item in enumerate(candidates[:5], start=1):
        db.add(CropRecommendation(
            user_id=current_user.user_id,
            crop_id=item["crop_id"],
            predicted_yield=item["historical_yield"],
            forecast_price=None,
            recommendation_rank=rank,
            recommendation_date=recommendation_date,
        ))
        recommendations.append({
            "recommendation_rank": rank,
            "crop_id": item["crop_id"],
            "crop_name": item["crop_name"],
            "recommendation_score": round(item["recommendation_score"], 1),
            "score_factors": item["score_factors"],
            "area_acres": item["area_acres"],
            "expected_yield_quintals": item["expected_yield_quintals"],
            "expected_price_per_quintal": item["expected_price_per_quintal"],
            "expected_revenue": item["expected_revenue"],
            "estimated_expenses": item["estimated_expenses"],
            "expense_breakdown": item["expense_breakdown"],
            "expected_profit": item["expected_profit"],
            "historical_observations": item["historical_observations"],
        })
    db.commit()

    return {
        "message": "Historical crop recommendations generated successfully",
        "recommendation_basis": "historical_yield_and_market_data",
        "area_acres": area_acres,
        "profitability_model": "historical_yield_price_minus_estimated_costs",
        "has_profitable_crop": has_profitable_crop,
        "scoring_model": "historical_weighted_decision_support",
        "score_weights": {key: round(value * 100) for key, value in SCORING_WEIGHTS.items()},
        "score_factor_labels": SCORE_FACTOR_LABELS,
        "recommendations": recommendations,
    }


# -------------------------------------------------------------
# Existing manual POST endpoint
# -------------------------------------------------------------
@router.post("/")
def create_crop_recommendation(
    crop_id: int,
    predicted_yield: float,
    forecast_price: float,
    recommendation_rank: int,
    recommendation_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recommendation = CropRecommendation(
        user_id=current_user.user_id,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CropRecommendation)
        .filter(CropRecommendation.user_id == current_user.user_id)
        .all()
    )
