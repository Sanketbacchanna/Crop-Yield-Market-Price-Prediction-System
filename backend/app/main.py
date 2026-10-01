from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine

app = FastAPI(
    title="Crop Yield & Market Price Prediction Portal",
    version="1.0.0"
)


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