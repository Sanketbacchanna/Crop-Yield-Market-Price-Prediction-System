from app.models import (
    User,
    Crop,
    AgriculturalData,
    WeatherData,
    MarketPrice,
    YieldPrediction,
    PricePrediction,
    CropRecommendation
)
from fastapi import FastAPI
from sqlalchemy import text
from app.routes.crops import router as crops_router
from app.database import engine
from app.routes.agricultural_data import router as agricultural_data_router

app = FastAPI(
    title="Crop Yield & Market Price Prediction Portal",
    version="1.0.0"
)

app.include_router(crops_router)
app.include_router(agricultural_data_router)

@app.get("/")
def root():
    return {
        "message": "Crop Yield & Market Price Prediction Portal API is running"
    }

@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "OK",
            "database": "Connected"
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "database": "Connection failed",
            "error": str(e)
        }