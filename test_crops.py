
import requests

url = "https://agmarknet.ceda.ashoka.edu.in/api/prices"

payload = {
    "state_id": 29,
    "commodity_id": 3,  # Rice
    "district_id": 0,   # All Karnataka districts
    "calculation_type": "m",
    "start_date": "2011-01-01",
    "end_date": "2023-12-31",
}

headers = {
    "User-Agent": "CropPredictionPortal/1.0",
    "Origin": "https://agmarknet.ceda.ashoka.edu.in",
    "Referer": "https://agmarknet.ceda.ashoka.edu.in/",
}

try:
    response = requests.post(
        url, json=payload, headers=headers, timeout=60
    )
    print("HTTP status:", response.status_code)
    response.raise_for_status()

    records = response.json().get("data", [])
    print("Total records:", len(records))

    if records:
        print("First record:", records[0])
        print("Last record:", records[-1])

except requests.RequestException as error:
    print("Request failed:", error)
    if getattr(error, "response", None) is not None:
        print(error.response.text[:500])
