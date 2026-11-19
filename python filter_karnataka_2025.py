import pandas as pd

url = (
    "https://huggingface.co/datasets/"
    "DHIVAKARNAIDUSUNKARI/"
    "mandi-india-daily-prices-2001-2026/"
    "resolve/main/data/mandi_daily_by_year/"
    "mandi_daily_2025.parquet"
)

print("Downloading and reading 2025 dataset...")

df = pd.read_parquet(url)

print("Original rows:", len(df))

# Filter Karnataka
karnataka = df[
    df["State"].astype(str).str.strip().str.casefold()
    == "karnataka"
].copy()

print("Karnataka rows:", len(karnataka))

# Districts
print("\nDistricts:")

districts = sorted(
    karnataka["District"]
    .dropna()
    .astype(str)
    .str.strip()
    .unique()
)

for district in districts:
    print(district)

print("\nNumber of districts:", karnataka["District"].nunique())
print("Number of markets:", karnataka["Market"].nunique())
print("Number of commodities:", karnataka["Commodity"].nunique())

# Date range
print(
    "\nDate range:",
    karnataka["Arrival_Date"].min(),
    "to",
    karnataka["Arrival_Date"].max()
)

# Save Karnataka data
output_file = "karnataka_2025_mandi_prices.csv"

karnataka.to_csv(output_file, index=False)

print("\nSaved successfully:")
print(output_file)

# Check Raichur + Rice
raichur_rice = karnataka[
    (karnataka["District"].astype(str).str.casefold() == "raichur")
    &
    (karnataka["Commodity"].astype(str).str.casefold() == "rice")
]

print("\nRaichur + Rice records:")

print(raichur_rice.to_string(index=False))