from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.yield_prediction import YieldPrediction
from app.models.agricultural_data import AgriculturalData
from app.models.crop import Crop
from app.ml.yield_predictor import predict_yield


router = APIRouter(
    prefix="/yield-prediction",
    tags=["Yield Prediction"]
)


@router.post("/")
def create_yield_prediction(
    user_id: int,
    crop_id: int,
    agricultural_id: int,
    crop_year: str,
    prediction_date: str,
    db: Session = Depends(get_db)
):
    # 1. Get agricultural data
    agricultural = db.query(AgriculturalData).filter(
        AgriculturalData.agricultural_id == agricultural_id
    ).first()

    if not agricultural:
        raise HTTPException(
            status_code=404,
            detail="Agricultural data not found"
        )

    # 2. Get crop information
    crop = db.query(Crop).filter(
        Crop.crop_id == crop_id
    ).first()

    if not crop:
        raise HTTPException(
            status_code=404,
            detail="Crop not found"
        )

    # 3. Check required ML fields
    if not agricultural.district:
        raise HTTPException(
            status_code=400,
            detail="District is missing in agricultural data"
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

    if not crop.crop_name:
        raise HTTPException(
            status_code=400,
            detail="Crop name is missing"
        )

    # 4. Predict yield using trained Random Forest model
    predicted_yield = predict_yield(
        district=agricultural.district,
        crop=crop.crop_name,
        crop_year=crop_year,
        season=agricultural.season,
        area=float(agricultural.cultivated_area)
    )

    # 5. Save prediction in database
    prediction = YieldPrediction(
        user_id=user_id,
        crop_id=crop_id,
        agricultural_id=agricultural_id,
        predicted_yield=predicted_yield,
        model_used="Random Forest",
        prediction_date=prediction_date
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # 6. Return prediction result
    return {
        "message": "Yield prediction generated successfully",
        "prediction_id": prediction.prediction_id,
        "user_id": prediction.user_id,
        "crop_id": prediction.crop_id,
        "crop_name": crop.crop_name,
        "agricultural_id": prediction.agricultural_id,
        "district": agricultural.district,
        "season": agricultural.season,
        "cultivated_area": float(agricultural.cultivated_area),
        "crop_year": crop_year,
        "predicted_yield": float(predicted_yield),
        "model_used": prediction.model_used,
        "prediction_date": prediction.prediction_date
    }


@router.get("/")
def get_yield_predictions(
    db: Session = Depends(get_db)
):
    return db.query(YieldPrediction).all()