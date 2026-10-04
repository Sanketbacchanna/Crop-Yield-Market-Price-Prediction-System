from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.market_price import MarketPrice

router = APIRouter(
    prefix="/market-price",
    tags=["Market Price"]
)


@router.post("/")
def create_market_price(
    crop_id: int,
    market_price: float,
    price_date: str,
    market_location: str,
    db: Session = Depends(get_db)
):
    new_price = MarketPrice(
        crop_id=crop_id,
        market_price=market_price,
        price_date=price_date,
        market_location=market_location
    )

    db.add(new_price)
    db.commit()
    db.refresh(new_price)

    return {
        "message": "Market price added successfully",
        "price_id": new_price.price_id,
        "crop_id": new_price.crop_id,
        "market_price": new_price.market_price,
        "price_date": new_price.price_date,
        "market_location": new_price.market_location
    }


@router.get("/")
def get_market_prices(
    db: Session = Depends(get_db)
):
    return db.query(MarketPrice).all()