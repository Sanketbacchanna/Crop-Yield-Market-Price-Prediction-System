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
from app.services.nearest_mandi_service import market_aliases, nearest_markets

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
    variety: str | None = Query(default=None),
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

    if variety:
        conditions.append("variety = :variety")
        params["variety"] = variety

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


@router.get("/nearest")
def get_nearest_mandi_markets(
    latitude: float = Query(ge=11.5, le=18.5),
    longitude: float = Query(ge=73.0, le=78.5),
    commodity: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """Return nearby Karnataka markets with their latest matching modal price."""
    nearby = nearest_markets(latitude, longitude, limit)
    price_rows = []

    if commodity:
        price_rows = db.execute(
            text("""
                SELECT market, district, commodity, modal_price, arrival_date
                FROM (
                    SELECT id, market, district, commodity, modal_price, arrival_date
                    FROM live_market_prices
                    WHERE state = 'Karnataka'
                      AND commodity = :commodity
                      AND modal_price IS NOT NULL
                    UNION ALL
                    SELECT id, market, district, commodity, modal_price, arrival_date
                    FROM historical_market_prices
                    WHERE state = 'Karnataka'
                      AND commodity = :commodity
                      AND modal_price IS NOT NULL
                ) AS available_prices
                ORDER BY arrival_date DESC, id DESC
            """),
            {"commodity": commodity.strip()},
        ).mappings().all()

    results = []
    for market in nearby:
        aliases = market_aliases(market)
        price = next(
            (
                row for row in price_rows
                if str(row["market"] or "").strip().casefold() in aliases
            ),
            None,
        )
        results.append(
            {
                "market": market["name"],
                "district": market["district"],
                "distance_km": market["distance_km"],
                "latitude": market["latitude"],
                "longitude": market["longitude"],
                "commodity": commodity,
                "modal_price": float(price["modal_price"]) if price else None,
                "arrival_date": price["arrival_date"] if price else None,
                "price_available": price is not None,
            }
        )

    priced_markets = [item for item in results if item["price_available"]]
    best_market = max(priced_markets, key=lambda item: item["modal_price"], default=None)

    return {
        "success": True,
        "latitude": latitude,
        "longitude": longitude,
        "commodity": commodity,
        "data": results,
        "best_market": best_market,
        "message": (
            "Prices are unavailable for the nearby markets."
            if commodity and not priced_markets
            else None
        ),
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
    variety: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit

    conditions = []

    # Fetch one extra record so we can determine
    # whether another page exists without COUNT(*)
    params = {
        "limit": limit + 1,
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

    if variety:
        conditions.append("variety = :variety")
        params["variety"] = variety

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
    # Fetch limit + 1 to determine has_next
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

    all_records = [
        dict(row)
        for row in result.mappings().all()
    ]

    # ---------------------------------------------
    # Determine pagination status
    # ---------------------------------------------

    has_next = len(all_records) > limit

    records = all_records[:limit]

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "count": len(records),
        "has_next": has_next,
        "has_previous": page > 1,
        "filters": {
            "state": state,
            "district": district,
            "market": market,
            "commodity": commodity,
            "variety": variety,
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
    market: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    # The live snapshot contains the same filter dimensions and is small enough
    # to serve dropdown options without scanning millions of historical rows.
    # Historical results remain available through /history below.
    filter_table = "live_market_prices"
    selected_filter_table = (
        "historical_market_prices"
        if district or market or commodity
        else filter_table
    )

    # ---------------------------------------------
    # Districts
    # ---------------------------------------------

    district_query = text(f"""
        SELECT DISTINCT district
        FROM {filter_table}
        WHERE state = :state
          AND district IS NOT NULL
          AND district <> ''
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
        "commodity <> ''"
    ]

    commodity_params = {
        "state": state
    }

    if district:
        commodity_conditions.append(
            "district = :district"
        )
        commodity_params["district"] = district

    if market:
        commodity_conditions.append("market = :market")
        commodity_params["market"] = market

    commodity_where = " AND ".join(
        commodity_conditions
    )

    commodity_query = text(f"""
        SELECT DISTINCT commodity
        FROM {selected_filter_table}
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
        "market <> ''"
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
        FROM {selected_filter_table}
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

    # Varieties are the final level in the filter hierarchy.
    variety_conditions = [
        "state = :state",
        "variety IS NOT NULL",
        "variety <> ''"
    ]
    variety_params = {"state": state}

    if district:
        variety_conditions.append("district = :district")
        variety_params["district"] = district
    if market:
        variety_conditions.append("market = :market")
        variety_params["market"] = market
    if commodity:
        variety_conditions.append("commodity = :commodity")
        variety_params["commodity"] = commodity

    variety_query = text(f"""
        SELECT DISTINCT variety
        FROM {selected_filter_table}
        WHERE {' AND '.join(variety_conditions)}
        ORDER BY variety
    """)
    variety_result = db.execute(variety_query, variety_params)
    varieties = [row[0] for row in variety_result.fetchall()]

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {
        "success": True,
        "state": state,
        "selected_district": district,
        "selected_commodity": commodity,
        "selected_market": market,
        "districts": districts,
        "commodities": commodities,
        "markets": markets,
        "varieties": varieties,
        "counts": {
            "districts": len(districts),
            "commodities": len(commodities),
            "markets": len(markets),
            "varieties": len(varieties)
        }
    }


@router.get("/summary")
def get_market_price_summary(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    market: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    variety: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    """Return comparable modal-price metrics for the selected market slice."""
    conditions = ["modal_price IS NOT NULL"]
    params = {}
    for name, value in (("state", state), ("district", district),
                        ("market", market), ("commodity", commodity),
                        ("variety", variety)):
        if value:
            conditions.append(f"{name} = :{name}")
            params[name] = value
    where_clause = " AND ".join(conditions)

    latest = db.execute(text(f"""
        SELECT arrival_date FROM historical_market_prices
        WHERE {where_clause}
          AND arrival_date IS NOT NULL
        ORDER BY arrival_date DESC, id DESC
        LIMIT 1
    """), params).scalar()
    if latest is None:
        return {"success": True, "latest_date": None, "today": None,
                "yesterday": None, "average_7_day": None,
                "average_30_day": None, "change_percent": None}

    def average(extra_clause):
        return db.execute(text(f"""
            SELECT AVG(modal_price) FROM historical_market_prices
            WHERE {where_clause} AND {extra_clause}
        """), {**params, "latest_date": latest}).scalar()

    today = average("arrival_date = :latest_date")
    previous_date = db.execute(text(f"""
        SELECT arrival_date FROM historical_market_prices
        WHERE {where_clause} AND arrival_date < :latest_date
        ORDER BY arrival_date DESC, id DESC
        LIMIT 1
    """), {**params, "latest_date": latest}).scalar()
    yesterday = None
    if previous_date:
        # Reuse the helper with the previous date without changing the base filters.
        yesterday = db.execute(text(f"""
            SELECT AVG(modal_price) FROM historical_market_prices
            WHERE {where_clause} AND arrival_date = :previous_date
        """), {**params, "previous_date": previous_date}).scalar()

    average_7_day = average("arrival_date BETWEEN DATE_SUB(:latest_date, INTERVAL 6 DAY) AND :latest_date")
    average_30_day = average("arrival_date BETWEEN DATE_SUB(:latest_date, INTERVAL 29 DAY) AND :latest_date")
    change_percent = ((float(today) - float(yesterday)) / float(yesterday) * 100
                      if today is not None and yesterday not in (None, 0) else None)

    return {
        "success": True,
        "latest_date": latest,
        "today": today,
        "yesterday": yesterday,
        "average_7_day": average_7_day,
        "average_30_day": average_30_day,
        "change_percent": change_percent,
    }
