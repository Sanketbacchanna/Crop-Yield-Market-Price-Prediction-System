import os
import joblib
import pandas as pd


# Path to trained model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "saved_models", "yield_model.pkl")


# Load model once when the application starts
model = joblib.load(MODEL_PATH)


def predict_yield(
    district: str,
    crop: str,
    crop_year: str,
    season: str,
    area: float
):
    data = pd.DataFrame([{
        "district": district,
        "crop": crop,
        "crop_year": crop_year,
        "season": season,
        "area": area
    }])

    prediction = model.predict(data)

    return float(prediction[0])