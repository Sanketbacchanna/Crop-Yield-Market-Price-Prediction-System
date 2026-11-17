import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from ml.training_utils import (
    build_estimators,
    chronological_holdout,
    evaluate_candidates,
    prepare_price_training_frame,
    print_comparison,
    save_versioned_run,
    sha256_file,
)

DATASET_PATH = PROJECT_ROOT / "prepared_crop_price_data.csv"
FEATURE_COLUMNS = [
    "crop",
    "price_previous_month",
    "price_previous_2_months",
    "price_previous_3_months",
    "price_avg_previous_3_months",
]
TARGET_COLUMN = "target_next_month"


def main() -> None:
    source = pd.read_csv(DATASET_PATH)
    frame = prepare_price_training_frame(source)
    if frame.empty:
        raise ValueError("No price rows remain after creating next-month targets.")

    features = frame[FEATURE_COLUMNS]
    target = frame[TARGET_COLUMN]
    target_dates = frame["target_date"]
    train_indices, test_indices, cutoff = chronological_holdout(target_dates)

    print(
        f"Price dataset: {len(frame)} usable rows across "
        f"{frame['crop'].nunique()} crops; holdout begins {cutoff.date()}."
    )
    evaluation = evaluate_candidates(
        task="price",
        features=features,
        target=target,
        dates=target_dates,
        groups=frame["crop"],
        train_indices=train_indices,
        test_indices=test_indices,
        estimators=build_estimators(),
    )
    print(f"Cross-validation: {evaluation['cv_strategy']}")
    print_comparison(evaluation["comparison"])

    metadata = save_versioned_run(
        task="price",
        source_dataset=DATASET_PATH,
        dataset_sha256=sha256_file(DATASET_PATH),
        selected_model=evaluation["selected_model"],
        selected_pipeline=evaluation["selected_pipeline"],
        comparison=evaluation["comparison"],
        cv_strategy=evaluation["cv_strategy"],
        split_cutoff=cutoff,
        train_dates=target_dates.iloc[train_indices],
        test_dates=target_dates.iloc[test_indices],
        feature_columns=FEATURE_COLUMNS,
        target_name=TARGET_COLUMN,
    )
    print(f"Selected model: {metadata['selected_model']}")
    print(f"Model version: {metadata['model_version']}")
    print(f"Artifact ID: {metadata['artifact_id']}")
    print(f"Artifacts: {PROJECT_ROOT / 'ml' / 'artifacts' / 'price' / metadata['artifact_id']}")


if __name__ == "__main__":
    main()
