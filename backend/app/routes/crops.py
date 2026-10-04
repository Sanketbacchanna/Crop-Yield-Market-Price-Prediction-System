from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.crop import Crop

router = APIRouter(
    prefix="/crops",
    tags=["Crops"]
)


@router.get("/")
def get_crops(db: Session = Depends(get_db)):
    crops = db.query(Crop).all()
    return crops