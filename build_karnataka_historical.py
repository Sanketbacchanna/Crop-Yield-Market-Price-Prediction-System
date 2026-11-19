import pandas as pd
from pathlib import Path
import time

BASE_URL = (
    "https://huggingface.co/datasets/"
    "DHIVAKARNAIDUSUNKARI/"
    "mandi-india-daily-prices-2001-2026/"
    "resolve/main/data/mandi_daily_by_year/"
)

START_YEAR = 2001
END_YEAR = 2026

OUTPUT_DIR = Path("karnataka_historical_yearly")
OUTPUT_FILE = Path("karnataka_historical_mandi_prices.csv")

OUTPUT_DIR.mkdir(exist_ok=True)

all_files = []

print("=" * 70)
print("KARNATAKA HISTORICAL MANDI DATA BUILDER")
print("=" * 70)

for year in range(START_YEAR, END_YEAR + 1):

    url = f"{BASE_URL}mandi_daily_{year}.parquet"

    print("\n" + "-" * 70)
    print(f"Processing {year}...")
    print(f"URL: {url}")

    try:
        df = pd.read_parquet(url)

        print(f"Original rows: {len(df):,}")

        # Filter Karnataka
        karnataka = df[
            df["State"]
            .astype(str)
            .str.strip()
            .str.casefold()
            == "karnataka"
        ].copy()

        print(f"Karnataka rows: {len(karnataka):,}")

        if len(karnataka) == 0:
            print("No Karnataka records found.")
            continue

        # Clean text fields
        text_columns = [
            "State",
            "District",
            "Market",
            "Commodity",
            "Variety",
            "Grade",
        ]

        for column in text_columns:
            if column in karnataka.columns:
                karnataka[column] = (
                    karnataka[column]
                    .astype(str)
                    .str.strip()
                )

        # Convert date
        if "Arrival_Date" in karnataka.columns:
            karnataka["Arrival_Date"] = pd.to_datetime(
                karnataka["Arrival_Date"],
                errors="coerce"
            )

        # Save yearly Karnataka file
        yearly_file = (
            OUTPUT_DIR /
            f"karnataka_{year}_mandi_prices.csv"
        )

        karnataka.to_csv(
            yearly_file,
            index=False
        )

        print(f"Saved: {yearly_file}")

        all_files.append(yearly_file)

        print(
            f"Districts: {karnataka['District'].nunique()} | "
            f"Markets: {karnataka['Market'].nunique()} | "
            f"Commodities: {karnataka['Commodity'].nunique()}"
        )

    except Exception as e:
        print(f"ERROR processing {year}:")
        print(e)

    time.sleep(1)


print("\n")
print("=" * 70)
print("COMBINING KARNATAKA FILES")
print("=" * 70)

if not all_files:
    print("No Karnataka files were created.")
    raise SystemExit


dataframes = []

for file in all_files:
    print(f"Reading {file}...")

    df = pd.read_csv(file)

    dataframes.append(df)


combined = pd.concat(
    dataframes,
    ignore_index=True
)

print(f"\nRows before duplicate removal: {len(combined):,}")

# Remove exact duplicate rows
combined = combined.drop_duplicates()

print(
    f"Rows after duplicate removal: "
    f"{len(combined):,}"
)

# Convert arrival date
combined["Arrival_Date"] = pd.to_datetime(
    combined["Arrival_Date"],
    errors="coerce"
)

# Sort
combined = combined.sort_values(
    by=[
        "Arrival_Date",
        "District",
        "Market",
        "Commodity",
    ],
    na_position="last"
)

# Save final dataset
combined.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n")
print("=" * 70)
print("FINAL KARNATAKA DATASET")
print("=" * 70)

print(f"Output file: {OUTPUT_FILE}")
print(f"Total records: {len(combined):,}")

print(
    f"Districts: "
    f"{combined['District'].nunique():,}"
)

print(
    f"Markets: "
    f"{combined['Market'].nunique():,}"
)

print(
    f"Commodities: "
    f"{combined['Commodity'].nunique():,}"
)

print(
    f"Date range: "
    f"{combined['Arrival_Date'].min()} "
    f"to "
    f"{combined['Arrival_Date'].max()}"
)

print("\nDistricts:")

districts = sorted(
    combined["District"]
    .dropna()
    .astype(str)
    .unique()
)

for district in districts:
    print(f"  {district}")

print("\nCompleted successfully.")
