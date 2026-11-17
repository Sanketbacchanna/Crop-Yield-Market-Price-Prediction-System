import numpy as np
import pandas as pd


def engineer_yield_features(frame: pd.DataFrame) -> pd.DataFrame:
    crop_year = (
        frame["crop_year"]
        .astype("string")
        .str.extract(r"(?P<year>\d{4})", expand=False)
    )
    area = pd.to_numeric(frame["area"], errors="coerce")

    return pd.DataFrame(
        {
            "district": frame["district"].astype("string").str.strip().str.casefold(),
            "crop": frame["crop"].astype("string").str.strip().str.casefold(),
            "season": frame["season"].astype("string").str.strip().str.casefold(),
            "crop_year_start": pd.to_numeric(crop_year, errors="coerce"),
            "area": area,
            "log_area": np.log1p(area.clip(lower=0)),
        },
        index=frame.index,
    )


def engineer_price_features(frame: pd.DataFrame) -> pd.DataFrame:
    latest = pd.to_numeric(frame["price_previous_month"], errors="coerce")
    previous = pd.to_numeric(frame["price_previous_2_months"], errors="coerce")
    older = pd.to_numeric(frame["price_previous_3_months"], errors="coerce")
    average = pd.to_numeric(frame["price_avg_previous_3_months"], errors="coerce")
    relative_momentum = (latest - older) / older.abs().clip(lower=1e-8)
    volatility = np.std(
        np.column_stack((latest.to_numpy(), previous.to_numpy(), older.to_numpy())),
        axis=1,
    )

    return pd.DataFrame(
        {
            "crop": frame["crop"].astype("string").str.strip().str.casefold(),
            "price_previous_month": latest,
            "price_previous_2_months": previous,
            "price_previous_3_months": older,
            "price_avg_previous_3_months": average,
            "momentum_1_month": latest - previous,
            "momentum_3_months": latest - older,
            "relative_momentum_3_months": relative_momentum,
            "price_volatility_3_months": volatility,
            "latest_vs_average": latest - average,
        },
        index=frame.index,
    )
