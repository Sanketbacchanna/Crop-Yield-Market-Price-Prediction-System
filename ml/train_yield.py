import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from ml.training_utils import (
    build_estimators,
    chronological_holdout,
    evaluate_candidates,
    print_comparison,
    save_versioned_run,
    sha256_file,
)

DATASET_PATH = PROJECT_ROOT / "ml" / "datasets" / "Crop_Yield_Cleaned.csv"
FEATURE_COLUMNS = ["district", "crop", "crop_year", "season", "area"]
TARGET_COLUMN = "yield"


def main() -> None:
    frame = pd.read_csv(DATASET_PATH)
    required_columns = set(FEATURE_COLUMNS + [TARGET_COLUMN])
    missing_columns = required_columns.difference(frame.columns)
    if missing_columns:
        raise ValueError(
            f"Yield dataset is missing columns: {', '.join(sorted(missing_columns))}"
        )

    frame = frame[FEATURE_COLUMNS + [TARGET_COLUMN]].copy()
    frame["yield"] = pd.to_numeric(frame["yield"], errors="coerce")
    frame["area"] = pd.to_numeric(frame["area"], errors="coerce")
    year_start = pd.to_numeric(
        frame["crop_year"].astype("string").str.extract(r"(\d{4})", expand=False),
        errors="coerce",
    )
    dates = pd.to_datetime(
        year_start.astype("Int64").astype("string") + "-01-01",
        errors="coerce",
    )
    valid_rows = (
        dates.notna()
        & frame["district"].notna()
        & frame["crop"].notna()
        & frame["season"].notna()
        & frame["area"].notna()
        & frame["yield"].notna()
        & np.isfinite(frame["area"])
        & np.isfinite(frame["yield"])
        & (frame["area"] > 0)
        & (frame["yield"] >= 0)
    )
    frame = frame.loc[valid_rows].reset_index(drop=True)
    dates = dates.loc[valid_rows].reset_index(drop=True)
    features = frame[FEATURE_COLUMNS]
    target = frame[TARGET_COLUMN]

    train_indices, test_indices, cutoff = chronological_holdout(dates)
    groups = (
        frame["district"].astype(str).str.casefold()
        + "::"
        + frame["crop"].astype(str).str.casefold()
        + "::"
        + frame["season"].astype(str).str.casefold()
    )

    unique_years = int(dates.nunique())
    warnings = []
    if unique_years < 6:
        warnings.append(
            f"Only {unique_years} crop years are available. The final holdout is "
            "chronological; model selection uses grouped CV because there are not "
            "enough training years for multi-fold temporal CV."
        )

    print(
        f"Yield dataset: {len(frame)} usable rows across {unique_years} crop years; "
        f"holdout begins {cutoff.date()}."
    )
    evaluation = evaluate_candidates(
        task="yield",
        features=features,
        target=target,
        dates=dates,
        groups=groups,
        train_indices=train_indices,
        test_indices=test_indices,
        estimators=build_estimators(),
    )
    print(f"Cross-validation: {evaluation['cv_strategy']}")
    print_comparison(evaluation["comparison"])

    metadata = save_versioned_run(
        task="yield",
        source_dataset=DATASET_PATH,
        dataset_sha256=sha256_file(DATASET_PATH),
        selected_model=evaluation["selected_model"],
        selected_pipeline=evaluation["selected_pipeline"],
        comparison=evaluation["comparison"],
        cv_strategy=evaluation["cv_strategy"],
        split_cutoff=cutoff,
        train_dates=dates.iloc[train_indices],
        test_dates=dates.iloc[test_indices],
        feature_columns=FEATURE_COLUMNS,
        target_name=TARGET_COLUMN,
        data_warnings=warnings,
    )
    print(f"Selected model: {metadata['selected_model']}")
    print(f"Model version: {metadata['model_version']}")
    print(f"Artifact ID: {metadata['artifact_id']}")
    print(f"Artifacts: {PROJECT_ROOT / 'ml' / 'artifacts' / 'yield' / metadata['artifact_id']}")


if __name__ == "__main__":
    main()
