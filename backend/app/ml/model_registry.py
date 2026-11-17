import hashlib
import json
from pathlib import Path

import joblib

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_ROOT = PROJECT_ROOT / "ml" / "artifacts"
MODEL_ROOT = PROJECT_ROOT / "ml" / "saved_models"


def load_deployed_model(task: str, legacy_filename: str):
    pointer_path = MODEL_ROOT / f"{task}_latest.json"
    if not pointer_path.is_file():
        return joblib.load(MODEL_ROOT / legacy_filename)

    with pointer_path.open(encoding="utf-8") as pointer_file:
        pointer = json.load(pointer_file)

    task_artifact_root = (ARTIFACT_ROOT / task).resolve()
    model_path = (PROJECT_ROOT / pointer["model_path"]).resolve()
    try:
        model_path.relative_to(task_artifact_root)
    except ValueError as error:
        raise ValueError("The deployed model path is outside its version directory.") from error

    metadata_path = model_path.parent / "metadata.json"
    with metadata_path.open(encoding="utf-8") as metadata_file:
        metadata = json.load(metadata_file)

    if metadata["artifact_id"] != pointer["artifact_id"]:
        raise ValueError("The deployed model pointer and metadata do not match.")

    dataset_path = (model_path.parent / metadata["dataset_snapshot"]).resolve()
    try:
        dataset_path.relative_to(model_path.parent)
    except ValueError as error:
        raise ValueError("The dataset snapshot is outside its model version directory.") from error

    if not model_path.is_file() or not dataset_path.is_file():
        raise FileNotFoundError("The deployed model version is missing its model or dataset.")

    digest = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    if digest != metadata["dataset_sha256"]:
        raise ValueError("The deployed dataset snapshot does not match model metadata.")

    return joblib.load(model_path)
