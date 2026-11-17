import hashlib
import importlib.metadata
import json
import os
import platform
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
MODEL_ROOT = PROJECT_ROOT / "ml" / "saved_models"
ARTIFACT_ROOT = PROJECT_ROOT / "ml" / "artifacts"
MODEL_VERSION = "1.0.0"
METADATA_SCHEMA_VERSION = "1.0.0"

YIELD_CATEGORICAL_FEATURES = ["district", "crop", "season"]
YIELD_NUMERIC_FEATURES = ["crop_year_start", "area", "log_area"]
PRICE_CATEGORICAL_FEATURES = ["crop"]
PRICE_NUMERIC_FEATURES = [
    "price_previous_month",
    "price_previous_2_months",
    "price_previous_3_months",
    "price_avg_previous_3_months",
    "momentum_1_month",
    "momentum_3_months",
    "relative_momentum_3_months",
    "price_volatility_3_months",
    "latest_vs_average",
]


def build_estimators() -> dict[str, Callable[[], object]]:
    try:
        from catboost import CatBoostRegressor
        from lightgbm import LGBMRegressor
        from xgboost import XGBRegressor
    except ImportError as error:
        raise RuntimeError(
            "All four candidate libraries are required. Install them with "
            "`python -m pip install -r ml/requirements.txt`."
        ) from error

    return {
        "RandomForest": lambda: RandomForestRegressor(
            n_estimators=300,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        ),
        "XGBoost": lambda: XGBRegressor(
            objective="reg:squarederror",
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        ),
        "LightGBM": lambda: LGBMRegressor(
            objective="regression",
            n_estimators=300,
            max_depth=-1,
            num_leaves=31,
            learning_rate=0.05,
            random_state=42,
            n_jobs=-1,
            verbosity=-1,
        ),
        "CatBoost": lambda: CatBoostRegressor(
            loss_function="RMSE",
            iterations=300,
            depth=6,
            learning_rate=0.05,
            random_seed=42,
            thread_count=-1,
            verbose=False,
            allow_writing_files=False,
        ),
    }


def build_pipeline(task: str, estimator) -> Pipeline:
    if task == "yield":
        from app.ml.model_features import engineer_yield_features

        categorical_features = YIELD_CATEGORICAL_FEATURES
        numeric_features = YIELD_NUMERIC_FEATURES
        engineer_features = engineer_yield_features
    elif task == "price":
        from app.ml.model_features import engineer_price_features

        categorical_features = PRICE_CATEGORICAL_FEATURES
        numeric_features = PRICE_NUMERIC_FEATURES
        engineer_features = engineer_price_features
    else:
        raise ValueError(f"Unsupported model task: {task}")

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                categorical_features,
            ),
            (
                "numeric",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))]),
                numeric_features,
            ),
        ],
        remainder="drop",
    )
    return Pipeline(
        steps=[
            (
                "feature_engineering",
                FunctionTransformer(engineer_features, validate=False),
            ),
            ("preprocessor", preprocessor),
            ("regressor", estimator),
        ]
    )


def chronological_holdout(
    dates: pd.Series,
    test_fraction: float = 0.2,
) -> tuple[np.ndarray, np.ndarray, pd.Timestamp]:
    normalized_dates = pd.to_datetime(dates, errors="coerce").reset_index(drop=True)
    if normalized_dates.isna().any():
        raise ValueError("The training dataset contains missing or invalid dates.")

    unique_dates = np.sort(normalized_dates.unique())
    if len(unique_dates) < 3:
        raise ValueError(
            "At least three distinct date periods are required for a chronological "
            "train/test split."
        )

    first_test_period = max(1, int(len(unique_dates) * (1 - test_fraction)))
    first_test_period = min(first_test_period, len(unique_dates) - 1)
    cutoff = pd.Timestamp(unique_dates[first_test_period])
    train_indices = np.flatnonzero((normalized_dates < cutoff).to_numpy())
    test_indices = np.flatnonzero((normalized_dates >= cutoff).to_numpy())

    if not len(train_indices) or not len(test_indices):
        raise ValueError("The chronological split produced an empty partition.")
    return train_indices, test_indices, cutoff


def cross_validation_folds(
    dates: pd.Series,
    groups: Optional[pd.Series] = None,
) -> tuple[list[tuple[np.ndarray, np.ndarray]], str]:
    normalized_dates = pd.to_datetime(dates, errors="coerce").reset_index(drop=True)
    unique_dates = np.sort(normalized_dates.dropna().unique())

    if len(unique_dates) >= 4:
        splitter = TimeSeriesSplit(n_splits=min(5, len(unique_dates) - 2))
        date_folds = []
        for train_date_indices, validation_date_indices in splitter.split(unique_dates):
            train_dates = unique_dates[train_date_indices]
            validation_dates = unique_dates[validation_date_indices]
            train_indices = np.flatnonzero(normalized_dates.isin(train_dates).to_numpy())
            validation_indices = np.flatnonzero(
                normalized_dates.isin(validation_dates).to_numpy()
            )
            date_folds.append((train_indices, validation_indices))
        return date_folds, f"TimeSeriesSplit over {len(unique_dates)} distinct dates"

    if groups is None:
        raise ValueError(
            "There are too few training dates for temporal cross-validation and no "
            "safe grouping column was provided."
        )

    normalized_groups = groups.reset_index(drop=True).fillna("unknown").astype(str)
    group_count = normalized_groups.nunique()
    if group_count < 2:
        raise ValueError(
            "There are too few training dates and distinct groups for cross-validation."
        )
    splitter = GroupKFold(n_splits=min(5, group_count))
    folds = [
        (train_indices, validation_indices)
        for train_indices, validation_indices in splitter.split(
            np.zeros(len(normalized_dates)),
            groups=normalized_groups,
        )
    ]
    return folds, (
        f"GroupKFold over {group_count} groups; temporal CV unavailable because "
        f"only {len(unique_dates)} training dates are present"
    )


def prepare_price_training_frame(source: pd.DataFrame) -> pd.DataFrame:
    required = {"t", "crop", "p_modal"}
    missing = required.difference(source.columns)
    if missing:
        raise ValueError(f"Price dataset is missing columns: {', '.join(sorted(missing))}")

    frame = source[["t", "crop", "p_modal"]].copy()
    frame["t"] = pd.to_datetime(frame["t"], errors="coerce")
    frame["p_modal"] = pd.to_numeric(frame["p_modal"], errors="coerce")
    frame["crop"] = frame["crop"].astype("string").str.strip()
    frame = frame.dropna(subset=["t", "crop", "p_modal"])
    frame = frame.sort_values(["crop", "t"]).reset_index(drop=True)

    grouped_prices = frame.groupby("crop", sort=False)["p_modal"]
    frame["price_previous_month"] = frame["p_modal"]
    frame["price_previous_2_months"] = grouped_prices.shift(1)
    frame["price_previous_3_months"] = grouped_prices.shift(2)
    frame["price_avg_previous_3_months"] = grouped_prices.transform(
        lambda values: values.rolling(window=3, min_periods=3).mean()
    )
    frame["target_next_month"] = grouped_prices.shift(-1)
    frame["target_date"] = frame.groupby("crop", sort=False)["t"].shift(-1)

    required_features = [
        "price_previous_month",
        "price_previous_2_months",
        "price_previous_3_months",
        "price_avg_previous_3_months",
        "target_next_month",
        "target_date",
    ]
    return frame.dropna(subset=required_features).reset_index(drop=True)


def regression_metrics(actual, predicted) -> dict[str, float]:
    metrics = {
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(mean_squared_error(actual, predicted) ** 0.5),
    }
    if len(actual) > 1:
        metrics["r2"] = float(r2_score(actual, predicted))
    return metrics


def evaluate_candidates(
    task: str,
    features: pd.DataFrame,
    target: pd.Series,
    dates: pd.Series,
    groups: Optional[pd.Series],
    train_indices: np.ndarray,
    test_indices: np.ndarray,
    estimators: dict[str, Callable[[], object]],
) -> dict:
    training_dates = dates.iloc[train_indices].reset_index(drop=True)
    training_groups = groups.iloc[train_indices].reset_index(drop=True) if groups is not None else None
    folds, cv_strategy = cross_validation_folds(training_dates, training_groups)
    comparison = {}

    for name, estimator_factory in estimators.items():
        fold_metrics = []
        for fold_train, fold_validation in folds:
            fold_train_indices = train_indices[fold_train]
            fold_validation_indices = train_indices[fold_validation]
            pipeline = build_pipeline(task, estimator_factory())
            pipeline.fit(
                features.iloc[fold_train_indices],
                target.iloc[fold_train_indices],
            )
            prediction = pipeline.predict(features.iloc[fold_validation_indices])
            fold_metrics.append(
                regression_metrics(
                    target.iloc[fold_validation_indices],
                    prediction,
                )
            )

        train_pipeline = build_pipeline(task, estimator_factory())
        train_pipeline.fit(features.iloc[train_indices], target.iloc[train_indices])
        holdout_prediction = train_pipeline.predict(features.iloc[test_indices])
        candidate = estimator_factory()

        comparison[name] = {
            "parameters": candidate.get_params(deep=False),
            "cv_fold_count": len(fold_metrics),
            "cv_rmse_mean": float(np.mean([metric["rmse"] for metric in fold_metrics])),
            "cv_rmse_std": float(np.std([metric["rmse"] for metric in fold_metrics])),
            "cv_mae_mean": float(np.mean([metric["mae"] for metric in fold_metrics])),
            "holdout": regression_metrics(
                target.iloc[test_indices],
                holdout_prediction,
            ),
        }

    selected_name = min(
        comparison,
        key=lambda name: comparison[name]["cv_rmse_mean"],
    )
    selected_pipeline = build_pipeline(task, estimators[selected_name]())
    selected_pipeline.fit(features, target)

    return {
        "selected_model": selected_name,
        "selected_pipeline": selected_pipeline,
        "cv_strategy": cv_strategy,
        "comparison": comparison,
    }


def _package_version(package_name: str) -> str:
    try:
        return importlib.metadata.version(package_name)
    except importlib.metadata.PackageNotFoundError:
        return "not-installed"


def _json_default(value):
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return str(value)


def save_versioned_run(
    task: str,
    source_dataset: Path,
    dataset_sha256: str,
    selected_model: str,
    selected_pipeline: Pipeline,
    comparison: dict,
    cv_strategy: str,
    split_cutoff: pd.Timestamp,
    train_dates: pd.Series,
    test_dates: pd.Series,
    feature_columns: list[str],
    target_name: str,
    data_warnings: Optional[list[str]] = None,
) -> dict:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    artifact_id = f"{task}-{timestamp}-{dataset_sha256[:12]}-{uuid.uuid4().hex[:8]}"
    version_dir = ARTIFACT_ROOT / task / artifact_id
    version_dir.mkdir(parents=True, exist_ok=False)

    dataset_snapshot = version_dir / source_dataset.name
    shutil.copy2(source_dataset, dataset_snapshot)
    if hashlib.sha256(dataset_snapshot.read_bytes()).hexdigest() != dataset_sha256:
        raise ValueError("The copied dataset does not match its source checksum.")

    model_path = version_dir / "model.joblib"
    import joblib

    joblib.dump(selected_pipeline, model_path)
    estimator = selected_pipeline.named_steps["regressor"]
    metadata = {
        "task": task,
        "model_version": MODEL_VERSION,
        "metadata_schema_version": METADATA_SCHEMA_VERSION,
        "artifact_id": artifact_id,
        "selected_model": selected_model,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_name": source_dataset.name,
        "dataset_sha256": dataset_sha256,
        "dataset_snapshot": dataset_snapshot.name,
        "dataset_rows": int(len(train_dates) + len(test_dates)),
        "date_split": {
            "method": "chronological 80/20 split by target date",
            "first_test_date": split_cutoff.isoformat(),
            "train_date_min": pd.Timestamp(train_dates.min()).isoformat(),
            "train_date_max": pd.Timestamp(train_dates.max()).isoformat(),
            "test_date_min": pd.Timestamp(test_dates.min()).isoformat(),
            "test_date_max": pd.Timestamp(test_dates.max()).isoformat(),
        },
        "cross_validation": {
            "strategy": cv_strategy,
            "fold_count": next(iter(comparison.values()))["cv_fold_count"],
        },
        "feature_columns": feature_columns,
        "target": target_name,
        "selected_model_parameters": estimator.get_params(deep=False),
        "model_file": model_path.name,
        "metrics": comparison,
        "data_warnings": data_warnings or [],
        "package_versions": {
            "python": platform.python_version(),
            "pandas": _package_version("pandas"),
            "scikit-learn": _package_version("scikit-learn"),
            "mlflow": _package_version("mlflow"),
            "xgboost": _package_version("xgboost"),
            "lightgbm": _package_version("lightgbm"),
            "catboost": _package_version("catboost"),
        },
    }

    import mlflow
    import mlflow.sklearn

    tracking_uri = os.getenv("MLFLOW_TRACKING_URI")
    use_local_artifact_store = tracking_uri is None
    if tracking_uri is None:
        tracking_database = (PROJECT_ROOT / "ml" / "mlflow.db").resolve()
        tracking_uri = f"sqlite:///{tracking_database.as_posix()}"
    mlflow.set_tracking_uri(tracking_uri)
    artifact_location = (
        PROJECT_ROOT / "ml" / "mlartifacts" / task
    ).resolve().as_uri()
    experiment_name = f"agripredict-{task}"
    experiment = mlflow.get_experiment_by_name(experiment_name)
    if experiment is None:
        experiment_id = mlflow.create_experiment(
            experiment_name,
            artifact_location=artifact_location if use_local_artifact_store else None,
        )
    else:
        experiment_id = experiment.experiment_id
    mlflow.set_experiment(experiment_id=experiment_id)

    comparison_path = version_dir / "comparison.json"
    comparison_path.write_text(
        json.dumps(comparison, indent=2, default=_json_default),
        encoding="utf-8",
    )
    metadata_path = version_dir / "metadata.json"

    with mlflow.start_run(run_name=artifact_id) as run:
        metadata["mlflow"] = {
            "tracking_uri": tracking_uri,
            "experiment_id": run.info.experiment_id,
            "run_id": run.info.run_id,
        }
        metadata_path.write_text(
            json.dumps(metadata, indent=2, default=_json_default),
            encoding="utf-8",
        )

        mlflow.set_tags(
            {
                "task": task,
                "model_version": MODEL_VERSION,
                "artifact_id": artifact_id,
                "selected_model": selected_model,
                "dataset_sha256": dataset_sha256,
                "cv_strategy": cv_strategy,
            }
        )
        mlflow.log_params(
            {
                "dataset_name": source_dataset.name,
                "dataset_sha256": dataset_sha256,
                "selected_model": selected_model,
                "model_version": MODEL_VERSION,
                "artifact_id": artifact_id,
                "date_split_cutoff": split_cutoff.date().isoformat(),
            }
        )
        for model_name, results in comparison.items():
            mlflow.log_metrics(
                {
                    f"{model_name}_cv_rmse": results["cv_rmse_mean"],
                    f"{model_name}_holdout_rmse": results["holdout"]["rmse"],
                    f"{model_name}_holdout_mae": results["holdout"]["mae"],
                }
            )
        mlflow.log_artifact(str(dataset_snapshot), artifact_path="dataset")
        mlflow.log_artifact(str(metadata_path), artifact_path="metadata")
        mlflow.log_artifact(str(comparison_path), artifact_path="metadata")
        mlflow.sklearn.log_model(
            selected_pipeline,
            name="model",
            serialization_format="pickle",
        )

    pointer_path = MODEL_ROOT / f"{task}_latest.json"
    pointer_path.parent.mkdir(parents=True, exist_ok=True)
    pointer_tmp = pointer_path.with_suffix(".json.tmp")
    pointer_tmp.write_text(
        json.dumps(
            {
                "model_version": MODEL_VERSION,
                "artifact_id": artifact_id,
                "model_path": str(model_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "metadata_path": str(metadata_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "dataset_sha256": dataset_sha256,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    pointer_tmp.replace(pointer_path)
    return metadata


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def print_comparison(comparison: dict) -> None:
    for name, result in sorted(
        comparison.items(),
        key=lambda item: item[1]["cv_rmse_mean"],
    ):
        holdout = result["holdout"]
        print(
            f"{name:12} CV RMSE={result['cv_rmse_mean']:.4f} "
            f"(+/- {result['cv_rmse_std']:.4f}) | "
            f"holdout RMSE={holdout['rmse']:.4f} "
            f"MAE={holdout['mae']:.4f}"
        )
