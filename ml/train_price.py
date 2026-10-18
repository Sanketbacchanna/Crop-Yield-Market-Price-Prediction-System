
import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.impute import SimpleImputer

# Load prepared historical data
df = pd.read_csv("prepared_crop_price_data.csv")
df["t"] = pd.to_datetime(df["t"])

# Create next month's price as the prediction target
df = df.sort_values(["crop", "t"]).reset_index(drop=True)
df["target_next_month"] = df.groupby("crop")["p_modal"].shift(-1)

# Use only historical features available at prediction time
df["price_previous_2_months"] = (
    df.groupby("crop")["p_modal"].shift(2)
)

df["price_previous_3_months"] = (
    df.groupby("crop")["p_modal"].shift(3)
)

feature_columns = [
    "crop",
    "price_previous_month",
    "price_previous_2_months",
    "price_previous_3_months",
    "price_avg_previous_3_months",
]

# Remove rows without a target or enough historical features
model_df = df.dropna(
    subset=feature_columns + ["target_next_month"]
).copy()

# Split chronologically: older months for training, newer months for testing
split_date = pd.Timestamp("2021-01-01")
train_df = model_df[model_df["t"] < split_date]
test_df = model_df[model_df["t"] >= split_date]

X_train = train_df[feature_columns]
y_train = train_df["target_next_month"]

X_test = test_df[feature_columns]
y_test = test_df["target_next_month"]

# Encode crop type and fill any missing numeric features
preprocessor = ColumnTransformer(
    transformers=[
        ("crop", OneHotEncoder(handle_unknown="ignore"), ["crop"]),
        (
            "numeric",
            SimpleImputer(strategy="median"),
            feature_columns[1:],
        ),
    ]
)

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                random_state=42,
                min_samples_leaf=3,
            ),
        ),
    ]
)

model.fit(X_train, y_train)
predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
rmse = mean_squared_error(y_test, predictions) ** 0.5

print("Price prediction model trained successfully!")
print("Training rows:", len(train_df))
print("Testing rows:", len(test_df))
print(f"MAE: {mae:.2f}")
print(f"RMSE: {rmse:.2f}")

# Save the trained model
joblib.dump(model, "price_prediction_model.pkl")
print("Model saved to price_prediction_model.pkl")
