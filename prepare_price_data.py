
import pandas as pd

# Load the historical crop price dataset
df = pd.read_csv("karnataka_crop_prices_monthly_2011_2023.csv")

# Convert the month column to datetime
df["t"] = pd.to_datetime(df["t"], format="%Y-%m")

# Sort each crop's records chronologically
df = df.sort_values(["crop", "t"]).reset_index(drop=True)

# Select the fields needed for price forecasting
df = df[["t", "crop", "p_min", "p_max", "p_modal"]]

# Create previous-month price features for each crop
df["price_previous_month"] = (
    df.groupby("crop")["p_modal"].shift(1)
)

# Create previous-three-month average price
df["price_avg_previous_3_months"] = (
    df.groupby("crop")["p_modal"]
    .transform(lambda s: s.shift(1).rolling(3).mean())
)

# Save the prepared dataset
df.to_csv("prepared_crop_price_data.csv", index=False)

print("Prepared dataset saved successfully!")
print("Total rows:", len(df))
print("\nRows per crop:")
print(df.groupby("crop").size())
print("\nSample records:")
print(df.head(5).to_string(index=False))
print("\nMissing values in lag features:")
print(
    df[["price_previous_month", "price_avg_previous_3_months"]]
    .isnull()
    .sum()
)
