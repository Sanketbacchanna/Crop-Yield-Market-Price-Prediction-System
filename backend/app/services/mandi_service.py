from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session


CSV_PATH = (
    Path(__file__).resolve().parents[3]
    / "ml"
    / "datasets"
    / "mandi_daily_prices.csv"
)


def load_mandi_csv(db: Session):
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Mandi CSV file not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

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
        column for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns in mandi CSV: {missing_columns}"
        )

    df = df[required_columns].copy()

    df["Arrival_Date"] = pd.to_datetime(
        df["Arrival_Date"],
        dayfirst=True,
        errors="coerce"
    ).dt.date

    price_columns = [
        "Min_x0020_Price",
        "Max_x0020_Price",
        "Modal_x0020_Price",
    ]

    for column in price_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    df = df.dropna(
        subset=[
            "State",
            "District",
            "Market",
            "Commodity",
            "Arrival_Date",
            "Modal_x0020_Price",
        ]
    )

    # Remove duplicate rows
    df = df.drop_duplicates()

    # Clear previous daily snapshot
    db.execute(
        text("TRUNCATE TABLE live_market_prices")
    )

    insert_query = text("""
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
            'AGMARKNET',
            NOW()
        )
    """)

    records = []

    for row in df.to_dict(orient="records"):
        records.append({
            "state": row["State"],
            "district": row["District"],
            "market": row["Market"],
            "commodity": row["Commodity"],
            "variety": row["Variety"],
            "grade": row["Grade"],
            "arrival_date": row["Arrival_Date"],
            "min_price": row["Min_x0020_Price"],
            "max_price": row["Max_x0020_Price"],
            "modal_price": row["Modal_x0020_Price"],
        })

    db.execute(insert_query, records)
    db.commit()

    return {
        "success": True,
        "rows_loaded": len(records),
        "source": "AGMARKNET",
        "file": str(CSV_PATH),
    }