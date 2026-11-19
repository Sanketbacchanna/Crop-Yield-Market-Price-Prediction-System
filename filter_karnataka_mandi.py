import pandas as pd
import requests
from pathlib import Path


BASE_URL = (
    "https://huggingface.co/datasets/"
    "DHIVAKARNAIDUSUNKARI/"
    "mandi-india-daily-prices-2001-2026/"
    "resolve/main/data/mandi_daily_by_year/"
)

OUTPUT_DIR = Path("ml/datasets")
OUTPUT_FILE = OUTPUT_DIR / "karnataka_historical_mandi_prices.csv"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


columns = [
    "State",
    "District",
    "Market",
    "Commodity",
    "Variety",
    "Grade",
    "Arrival_Date",
    "Min_Price",
    "Max_Price",
    "Modal_Price",
    "Commodity_Code",
]


first_file = True

for year in range(2001, 2027):

    filename = f"mandi_daily_{year}.parquet"
    url = BASE_URL + filename

    print("=" * 60)
    print(f"Processing {year}")
    print("=" * 60)

    local_file = OUTPUT_DIR / filename

    if not local_file.exists():

        print(f"Downloading {filename}...")

        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(local_file, "wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)

        print("Download completed.")

    print("Reading Karnataka records...")

    df = pd.read_parquet(
        local_file,
        columns=columns,
        filters=[
            ("State", "==", "Karnataka")
        ],
    )

    print(f"Karnataka records found: {len(df):,}")

    if len(df) == 0:
        continue

    df["Arrival_Date"] = pd.to_datetime(
        df["Arrival_Date"],
        errors="coerce"
    )

    df = df.dropna(subset=["Arrival_Date"])

    df.to_csv(
        OUTPUT_FILE,
        mode="w" if first_file else "a",
        header=first_file,
        index=False,
    )

    first_file = False

    print(f"Saved {year} Karnataka records.")


print()
print("=" * 60)
print("DONE")
print("=" * 60)
print(f"Output: {OUTPUT_FILE}")