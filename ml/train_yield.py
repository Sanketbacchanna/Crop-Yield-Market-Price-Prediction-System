import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

# ==========================================
# 1. LOAD CLEANED DATASET
# ==========================================

file_path = "ml/datasets/Crop_Yield_Cleaned.csv"

df = pd.read_csv(file_path)

print("Original dataset shape:", df.shape)

# ==========================================
# 2. SELECT ML FEATURES
# ==========================================

features = [
    "district",
    "crop",
    "crop_year",
    "season",
    "area"
]

target = "yield"

X = df[features]
y = df[target]

print("\nFeatures:")
print(X.head())

print("\nTarget:")
print(y.head())

# ==========================================
# 3. DEFINE COLUMNS
# ==========================================

categorical_features = [
    "district",
    "crop",
    "crop_year",
    "season"
]

numeric_features = [
    "area"
]

# ==========================================
# 4. PREPROCESSING
# ==========================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)

# ==========================================
# 5. RANDOM FOREST MODEL
# ==========================================

model = RandomForestRegressor(
    n_estimators=200,
    random_state=42
)

# ==========================================
# 6. CREATE PIPELINE
# ==========================================

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)

# ==========================================
# 7. TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)

print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))

# ==========================================
# 8. TRAIN MODEL
# ==========================================

print("\nTraining Random Forest...")

pipeline.fit(X_train, y_train)

print("Training completed.")

# ==========================================
# 9. PREDICTION
# ==========================================

y_pred = pipeline.predict(X_test)

# ==========================================
# 10. EVALUATION
# ==========================================

mae = mean_absolute_error(y_test, y_pred)
rmse = mean_squared_error(y_test, y_pred) ** 0.5
r2 = r2_score(y_test, y_pred)

print("\n========== MODEL RESULTS ==========")

print("MAE :", mae)
print("RMSE:", rmse)
print("R2  :", r2)

# ==========================================
# 11. SAVE MODEL
# ==========================================

os.makedirs("ml/saved_models", exist_ok=True)

model_path = "ml/saved_models/yield_model.pkl"

joblib.dump(pipeline, model_path)

print("\n===================================")
print("Model saved successfully:")
print(model_path)
print("===================================")