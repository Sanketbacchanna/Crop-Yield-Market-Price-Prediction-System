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
    agricultural_id: int,
    db: Session = Depends(get_db)
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

    if not agricultural.crop_year:
        raise HTTPException(
            status_code=400,
            detail="Crop year is missing in agricultural data"
        )

    if agricultural.crop_id is None:
        raise HTTPException(
            status_code=400,
            detail="Crop ID is missing in agricultural data"
        )

    # ---------------------------------------------------------
    # 3. Get crop information
    # ---------------------------------------------------------
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
    district = agricultural.district
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
        user_id=user_id,
        crop_id=agricultural.crop_id,
        agricultural_id=agricultural_id,
        predicted_yield=predicted_yield,
        model_used="Random Forest",
        prediction_date=None
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
    db: Session = Depends(get_db)
):
    return db.query(YieldPrediction).all()