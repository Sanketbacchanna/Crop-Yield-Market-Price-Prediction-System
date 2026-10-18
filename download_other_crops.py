
import time
import requests
import pandas as pd

URL = "https://agmarknet.ceda.ashoka.edu.in/api/prices"

CROPS = {
    "Wheat": 1,
    "Maize": 4,
    "Cotton": 15,
    "Sugarcane": 150,
}

HEADERS = {
    "User-Agent": "CropPredictionPortal/1.0",
    "Origin": "https://agmarknet.ceda.ashoka.edu.in",
    "Referer": "https://agmarknet.ceda.ashoka.edu.in/",
}

for crop, commodity_id in CROPS.items():
    print(f"\nDownloading {crop}...")

    payload = {
        "state_id": 29,
        "commodity_id": commodity_id,
        "district_id": 0,
        "calculation_type": "m",
        "start_date": "2011-01-01",
        "end_date": "2023-12-31",
    }

    saved = False

    for attempt in range(2):
        try:
            response = requests.post(
                URL,
                json=payload,
                headers=HEADERS,
                timeout=60,
            )

            if response.status_code == 429:
                print("Rate limit reached. Stop and try later.")
                break

            response.raise_for_status()
            records = response.json().get("data", [])

            if not records:
                print(f"{crop}: No data returned.")
                break

            df = pd.DataFrame(records)
            filename = f"karnataka_{crop.lower()}_monthly_2011_2023.csv"
            df.to_csv(filename, index=False)

            print(f"{crop}: Saved {len(df)} records to {filename}")
            saved = True
            break

        except requests.RequestException as error:
            print(f"{crop}: Request failed: {error}")
            if getattr(error, "response", None) is not None:
                print(error.response.text[:300])

            if attempt == 0:
                print("Waiting 60 seconds before one retry...")
                time.sleep(60)

    if not saved:
        print(f"{crop}: No new CSV saved.")

    # Pause between commodities
    time.sleep(60)
