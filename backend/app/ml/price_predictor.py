
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


def predict_price(
    crop: str,
    price_previous_month: float,
    price_previous_2_months: float,
    price_previous_3_months: float,
    price_avg_previous_3_months: float
) -> float:
    data = pd.DataFrame([{
        "crop": crop,
        "price_previous_month": price_previous_month,
        "price_previous_2_months": price_previous_2_months,
        "price_previous_3_months": price_previous_3_months,
        "price_avg_previous_3_months": price_avg_previous_3_months
    }])

    prediction = model.predict(data)

    return float(prediction[0])
