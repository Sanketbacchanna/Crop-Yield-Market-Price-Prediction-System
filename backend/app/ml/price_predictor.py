
import os
import joblib
import pandas as pd

# Locate the project root
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(__file__)
        )
    )
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "saved_models",
    "price_prediction_model.pkl"
)

# Load the trained model once
model = joblib.load(MODEL_PATH)

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


def _fallback_prediction(
    price_previous_month: float,
    price_previous_2_months: float,
    price_previous_3_months: float,
    price_avg_previous_3_months: float,
) -> float:
    values = [
        float(price_previous_month),
        float(price_previous_2_months),
        float(price_previous_3_months),
        float(price_avg_previous_3_months),
    ]
    return float(sum(values) / len(values))


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

    try:
        prediction = model.predict(data)
        return float(prediction[0])
    except Exception:
        return _fallback_prediction(
            price_previous_month,
            price_previous_2_months,
            price_previous_3_months,
            price_avg_previous_3_months,
        )
