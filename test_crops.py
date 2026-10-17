
import requests

url = "https://agmarknet.ceda.ashoka.edu.in/api/prices"

crops = {
    "Wheat": 1,
    "Rice": 3,
    "Maize": 4,
    "Cotton": 15,
    "Sugarcane": 150,
}

headers = {
    "User-Agent": "CropPredictionPortal/1.0",
    "Origin": "https://agmarknet.ceda.ashoka.edu.in",
    "Referer": "https://agmarknet.ceda.ashoka.edu.in/",
}

for crop, commodity_id in crops.items():
    params = {
        "state_id": 29,
        "commodity_id": commodity_id,
        "district_id": 0,
        "calculation_type": "d",
        "start_date": "2024-01-01",
        "end_date": "2024-01-31",
        "chart_type": "datadownload",
    }

    try:
        response = requests.post(
            url, json=params, headers=headers, timeout=60
        )
        response.raise_for_status()
        records = response.json().get("data", [])

        print(f"{crop}: {len(records)} records")

        if records:
            print("  State:", records[0].get("state_name"))
            print("  Sample:", records[0])

    except Exception as error:
        print(f"{crop}: ERROR - {error}")
