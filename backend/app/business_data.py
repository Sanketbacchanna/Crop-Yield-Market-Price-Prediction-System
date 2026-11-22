import csv
import math
import re
from collections import defaultdict
from pathlib import Path
from statistics import mean, pstdev


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRICE_DATASET_PATH = PROJECT_ROOT / "prepared_crop_price_data.csv"
YIELD_DATASET_PATH = PROJECT_ROOT / "ml" / "datasets" / "Crop_Yield_Cleaned.csv"
YIELD_DISTRICT_ALIASES = {
    "ballari": "bellary",
    "belagavi": "belgaum",
    "bengaluru rural": "bangalore rural",
    "chikkamagaluru": "chikmagalur",
    "dakshina kannada": "dakshin kannad",
    "kalaburagi": "gulbarga",
    "mysuru": "mysore",
    "shivamogga": "shimoga",
    "tumakuru": "tumkur",
    "uttara kannada": "uttar kannad",
    "vijayapura": "bijapur",
}


def get_historical_price_crops(dataset_path: Path = PRICE_DATASET_PATH) -> list[str]:
    with dataset_path.open(encoding="utf-8-sig", newline="") as dataset:
        crops = {
            (row.get("crop") or "").strip()
            for row in csv.DictReader(dataset)
            if (row.get("crop") or "").strip()
        }
    return sorted(crops, key=str.casefold)


def get_historical_prices(
    crop_name: str,
    dataset_path: Path = PRICE_DATASET_PATH,
) -> list[dict]:
    normalized_crop = crop_name.strip().casefold()
    if not normalized_crop:
        raise ValueError("Crop name cannot be empty.")

    observations = []
    with dataset_path.open(encoding="utf-8-sig", newline="") as dataset:
        for row in csv.DictReader(dataset):
            if (row.get("crop") or "").strip().casefold() != normalized_crop:
                continue
            try:
                price = float(row["p_modal"])
            except (KeyError, TypeError, ValueError):
                continue
            if not math.isfinite(price) or price < 0:
                continue
            observations.append(
                {
                    "date": row["t"],
                    "crop_name": row["crop"].strip(),
                    "modal_price": round(price, 2),
                }
            )
    observations.sort(key=lambda item: item["date"])
    return observations


def get_historical_yield(
    district: str,
    crop_name: str,
    dataset_path: Path = YIELD_DATASET_PATH,
    season: str | None = None,
) -> list[dict]:
    district_key = district.strip().casefold()
    normalized_district = YIELD_DISTRICT_ALIASES.get(district_key, district_key)
    normalized_crop = crop_name.strip().casefold()
    normalized_season = (season or "").strip().casefold()
    if not normalized_district or not normalized_crop:
        raise ValueError("District and crop are required.")

    totals = defaultdict(
        lambda: {
            "area": 0.0,
            "production": 0.0,
            "observations": 0,
            "district": district.strip(),
            "crop_name": crop_name.strip(),
            "season": season.strip() if season else "All seasons",
        }
    )
    with dataset_path.open(encoding="utf-8-sig", newline="") as dataset:
        for row in csv.DictReader(dataset):
            if (row.get("district") or "").strip().casefold() != normalized_district:
                continue
            if (row.get("crop") or "").strip().casefold() != normalized_crop:
                continue
            row_season = (row.get("season") or "").strip()
            if normalized_season and row_season.casefold() != normalized_season:
                continue

            match = re.match(r"\s*(\d{4})", row.get("crop_year") or "")
            if match is None:
                continue
            try:
                area = float(row["area"])
                crop_yield = float(row["yield"])
            except (KeyError, TypeError, ValueError):
                continue
            if (
                not math.isfinite(area)
                or not math.isfinite(crop_yield)
                or area <= 0
                or crop_yield < 0
            ):
                continue

            year = match.group(1)
            if totals[year]["observations"] == 0:
                totals[year]["district"] = (row.get("district") or "").strip()
                totals[year]["crop_name"] = (row.get("crop") or "").strip()
                if normalized_season:
                    totals[year]["season"] = row_season
            totals[year]["area"] += area
            totals[year]["production"] += area * crop_yield
            totals[year]["observations"] += 1

    return [
        {
            "district": values["district"],
            "crop_name": values["crop_name"],
            "season": values["season"],
            "crop_year": year,
            "yield": round(values["production"] / values["area"], 4),
            "area": round(values["area"], 2),
            "observations": values["observations"],
        }
        for year, values in sorted(totals.items())
    ]


def get_historical_crop_summaries(
    dataset_path: Path = YIELD_DATASET_PATH,
) -> list[dict]:
    """Aggregate Karnataka yield history without requiring farmer inputs."""
    observations = defaultdict(list)
    districts = defaultdict(set)

    with dataset_path.open(encoding="utf-8-sig", newline="") as dataset:
        for row in csv.DictReader(dataset):
            crop_name = (row.get("crop") or "").strip()
            try:
                crop_yield = float(row["yield"])
            except (KeyError, TypeError, ValueError):
                continue
            if not crop_name or not math.isfinite(crop_yield) or crop_yield < 0:
                continue

            key = crop_name.casefold()
            observations[key].append((crop_yield, crop_name))
            district = (row.get("district") or "").strip().casefold()
            if district:
                districts[key].add(district)

    return [
        {
            "crop_name": values[0][1] if values else key.title(),
            "historical_yield": round(mean([value[0] for value in values]), 4),
            "yield_stability": round(
                1 / (
                    1
                    + (
                        pstdev([value[0] for value in values])
                        / mean([value[0] for value in values])
                        if mean([value[0] for value in values])
                        else 0
                    )
                ),
                4,
            ),
            "historical_observations": len(values),
            "historical_districts": len(districts[key]),
        }
        for key, values in observations.items()
    ]
