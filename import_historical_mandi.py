import csv
import mysql.connector
from pathlib import Path

CSV_FILE = Path(
    "C:/Users/Sanket/Desktop/crop-prediction-portal/"
    "karnataka_historical_mandi_prices.csv"
)

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "Sanket@123",       # put your MySQL password here if you have one
    "database": "crop_yield",
    "port": 3306
}

BATCH_SIZE = 5000


def clean_value(value):
    if value is None:
        return None

    value = str(value).strip()

    if value == "" or value.lower() == "nan":
        return None

    return value


print("=" * 70)
print("KARNATAKA HISTORICAL MANDI DATA IMPORT")
print("=" * 70)

print(f"CSV file: {CSV_FILE}")

if not CSV_FILE.exists():
    raise FileNotFoundError(
        f"CSV file not found: {CSV_FILE}"
    )

print("Connecting to MySQL...")

connection = mysql.connector.connect(**DB_CONFIG)

cursor = connection.cursor()

print("Connected successfully.")

insert_sql = """
INSERT INTO historical_market_prices (
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
    commodity_code
)
VALUES (
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s, %s
)
"""

batch = []
total_inserted = 0

with open(
    CSV_FILE,
    "r",
    encoding="utf-8-sig",
    newline=""
) as file:

    reader = csv.DictReader(file)

    for row in reader:

        batch.append((
            clean_value(row.get("State")),
            clean_value(row.get("District")),
            clean_value(row.get("Market")),
            clean_value(row.get("Commodity")),
            clean_value(row.get("Variety")),
            clean_value(row.get("Grade")),
            clean_value(row.get("Arrival_Date")),
            clean_value(row.get("Min_Price")),
            clean_value(row.get("Max_Price")),
            clean_value(row.get("Modal_Price")),
            clean_value(row.get("Commodity_Code")),
        ))

        if len(batch) >= BATCH_SIZE:

            cursor.executemany(
                insert_sql,
                batch
            )

            connection.commit()

            total_inserted += len(batch)

            print(
                f"Inserted: {total_inserted:,} records"
            )

            batch.clear()


# Insert remaining records
if batch:

    cursor.executemany(
        insert_sql,
        batch
    )

    connection.commit()

    total_inserted += len(batch)


print("\n" + "=" * 70)
print("IMPORT COMPLETED")
print("=" * 70)

print(
    f"Total records inserted: "
    f"{total_inserted:,}"
)

cursor.close()
connection.close()

print("MySQL connection closed.")