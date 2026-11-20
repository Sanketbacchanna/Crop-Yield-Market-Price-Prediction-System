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
from app.services.mandi_service import load_mandi_csv
from app.database import get_db
from app.models.market_price import MarketPrice
from app.services.mandi_api_service import fetch_mandi_prices

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
@router.get("/states")
def get_market_states(
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT DISTINCT state
        FROM live_market_prices
        WHERE state IS NOT NULL
          AND TRIM(state) <> ''
        ORDER BY state
    """)

    result = db.execute(query)

    states = [row[0] for row in result.fetchall()]

    return {
        "success": True,
        "count": len(states),
        "data": states
    }


@router.get("/districts")
def get_market_districts(
    state: str = Query(min_length=1),
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT DISTINCT district
        FROM live_market_prices
        WHERE state = :state
          AND district IS NOT NULL
          AND TRIM(district) <> ''
        ORDER BY district
    """)

    result = db.execute(
        query,
        {"state": state}
    )

    districts = [row[0] for row in result.fetchall()]

    return {
        "success": True,
        "state": state,
        "count": len(districts),
        "data": districts
    }


@router.get("/commodities")
def get_market_commodities(
    state: str = Query(min_length=1),
    district: str = Query(min_length=1),
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT DISTINCT commodity
        FROM live_market_prices
        WHERE state = :state
          AND district = :district
          AND commodity IS NOT NULL
          AND TRIM(commodity) <> ''
        ORDER BY commodity
    """)

    result = db.execute(
        query,
        {
            "state": state,
            "district": district
        }
    )

    commodities = [row[0] for row in result.fetchall()]

    return {
        "success": True,
        "state": state,
        "district": district,
        "count": len(commodities),
        "data": commodities
    }
@router.post("/refresh")
def refresh_mandi_prices(
    db: Session = Depends(get_db)
):
    try:
        result = load_mandi_csv(db)

        return {
            "success": True,
            "message": "Mandi prices refreshed successfully",
            **result
        }

    except Exception as error:
        db.rollback()

        return {
            "success": False,
            "message": "Failed to refresh mandi prices",
            "error": str(error)
        }

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
@router.post("/refresh-api")
def refresh_mandi_prices_from_api(
    state: str = Query(min_length=1),
    district: str = Query(min_length=1),
    commodity: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    try:
        return fetch_mandi_prices(
            db=db,
            state=state,
            district=district,
            commodity=commodity,
        )

    except Exception as error:
        db.rollback()

        return {
            "success": False,
            "message": "Failed to fetch mandi prices from Government API",
            "error": str(error),
        }
# ---------------------------------------------------------
# HISTORICAL MANDI PRICES
# Supports ALL Karnataka districts, markets and commodities
# ---------------------------------------------------------

@router.get("/history")
def get_historical_market_prices(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    market: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
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

    # ---------------------------------------------
    # Optional filters
    # ---------------------------------------------

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

    if from_date:
        conditions.append("arrival_date >= :from_date")
        params["from_date"] = from_date

    if to_date:
        conditions.append("arrival_date <= :to_date")
        params["to_date"] = to_date

    # ---------------------------------------------
    # Build WHERE clause
    # ---------------------------------------------

    where_clause = ""

    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    # ---------------------------------------------
    # Get historical records
    # ---------------------------------------------

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
            commodity_code,
            source
        FROM historical_market_prices
        {where_clause}
        ORDER BY arrival_date DESC, id DESC
        LIMIT :limit OFFSET :offset
    """)

    result = db.execute(query, params)

    records = [
        dict(row)
        for row in result.mappings().all()
    ]

    # ---------------------------------------------
    # Get total matching records
    # ---------------------------------------------

    count_query = text(f"""
        SELECT COUNT(*)
        FROM historical_market_prices
        {where_clause}
    """)

    total_result = db.execute(
        count_query,
        {
            key: value
            for key, value in params.items()
            if key not in ("limit", "offset")
        }
    )

    total = total_result.scalar() or 0

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "total": total,
        "count": len(records),
        "filters": {
            "state": state,
            "district": district,
            "market": market,
            "commodity": commodity,
            "from_date": from_date,
            "to_date": to_date
        },
        "data": records
    }
# ---------------------------------------------------------
# HISTORICAL MARKET PRICE FILTERS
# ---------------------------------------------------------

@router.get("/history/filters")
def get_historical_market_filters(
    state: str = Query(default="Karnataka", min_length=1),
    district: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    # ---------------------------------------------
    # Districts
    # ---------------------------------------------

    district_query = text("""
        SELECT DISTINCT district
        FROM historical_market_prices
        WHERE state = :state
          AND district IS NOT NULL
          AND TRIM(district) <> ''
        ORDER BY district
    """)

    district_result = db.execute(
        district_query,
        {"state": state}
    )

    districts = [
        row[0]
        for row in district_result.fetchall()
    ]

    # ---------------------------------------------
    # Commodities
    # ---------------------------------------------

    commodity_conditions = [
        "state = :state",
        "commodity IS NOT NULL",
        "TRIM(commodity) <> ''"
    ]

    commodity_params = {
        "state": state
    }

    if district:
        commodity_conditions.append(
            "district = :district"
        )
        commodity_params["district"] = district

    commodity_where = " AND ".join(
        commodity_conditions
    )

    commodity_query = text(f"""
        SELECT DISTINCT commodity
        FROM historical_market_prices
        WHERE {commodity_where}
        ORDER BY commodity
    """)

    commodity_result = db.execute(
        commodity_query,
        commodity_params
    )

    commodities = [
        row[0]
        for row in commodity_result.fetchall()
    ]

    # ---------------------------------------------
    # Markets
    # ---------------------------------------------

    market_conditions = [
        "state = :state",
        "market IS NOT NULL",
        "TRIM(market) <> ''"
    ]

    market_params = {
        "state": state
    }

    if district:
        market_conditions.append(
            "district = :district"
        )
        market_params["district"] = district

    if commodity:
        market_conditions.append(
            "commodity = :commodity"
        )
        market_params["commodity"] = commodity

    market_where = " AND ".join(
        market_conditions
    )

    market_query = text(f"""
        SELECT DISTINCT market
        FROM historical_market_prices
        WHERE {market_where}
        ORDER BY market
    """)

    market_result = db.execute(
        market_query,
        market_params
    )

    markets = [
        row[0]
        for row in market_result.fetchall()
    ]

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {
        "success": True,
        "state": state,
        "selected_district": district,
        "selected_commodity": commodity,
        "districts": districts,
        "commodities": commodities,
        "markets": markets,
        "counts": {
            "districts": len(districts),
            "commodities": len(commodities),
            "markets": len(markets)
        }
    }