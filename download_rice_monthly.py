
import time
import requests
import pandas as pd

url = "https://agmarknet.ceda.ashoka.edu.in/api/prices"

payload = {
    "state_id": 29,
    "commodity_id": 3,
    "district_id": 0,
    "calculation_type": "m",
    # "chart_type": "timeseries",
    "start_date": "2011-01-01",
    "end_date": "2023-12-31",
}

headers = {
    "User-Agent": "CropPredictionPortal/1.0",
    "Origin": "https://agmarknet.ceda.ashoka.edu.in",
    "Referer": "https://agmarknet.ceda.ashoka.edu.in/",
}

for attempt in range(3):
    try:
        response = requests.post(
            url, json=payload, headers=headers, timeout=60
        )

        if response.status_code == 429:
            wait = 60 * (attempt + 1)
            print(f"Rate limited. Waiting {wait} seconds...")
            time.sleep(wait)
            continue

        response.raise_for_status()
        records = response.json().get("data", [])

        if not records:
            print("No records returned.")
            break

        df = pd.DataFrame(records)
        df.to_csv("karnataka_rice_monthly_2011_2023.csv", index=False)

        print("Saved:", len(df), "records")
        print("File: karnataka_rice_monthly_2011_2023.csv")
        print("Date range:", df["t"].min(), "to", df["t"].max())
        break

    except requests.RequestException as error:
        print("Request failed:", error)

        if getattr(error, "response", None) is not None:
            print(error.response.text[:500])
        break
