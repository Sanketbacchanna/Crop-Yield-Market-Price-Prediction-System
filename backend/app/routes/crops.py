import csv
import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.crop import Crop

router = APIRouter(
    prefix="/crops",
    tags=["Crops"]
)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(__file__)
        )
    )
)
YIELD_DATASET_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "datasets",
    "Crop_Yield_Cleaned.csv",
)


def _get_dataset_crop_names():
    with open(YIELD_DATASET_PATH, encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        crop_names = {
            (row.get("crop") or "").strip()
            for row in reader
            if (row.get("crop") or "").strip()
        }
    return sorted(crop_names, key=str.casefold)


def _sync_crop_catalog(db: Session):
    dataset_crop_names = _get_dataset_crop_names()
    existing_crops = db.query(Crop).all()
    existing_names = {
        (crop.crop_name or "").strip().casefold()
        for crop in existing_crops
        if (crop.crop_name or "").strip()
    }

    missing_names = [
        name for name in dataset_crop_names if name.casefold() not in existing_names
    ]

    for crop_name in missing_names:
        db.add(Crop(crop_name=crop_name))

    if missing_names:
        db.commit()

    return db.query(Crop).order_by(Crop.crop_id).all()


@router.get("/")
def get_crops(db: Session = Depends(get_db)):
    try:
        return _sync_crop_catalog(db)
    except FileNotFoundError:
        return db.query(Crop).order_by(Crop.crop_id).all()
