
import pandas as pd
from app.ml.model_registry import load_deployed_model

# Locate the project root
model = load_deployed_model("price", "price_prediction_model.pkl")

PRICE_CROP_ALIASES = {
    "rice": "Rice",
    "wheat": "Wheat",
    "maize": "Maize",
    "paddy": "Rice",
    "corn": "Maize",
}


def normalize_price_crop(crop: str) -> str:
    if crop is None:
        raise ValueError("Crop is required for price prediction")
    normalized = crop.strip()
    if not normalized:
        raise ValueError("Crop cannot be empty")
    return PRICE_CROP_ALIASES.get(normalized.casefold(), normalized)


def predict_price(
    crop: str,
    price_previous_month: float,
    price_previous_2_months: float,
    price_previous_3_months: float,
    price_avg_previous_3_months: float
) -> float:
    normalized_crop = normalize_price_crop(crop)
    data = pd.DataFrame([{
        "crop": normalized_crop,
        "price_previous_month": float(price_previous_month),
        "price_previous_2_months": float(price_previous_2_months),
        "price_previous_3_months": float(price_previous_3_months),
        "price_avg_previous_3_months": float(price_avg_previous_3_months),
    }])

    prediction = model.predict(data)
    return float(prediction[0])
