import hashlib
import json

import joblib
import pytest
import pandas as pd

from app.ml import model_registry
from app.ml.model_features import engineer_price_features, engineer_yield_features
from ml.training_utils import (
    chronological_holdout,
    cross_validation_folds,
    prepare_price_training_frame,
)


def test_yield_feature_engineering_extracts_year_and_skewed_area():
    features = engineer_yield_features(
        pd.DataFrame(
            {
                "district": ["BAGALKOT"],
                "crop": ["Arecanut"],
                "crop_year": ["2001-02"],
                "season": ["Whole Year"],
                "area": [6.0],
            }
        )
    )

    assert features.loc[0, "district"] == "bagalkot"
    assert features.loc[0, "crop_year_start"] == 2001
    assert features.loc[0, "log_area"] == pytest.approx(1.945910149)


def test_price_training_features_align_history_to_next_month_target():
    source = pd.DataFrame(
        {
            "t": pd.date_range("2024-01-01", periods=5, freq="MS"),
            "crop": ["Rice"] * 5,
            "p_modal": [10, 20, 30, 40, 50],
        }
    )

    frame = prepare_price_training_frame(source)
    first = frame.iloc[0]

    assert first["price_previous_month"] == 30
    assert first["price_previous_2_months"] == 20
    assert first["price_previous_3_months"] == 10
    assert first["price_avg_previous_3_months"] == 20
    assert first["target_next_month"] == 40
    assert first["target_date"] == pd.Timestamp("2024-04-01")


def test_price_feature_engineering_adds_momentum_and_volatility():
    features = engineer_price_features(
        pd.DataFrame(
            {
                "crop": ["Rice"],
                "price_previous_month": [30.0],
                "price_previous_2_months": [20.0],
                "price_previous_3_months": [10.0],
                "price_avg_previous_3_months": [20.0],
            }
        )
    )

    assert features.loc[0, "momentum_1_month"] == 10
    assert features.loc[0, "momentum_3_months"] == 20
    assert features.loc[0, "relative_momentum_3_months"] == 2
    assert features.loc[0, "latest_vs_average"] == 10


def test_chronological_holdout_and_cv_do_not_mix_future_dates():
    dates = pd.Series(pd.date_range("2020-01-01", periods=12, freq="MS"))
    train_indices, test_indices, cutoff = chronological_holdout(dates)

    assert dates.iloc[train_indices].max() < cutoff
    assert dates.iloc[test_indices].min() == cutoff

    folds, strategy = cross_validation_folds(dates.iloc[train_indices])
    assert "TimeSeriesSplit" in strategy
    assert len(folds) >= 2
    for fold_train, fold_validation in folds:
        fold_dates = dates.iloc[train_indices].reset_index(drop=True)
        assert fold_dates.iloc[fold_train].max() < fold_dates.iloc[fold_validation].min()


def test_short_yield_history_uses_grouped_cv_and_reports_the_limitation():
    dates = pd.Series(
        pd.to_datetime(
            [
                "2001-01-01",
                "2001-01-01",
                "2002-01-01",
                "2002-01-01",
            ]
        )
    )
    groups = pd.Series(["a", "b", "c", "d"])

    folds, strategy = cross_validation_folds(dates, groups)

    assert "GroupKFold" in strategy
    assert "only 2 training dates" in strategy
    assert len(folds) == 4
    for fold_train, fold_validation in folds:
        assert set(groups.iloc[fold_train]).isdisjoint(groups.iloc[fold_validation])


def test_versioned_model_loader_verifies_dataset_pairing(tmp_path, monkeypatch):
    task = "yield"
    artifact_id = "yield-test-version"
    version_dir = tmp_path / "ml" / "artifacts" / task / artifact_id
    model_root = tmp_path / "ml" / "saved_models"
    version_dir.mkdir(parents=True)
    model_root.mkdir(parents=True)
    dataset_path = version_dir / "dataset.csv"
    dataset_path.write_bytes(b"versioned dataset")
    model_path = version_dir / "model.joblib"
    joblib.dump({"model": "ready"}, model_path)
    dataset_sha256 = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    (version_dir / "metadata.json").write_text(
        json.dumps(
            {
                "artifact_id": artifact_id,
                "dataset_snapshot": dataset_path.name,
                "dataset_sha256": dataset_sha256,
            }
        ),
        encoding="utf-8",
    )
    (model_root / "yield_latest.json").write_text(
        json.dumps(
            {
                "artifact_id": artifact_id,
                "model_path": "ml/artifacts/yield/yield-test-version/model.joblib",
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(model_registry, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(
        model_registry,
        "ARTIFACT_ROOT",
        tmp_path / "ml" / "artifacts",
    )
    monkeypatch.setattr(
        model_registry,
        "MODEL_ROOT",
        model_root,
    )

    assert model_registry.load_deployed_model(task, "legacy.joblib") == {
        "model": "ready"
    }

    dataset_path.write_bytes(b"changed dataset")
    with pytest.raises(ValueError, match="does not match model metadata"):
        model_registry.load_deployed_model(task, "legacy.joblib")
