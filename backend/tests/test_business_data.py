import csv
import os

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("DB_PORT", "3306")

from fastapi.testclient import TestClient

from app.business_data import (
    get_historical_price_crops,
    get_historical_prices,
    get_historical_yield,
    get_historical_crop_summaries_for_location,
)
from app.main import app


client = TestClient(app)


def _write_csv(path, fieldnames, rows):
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_historical_prices_filter_case_insensitively_and_ignore_invalid_values(tmp_path):
    dataset = tmp_path / "prices.csv"
    _write_csv(
        dataset,
        ["t", "crop", "p_modal"],
        [
            {"t": "2024-02-01", "crop": "Rice", "p_modal": "20"},
            {"t": "2024-01-01", "crop": "Rice", "p_modal": "10"},
            {"t": "2024-03-01", "crop": "Rice", "p_modal": "NaN"},
            {"t": "2024-01-01", "crop": "Wheat", "p_modal": "30"},
        ],
    )

    assert get_historical_price_crops(dataset) == ["Rice", "Wheat"]
    assert get_historical_prices(" rice ", dataset) == [
        {"date": "2024-01-01", "crop_name": "Rice", "modal_price": 10.0},
        {"date": "2024-02-01", "crop_name": "Rice", "modal_price": 20.0},
    ]


def test_historical_yield_aggregates_area_weighted_district_values(tmp_path):
    dataset = tmp_path / "yield.csv"
    _write_csv(
        dataset,
        ["district", "crop", "crop_year", "area", "yield"],
        [
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2001-02",
                "area": "1",
                "yield": "2",
            },
            {
                "district": "Mysore",
                "crop": "Rice",
                "crop_year": "2001-02",
                "area": "3",
                "yield": "4",
            },
            {
                "district": "Mysore",
                "crop": "Rice",
                "crop_year": "2003-04",
                "area": "0",
                "yield": "100",
            },
            {
                "district": "Mysore",
                "crop": "Wheat",
                "crop_year": "2001-02",
                "area": "2",
                "yield": "20",
            },
        ],
    )

    assert get_historical_yield("Mysuru", "RICE", dataset) == [
        {
            "district": "MYSORE",
            "crop_name": "Rice",
            "season": "All seasons",
            "crop_year": "2001",
            "yield": 3.5,
            "area": 4.0,
            "observations": 2,
        }
    ]


def test_historical_yield_can_filter_by_season_and_keeps_area_weighting(tmp_path):
    dataset = tmp_path / "yield.csv"
    _write_csv(
        dataset,
        ["district", "crop", "crop_year", "season", "area", "yield"],
        [
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Kharif",
                "area": "1",
                "yield": "2",
            },
            {
                "district": "Mysore",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Kharif",
                "area": "3",
                "yield": "4",
            },
            {
                "district": "Mysore",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Rabi",
                "area": "2",
                "yield": "10",
            },
        ],
    )

    observations = get_historical_yield(
        "Mysuru",
        "Rice",
        dataset,
        season="kharif",
    )

    assert observations == [
        {
            "district": "MYSORE",
            "crop_name": "Rice",
            "season": "Kharif",
            "crop_year": "2001",
            "yield": 3.5,
            "area": 4.0,
            "observations": 2,
        }
    ]


def test_location_crop_summaries_use_district_season_and_area_weighted_years(tmp_path):
    dataset = tmp_path / "yield.csv"
    _write_csv(
        dataset,
        [
            "district",
            "crop",
            "crop_year",
            "season",
            "area",
            "yield",
            "production_unit",
        ],
        [
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Kharif",
                "area": "1",
                "yield": "2",
                "production_unit": "Tonnes",
            },
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Kharif",
                "area": "3",
                "yield": "4",
                "production_unit": "Tonnes",
            },
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2002-03",
                "season": "Kharif",
                "area": "2",
                "yield": "5",
                "production_unit": "Tonnes",
            },
            {
                "district": "MYSORE",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Rabi",
                "area": "2",
                "yield": "50",
                "production_unit": "Tonnes",
            },
            {
                "district": "BAGALKOT",
                "crop": "Rice",
                "crop_year": "2001-02",
                "season": "Kharif",
                "area": "2",
                "yield": "100",
                "production_unit": "Tonnes",
            },
        ],
    )

    summaries = get_historical_crop_summaries_for_location(
        "Mysuru",
        "kharif",
        dataset,
    )

    assert summaries == [
        {
            "crop_name": "Rice",
            "historical_yield": 4.25,
            "production_unit": "Tonnes",
            "latest_crop_year": "2002",
            "yield_stability": 0.85,
            "historical_observations": 3,
            "historical_years": 2,
        }
    ]


def test_historical_analytics_endpoints_serve_bundled_records_without_auth():
    price_crops = client.get("/price-prediction/historical/crops")
    assert price_crops.status_code == 200, price_crops.text
    assert price_crops.json() == ["Maize", "Rice", "Wheat"]

    price_history = client.get(
        "/price-prediction/historical",
        params={"crop_name": "Rice"},
    )
    assert price_history.status_code == 200, price_history.text
    assert len(price_history.json()) == 156
    assert price_history.json()[0]["date"] < price_history.json()[-1]["date"]

    yield_history = client.get(
        "/yield-prediction/historical",
        params={"district": "Bagalkot", "crop_name": "Arecanut"},
    )
    assert yield_history.status_code == 200, yield_history.text
    assert [item["crop_year"] for item in yield_history.json()] == ["2001", "2003"]
    assert {item["season"] for item in yield_history.json()} == {"All seasons"}

    seasonal_yield = client.get(
        "/yield-prediction/historical",
        params={
            "district": "Bagalkot",
            "crop_name": "Arecanut",
            "season": "Whole Year",
        },
    )
    assert seasonal_yield.status_code == 200, seasonal_yield.text
    assert {item["season"] for item in seasonal_yield.json()} == {"Whole Year"}
