import pandas as pd

INPUT_FILE = "ml/datasets/Crop_Yield.csv"
OUTPUT_FILE = "ml/datasets/Crop_Yield_Cleaned.csv"

# Load CSV WITHOUT assuming the first row is a header
df = pd.read_csv(INPUT_FILE, header=None)

print("Original shape:", df.shape)

# Assign proper column names
df.columns = [
    "state",
    "district",
    "crop",
    "crop_year",
    "season",
    "field_1",
    "area_unit",
    "area",
    "production_unit",
    "yield"
]

print("\n========== ORIGINAL DATA ==========")
print(df.head())

print("\nColumns:")
print(df.columns.tolist())

print("\nData types:")
print(df.dtypes)

# Convert numeric columns
df["area"] = pd.to_numeric(df["area"], errors="coerce")
df["yield"] = pd.to_numeric(df["yield"], errors="coerce")

# Remove rows where important values are missing
df = df.dropna(subset=["area", "yield"])

# Clean text
text_columns = [
    "state",
    "district",
    "crop",
    "crop_year",
    "season",
    "area_unit",
    "production_unit"
]

for column in text_columns:
    df[column] = df[column].astype(str).str.strip()

# Remove duplicates
df = df.drop_duplicates()

print("\n========== CLEANED DATA ==========")
print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\nMissing values:")
print(df.isnull().sum())

print("\nFirst 5 rows:")
print(df.head())

# Save
df.to_csv(OUTPUT_FILE, index=False)

print("\n===================================")
print("Cleaned dataset created:")
print(OUTPUT_FILE)
print("===================================")