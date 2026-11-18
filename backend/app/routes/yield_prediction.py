from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.business_data import get_historical_yield
from app.auth import get_current_user
from app.database import get_db
from app.models.yield_prediction import YieldPrediction
from app.models.agricultural_data import AgriculturalData
from app.models.crop import Crop
from app.models.user import User
from app.ml.yield_predictor import get_karnataka_districts, predict_yield
from datetime import datetime

router = APIRouter(
    prefix="/yield-prediction",
    tags=["Yield Prediction"]
)


@router.get("/historical")
def get_district_yield_history(
    district: str = Query(min_length=1, max_length=45),
    crop_name: str = Query(min_length=1, max_length=100),
    season: Optional[str] = Query(default=None, max_length=45),
):
    try:
        observations = get_historical_yield(
            district,
            crop_name,
            season=season,
        )
    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load historical district yields.",
        ) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not observations:
        season_detail = (
            f" during {season.strip()}" if season and season.strip() else ""
        )
        raise HTTPException(
            status_code=404,
            detail=(
                f"No historical yield data found for {crop_name.strip()} "
                f"in {district.strip()}{season_detail}."
            ),
        )
    return observations


@router.get("/districts")
def get_yield_districts():
    try:
        return list(get_karnataka_districts())
    except (OSError, ValueError) as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load districts from the Karnataka weather dataset"
        ) from error


@router.post("/")
def create_yield_prediction(
    agricultural_id: int = Query(gt=0),
    crop_name: Optional[str] = Query(default=None, max_length=100),
    district_override: Optional[str] = Query(
        default=None, alias="district", max_length=45
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Get agricultural data
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
    # 2. Validate required agricultural information
    # ---------------------------------------------------------
    district = (
        district_override.strip()
        if district_override is not None
        else agricultural.district
    )
    if not district:
        raise HTTPException(
            status_code=400,
            detail="District is missing in agricultural data"
        )
    if not district.strip():
        raise HTTPException(
            status_code=400,
            detail="District cannot be empty"
        )

    if not agricultural.season:
        raise HTTPException(
            status_code=400,
            detail="Season is missing in agricultural data"
        )

    if agricultural.cultivated_area is None:
        raise HTTPException(
            status_code=400,
            detail="Cultivated area is missing in agricultural data"
        )

    if not agricultural.crop_year:
        raise HTTPException(
            status_code=400,
            detail="Crop year is missing in agricultural data"
        )

    if agricultural.crop_id is None and crop_name is None:
        raise HTTPException(
            status_code=400,
            detail="Crop ID is missing in agricultural data"
        )

    # ---------------------------------------------------------
    # 3. Get crop information
    # ---------------------------------------------------------
    if crop_name is not None:
        selected_crop_name = crop_name.strip()
        if not selected_crop_name:
            raise HTTPException(
                status_code=400,
                detail="Crop name cannot be empty"
            )
        crop = db.query(Crop).filter(
            Crop.crop_name.ilike(selected_crop_name)
        ).first()
    else:
        crop = db.query(Crop).filter(
            Crop.crop_id == agricultural.crop_id
        ).first()

    if not crop:
        raise HTTPException(
            status_code=404,
            detail="Crop not found"
        )

    if not crop.crop_name:
        raise HTTPException(
            status_code=400,
            detail="Crop name is missing"
        )

    # ---------------------------------------------------------
    # 4. Prepare ML input
    #
    # Model was trained with:
    # district
    # crop
    # crop_year
    # season
    # area
    # ---------------------------------------------------------
    crop_name = crop.crop_name
    crop_year = agricultural.crop_year
    season = agricultural.season
    area = float(agricultural.cultivated_area)

    # ---------------------------------------------------------
    # 5. Generate prediction using yield_model.pkl
    # ---------------------------------------------------------
    predicted_yield = predict_yield(
        district=district,
        crop=crop_name,
        crop_year=crop_year,
        season=season,
        area=area
    )

    # ---------------------------------------------------------
    # 6. Save prediction to database
    # ---------------------------------------------------------
    prediction = YieldPrediction(
        user_id=current_user.user_id,
        crop_id=crop.crop_id,
        agricultural_id=agricultural_id,
        predicted_yield=predicted_yield,
        model_used="Random Forest",
        prediction_date=datetime.now()
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # ---------------------------------------------------------
    # 7. Return prediction result
    # ---------------------------------------------------------
    return {
        "message": "Yield prediction generated successfully",

        "prediction_id": prediction.prediction_id,

        "user_id": prediction.user_id,

        "agricultural_id": prediction.agricultural_id,

        "crop_id": prediction.crop_id,

        "crop_name": crop_name,

        "district": district,

        "season": season,

        "crop_year": crop_year,

        "cultivated_area": area,

        "predicted_yield": float(predicted_yield),

        "model_used": prediction.model_used
    }


@router.get("/")
def get_yield_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(YieldPrediction)
        .filter(YieldPrediction.user_id == current_user.user_id)
        .order_by(YieldPrediction.prediction_date.desc())
        .all()
    )