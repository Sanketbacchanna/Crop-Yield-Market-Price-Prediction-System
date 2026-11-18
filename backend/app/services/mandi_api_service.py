import os
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session


# =========================================================
# PATH CONFIGURATION
# =========================================================

# Project root:
# crop-prediction-portal/
# ├── backend/
# ├── frontend/
# └── ml/
#     └── datasets/
#         └── mandi_daily_prices.csv

PROJECT_DIR = Path(__file__).resolve().parents[3]

BACKEND_DIR = PROJECT_DIR / "backend"

CSV_PATH = (
    PROJECT_DIR
    / "ml"
    / "datasets"
    / "mandi_daily_prices.csv"
)

ENV_FILE = BACKEND_DIR / ".env"


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv(
    dotenv_path=ENV_FILE,
    override=True
)


# =========================================================
# GOVERNMENT API CONFIGURATION
# =========================================================

RESOURCE_ID = "35985678-0d79-46b4-9ed6-6f13308a1d24"

API_URL = (
    f"https://api.data.gov.in/resource/{RESOURCE_ID}"
)


# =========================================================
# INSERT QUERY
# =========================================================

INSERT_QUERY = text("""
    INSERT INTO live_market_prices (
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
    )
    VALUES (
        :state,
        :district,
        :market,
        :commodity,
        :variety,
        :grade,
        :arrival_date,
        :min_price,
        :max_price,
        :modal_price,
        :source,
        NOW()
    )
""")


# =========================================================
# HELPER: CLEAR EXISTING LOCATION DATA
# =========================================================

def clear_location_data(
    db: Session,
    state: str,
    district: str,
    commodity: str | None = None,
):
    if commodity:

        delete_query = text("""
            DELETE FROM live_market_prices
            WHERE state = :state
              AND district = :district
              AND commodity = :commodity
        """)

        db.execute(
            delete_query,
            {
                "state": state,
                "district": district,
                "commodity": commodity,
            }
        )

    else:

        delete_query = text("""
            DELETE FROM live_market_prices
            WHERE state = :state
              AND district = :district
        """)

        db.execute(
            delete_query,
            {
                "state": state,
                "district": district,
            }
        )


# =========================================================
# HELPER: INSERT RECORDS
# =========================================================

def save_records(
    db: Session,
    records: list[dict],
    source: str,
):
    rows = []

    for item in records:

        arrival_date = None

        arrival_date_value = item.get("Arrival_Date")

        if arrival_date_value:

            try:
                arrival_date = datetime.strptime(
                    str(arrival_date_value),
                    "%d/%m/%Y"
                ).date()

            except ValueError:

                try:
                    arrival_date = datetime.strptime(
                        str(arrival_date_value),
                        "%Y-%m-%d"
                    ).date()

                except ValueError:
                    arrival_date = None

        rows.append({
            "state": item.get("State"),
            "district": item.get("District"),
            "market": item.get("Market"),
            "commodity": item.get("Commodity"),
            "variety": item.get("Variety"),
            "grade": item.get("Grade"),
            "arrival_date": arrival_date,

            "min_price": (
                item.get("Min_Price")
                if item.get("Min_Price") not in ("", None)
                else None
            ),

            "max_price": (
                item.get("Max_Price")
                if item.get("Max_Price") not in ("", None)
                else None
            ),

            "modal_price": (
                item.get("Modal_Price")
                if item.get("Modal_Price") not in ("", None)
                else None
            ),
        })

    if rows:

        db.execute(
            INSERT_QUERY,
            [
                {
                    **row,
                    "source": source,
                }
                for row in rows
            ]
        )

    return len(rows)


# =========================================================
# GOVERNMENT API
# =========================================================

def fetch_from_government_api(
    state: str,
    district: str,
    commodity: str | None = None,
    limit: int = 1000,
):
    api_key = os.getenv("DATA_GOV_API_KEY")

    if not api_key:
        raise RuntimeError(
            f"DATA_GOV_API_KEY is missing from {ENV_FILE}"
        )

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit,
        "offset": 0,
        "filters[State]": state,
        "filters[District]": district,
    }

    if commodity:
        params["filters[Commodity]"] = commodity

    response = requests.get(
        API_URL,
        params=params,
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data.get("records", [])


# =========================================================
# CSV FALLBACK
# =========================================================

def fetch_from_csv(
    state: str,
    district: str,
    commodity: str | None = None,
):
    if not CSV_PATH.exists():

        raise FileNotFoundError(
            f"Mandi CSV file not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

    df["Arrival_Date"] = pd.to_datetime(
    df["Arrival_Date"],
    dayfirst=True,
    errors="coerce"
).dt.strftime("%d/%m/%Y")

    required_columns = [
        "State",
        "District",
        "Market",
        "Commodity",
        "Variety",
        "Grade",
        "Arrival_Date",
        "Min_x0020_Price",
        "Max_x0020_Price",
        "Modal_x0020_Price",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            f"Missing columns in mandi CSV: {missing_columns}"
        )

    # -----------------------------------------------------
    # Filter state
    # -----------------------------------------------------

    df = df[
        df["State"].astype(str).str.strip().str.lower()
        == state.strip().lower()
    ]

    # -----------------------------------------------------
    # Filter district
    # -----------------------------------------------------

    df = df[
        df["District"].astype(str).str.strip().str.lower()
        == district.strip().lower()
    ]

    # -----------------------------------------------------
    # Filter commodity if provided
    # -----------------------------------------------------

    if commodity:

        df = df[
            df["Commodity"].astype(str).str.strip().str.lower()
            == commodity.strip().lower()
        ]

    # -----------------------------------------------------
    # Convert dataframe to API-like records
    # -----------------------------------------------------

    records = []

    for _, row in df.iterrows():

        records.append({
            "State": row["State"],
            "District": row["District"],
            "Market": row["Market"],
            "Commodity": row["Commodity"],
            "Variety": row["Variety"],
            "Grade": row["Grade"],
            "Arrival_Date": row["Arrival_Date"],
            "Min_Price": row["Min_x0020_Price"],
            "Max_Price": row["Max_x0020_Price"],
            "Modal_Price": row["Modal_x0020_Price"],
        })

    return records


# =========================================================
# MAIN FUNCTION
# =========================================================

def fetch_mandi_prices(
    db: Session,
    state: str,
    district: str,
    commodity: str | None = None,
):
    state = state.strip()
    district = district.strip()

    if commodity:
        commodity = commodity.strip()

    # =====================================================
    # 1. TRY GOVERNMENT API
    # =====================================================

    try:

        records = fetch_from_government_api(
            state=state,
            district=district,
            commodity=commodity,
            limit=1000,
        )

        # -------------------------------------------------
        # No records from API
        # -------------------------------------------------

        if not records:

            return {
                "success": True,
                "message": "No mandi records found from Government API",
                "state": state,
                "district": district,
                "commodity": commodity,
                "rows_loaded": 0,
                "source": "data.gov.in / AGMARKNET",
            }

        # -------------------------------------------------
        # Remove existing records for this location
        # -------------------------------------------------

        clear_location_data(
            db=db,
            state=state,
            district=district,
            commodity=commodity,
        )

        # -------------------------------------------------
        # Insert API records
        # -------------------------------------------------

        rows_loaded = save_records(
            db=db,
            records=records,
            source="AGMARKNET",
        )

        db.commit()

        return {
            "success": True,
            "message": "Mandi prices fetched from Government API",
            "state": state,
            "district": district,
            "commodity": commodity,
            "rows_loaded": rows_loaded,
            "source": "data.gov.in / AGMARKNET",
        }

    # =====================================================
    # 2. GOVERNMENT API FAILED → CSV FALLBACK
    # =====================================================

    except requests.exceptions.RequestException as api_error:

        print(
            f"Government API failed: {api_error}"
        )

        try:

            records = fetch_from_csv(
                state=state,
                district=district,
                commodity=commodity,
            )

            # -------------------------------------------------
            # No CSV records
            # -------------------------------------------------

            if not records:

                db.rollback()

                return {
                    "success": False,
                    "message": (
                        "Government API failed and "
                        "no matching CSV data was found"
                    ),
                    "state": state,
                    "district": district,
                    "commodity": commodity,
                    "rows_loaded": 0,
                    "api_error": "Government API returned an error.",
                }

            # -------------------------------------------------
            # Remove old location records
            # -------------------------------------------------

            clear_location_data(
                db=db,
                state=state,
                district=district,
                commodity=commodity,
            )

            # -------------------------------------------------
            # Insert CSV records
            # -------------------------------------------------

            rows_loaded = save_records(
                db=db,
                records=records,
                source="AGMARKNET CSV",
            )

            db.commit()

            return {
                "success": True,
                "message": (
                    "Government API unavailable. "
                    "Loaded mandi prices from CSV fallback."
                ),
                "state": state,
                "district": district,
                "commodity": commodity,
                "rows_loaded": rows_loaded,
                "source": "AGMARKNET CSV fallback",
                "api_error": "Government API returned an error.",
            }

        except Exception as csv_error:

            db.rollback()

            return {
                "success": False,
                "message": (
                    "Government API failed and "
                    "CSV fallback also failed"
                ),
                "state": state,
                "district": district,
                "commodity": commodity,
                "api_error": "Government API returned an error.",
                "csv_error": str(csv_error),
            }

    # =====================================================
    # 3. OTHER ERRORS
    # =====================================================

    except Exception as error:

        db.rollback()

        raise error