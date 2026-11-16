import csv
from functools import lru_cache
import os
import joblib
import pandas as pd


# Path to trained model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "saved_models", "yield_model.pkl")
DISTRICT_DATASET_PATH = os.path.join(
    BASE_DIR, "ml", "datasets", "karnataka_weather_2015_2026.csv"
)
YIELD_DISTRICT_NAMES = {
    "ballari": "BELLARY",
    "belagavi": "BELGAUM",
    "bengaluru rural": "BANGALORE RURAL",
    "chikkamagaluru": "CHIKMAGALUR",
    "dakshina kannada": "DAKSHIN KANNAD",
    "davanagere": "DAVANGERE",
    "kalaburagi": "GULBARGA",
    "mysuru": "MYSORE",
    "shivamogga": "SHIMOGA",
    "tumakuru": "TUMKUR",
    "uttara kannada": "UTTAR KANNAD",
    "vijayapura": "BIJAPUR",
}
YIELD_SEASON_ALIASES = {
    "kharif": "Kharif",
    "rabi": "Rabi",
    "zaid": "Zaid",
    "whole year": "Whole Year",
    "wholeyear": "Whole Year",
    "annual": "Whole Year",
}


# Load model once when the application starts
model = joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def get_karnataka_districts():
    with open(DISTRICT_DATASET_PATH, encoding="utf-8-sig", newline="") as dataset:
        reader = csv.DictReader(dataset)
        if "District" not in (reader.fieldnames or []):
            raise ValueError("District column is missing from the weather dataset")

        districts = {
            (row.get("District") or "").strip()
            for row in reader
            if (row.get("District") or "").strip()
        }

    if not districts:
        raise ValueError("No districts found in the weather dataset")

    return tuple(sorted(districts, key=str.casefold))


def normalize_yield_district(district: str) -> str:
    if district is None:
        raise ValueError("District is required for yield prediction")
    normalized_name = district.strip().casefold()
    return YIELD_DISTRICT_NAMES.get(normalized_name, district.strip().upper())


def normalize_yield_crop(crop: str) -> str:
    if crop is None:
        raise ValueError("Crop is required for yield prediction")
    return crop.strip()


def normalize_yield_season(season: str) -> str:
    if season is None:
        raise ValueError("Season is required for yield prediction")
    key = season.strip().casefold()
    return YIELD_SEASON_ALIASES.get(key, season.strip())


def normalize_yield_year(crop_year) -> str:
    if crop_year is None:
        raise ValueError("Crop year is required for yield prediction")
    value = str(crop_year).strip()
    return value.replace("_", "-")


def predict_yield(
    district: str,
    crop: str,
    crop_year,
    season: str,
    area: float
):
    data = pd.DataFrame([{
        "district": normalize_yield_district(district),
        "crop": normalize_yield_crop(crop),
        "crop_year": normalize_yield_year(crop_year),
        "season": normalize_yield_season(season),
        "area": float(area)
    }])

    prediction = model.predict(data)

    return float(prediction[0])