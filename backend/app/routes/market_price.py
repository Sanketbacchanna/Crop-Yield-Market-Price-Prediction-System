# from datetime import date

# from fastapi import APIRouter, Depends, Query
# from sqlalchemy.orm import Session

# from app.database import get_db
# from app.models.market_price import MarketPrice

# router = APIRouter(
#     prefix="/market-price",
#     tags=["Market Price"]
# )


# @router.post("/")
# def create_market_price(
#     crop_id: int = Query(gt=0),
#     market_price: float = Query(ge=0, le=9999999999, allow_inf_nan=False),
#     price_date: date = Query(),
#     market_location: str = Query(min_length=1, max_length=45),
#     db: Session = Depends(get_db)
# ):
#     new_price = MarketPrice(
#         crop_id=crop_id,
#         market_price=market_price,
#         price_date=price_date,
#         market_location=market_location
#     )

#     db.add(new_price)
#     db.commit()
#     db.refresh(new_price)

#     return {
#         "message": "Market price added successfully",
#         "price_id": new_price.price_id,
#         "crop_id": new_price.crop_id,
#         "market_price": new_price.market_price,
#         "price_date": new_price.price_date,
#         "market_location": new_price.market_location
#     }


# @router.get("/")
# def get_market_prices(
#     db: Session = Depends(get_db)
# ):
#     return db.query(MarketPrice).all()

#New One

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.market_price import MarketPrice

router = APIRouter(
    prefix="/market-price",
    tags=["Market Price"]
)


# ---------------------------------------------------------
# Existing market price entry
# ---------------------------------------------------------

@router.post("/")
def create_market_price(
    crop_id: int = Query(gt=0),
    market_price: float = Query(ge=0, le=9999999999, allow_inf_nan=False),
    price_date: date = Query(),
    market_location: str = Query(min_length=1, max_length=45),
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


# ---------------------------------------------------------
# Existing market price records
# ---------------------------------------------------------

@router.get("/")
def get_market_prices(
    db: Session = Depends(get_db)
):
    return db.query(MarketPrice).all()


# ---------------------------------------------------------
# NEW: Live Mandi Prices
# ---------------------------------------------------------

@router.get("/live")
def get_live_market_prices(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    market: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit

    conditions = []
    params = {
        "limit": limit,
        "offset": offset
    }

    if state:
        conditions.append("state = :state")
        params["state"] = state

    if district:
        conditions.append("district = :district")
        params["district"] = district

    if market:
        conditions.append("market = :market")
        params["market"] = market

    if commodity:
        conditions.append("commodity = :commodity")
        params["commodity"] = commodity

    where_clause = ""

    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    query = text(f"""
        SELECT
            id,
            state,
            district,
            market,
            commodity,
            variety,
            grade,
            arrival_date,
            min_price,
            max_price,
            modal_price,
            source,
            fetched_at
        FROM live_market_prices
        {where_clause}
        ORDER BY arrival_date DESC, id DESC
        LIMIT :limit OFFSET :offset
    """)

    result = db.execute(query, params)

    records = [dict(row) for row in result.mappings().all()]

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "count": len(records),
        "data": records
    }