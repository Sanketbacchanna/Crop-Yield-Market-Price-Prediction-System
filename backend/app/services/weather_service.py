import json
import logging
import math
import os
from datetime import date, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


logger = logging.getLogger(__name__)
IMD_API_BASE = "https://api.imd.gov.in/api/v1"
OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast"


class WeatherProviderError(RuntimeError):
    pass


def _fetch_json(url: str, headers: dict[str, str] | None = None) -> object:
    request = Request(url, headers=headers or {})
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise WeatherProviderError("The weather provider request failed.") from error


def _fetch_imd(path: str, params: dict[str, str] | None = None) -> object:
    api_key = os.getenv("IMD_API_KEY", "").strip()
    if not api_key:
        raise WeatherProviderError("IMD_API_KEY is not configured.")

    url = f"{IMD_API_BASE}/{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    return _fetch_json(url, {"Authorization": f"Bearer {api_key}"})


def _records(payload: object) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []

    for key in ("data", "Data", "records", "results"):
        nested = payload.get(key)
        if isinstance(nested, list):
            return [item for item in nested if isinstance(item, dict)]
        if isinstance(nested, dict):
            return [nested]
    return [payload]


def _normalized_key(value: str) -> str:
    return "".join(character.lower() for character in value if character.isalnum())


def _field(record: dict, *names: str):
    normalized = {_normalized_key(str(key)): value for key, value in record.items()}
    for name in names:
        value = normalized.get(_normalized_key(name))
        if value not in (None, ""):
            return value
    return None


def _number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _nearest_station(latitude: float, longitude: float) -> dict:
    mapping = _records(_fetch_imd("cityforecast_mapping"))
    nearest = None
    nearest_distance = float("inf")

    for record in mapping:
        station_latitude = _number(
            _field(record, "Latitude", "lat", "station_latitude")
        )
        station_longitude = _number(
            _field(record, "Longitude", "lon", "lng", "station_longitude")
        )
        station_id = _field(
            record,
            "id",
            "Station_Code",
            "Station_Id",
            "city_id",
            "code",
        )
        if station_latitude is None or station_longitude is None or station_id is None:
            continue

        latitude_radians = math.radians(latitude)
        station_latitude_radians = math.radians(station_latitude)
        latitude_delta = math.radians(station_latitude - latitude)
        longitude_delta = math.radians(station_longitude - longitude)
        distance = 2 * math.asin(
            math.sqrt(
                math.sin(latitude_delta / 2) ** 2
                + math.cos(latitude_radians)
                * math.cos(station_latitude_radians)
                * math.sin(longitude_delta / 2) ** 2
            )
        )
        if distance < nearest_distance:
            nearest_distance = distance
            nearest = {
                "id": str(station_id),
                "name": str(
                    _field(record, "Station_Name", "Station", "name", "city")
                    or "IMD station"
                ),
            }

    if nearest is None:
        raise WeatherProviderError(
            "IMD has no mapped forecast station for this location."
        )
    return nearest


def _imd_current(latitude: float, longitude: float) -> dict:
    station = _nearest_station(latitude, longitude)
    payload = _fetch_imd("current_wx", {"id": station["id"]})
    records = _records(payload)
    record = records[0] if records else {}
    temperature = _number(_field(record, "Temperature", "temp"))
    if temperature is None:
        raise WeatherProviderError("IMD did not return a current temperature.")

    return {
        "temperature": temperature,
        "humidity": _number(_field(record, "Humidity", "Relative_Humidity")),
        "rainfall": _number(
            _field(record, "Last 24 hrs Rainfall", "Rainfall", "precipitation")
        ),
        "location": str(_field(record, "Station", "Station_Name") or station["name"]),
        "observedAt": " ".join(
            str(value)
            for value in (
                _field(record, "Date of Observation", "Date"),
                _field(record, "Time of Observation", "Time"),
            )
            if value
        )
        or None,
        "source": "IMD",
    }


def _open_meteo_current(latitude: float, longitude: float) -> dict:
    params = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "timezone": "Asia/Kolkata",
        }
    )
    payload = _fetch_json(f"{OPEN_METEO_API}?{params}")
    current = payload.get("current", {}) if isinstance(payload, dict) else {}
    if not current:
        raise WeatherProviderError("Open-Meteo did not return current conditions.")
    return {
        "temperature": _number(current.get("temperature_2m")),
        "humidity": _number(current.get("relative_humidity_2m")),
        "rainfall": _number(current.get("precipitation")),
        "location": "Current location",
        "observedAt": current.get("time"),
        "source": "Open-Meteo",
    }


def get_current_weather(latitude: float, longitude: float) -> dict:
    try:
        return _imd_current(latitude, longitude)
    except WeatherProviderError as error:
        logger.warning("IMD current weather unavailable; using Open-Meteo: %s", error)
        current = _open_meteo_current(latitude, longitude)
        current["fallbackReason"] = str(error)
        return current


def _forecast_dates(record: dict) -> list[dict]:
    start_date = None
    try:
        start_date = date.fromisoformat(str(_field(record, "Date"))[:10])
    except (TypeError, ValueError):
        start_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()

    daily = []
    for day_number in range(1, 8):
        prefix = "Todays" if day_number == 1 else f"Day_{day_number}"
        max_names = (
            ("Todays_Forecast_Max_Temp", "Today_Max_temp")
            if day_number == 1
            else (f"{prefix}_Max_Temp",)
        )
        min_names = (
            ("Todays_Forecast_Min_temp", "Today_Min_temp")
            if day_number == 1
            else (f"{prefix}_Min_temp", f"{prefix}_Min_Temp")
        )
        description_names = (
            ("Todays_Forecast",)
            if day_number == 1
            else (f"{prefix}_Forecast",)
        )
        daily.append(
            {
                "date": (start_date + timedelta(days=day_number - 1)).isoformat(),
                "max": _number(_field(record, *max_names)),
                "min": _number(_field(record, *min_names)),
                "description": _field(record, *description_names),
            }
        )
    return daily


def _imd_forecast(latitude: float, longitude: float) -> dict:
    station = _nearest_station(latitude, longitude)
    payload = _fetch_imd("cityforecastloc", {"id": station["id"]})
    records = _records(payload)
    if not records:
        raise WeatherProviderError("IMD did not return a forecast for this station.")

    days = _forecast_dates(records[0])
    return {
        "daily": {
            "time": [day["date"] for day in days],
            "precipitation_sum": [None] * len(days),
            "precipitation_probability_max": [None] * len(days),
            "temperature_2m_max": [day["max"] for day in days],
            "temperature_2m_min": [day["min"] for day in days],
            "weather_description": [day["description"] for day in days],
        },
        "location": station["name"],
        "source": "IMD",
    }


def _open_meteo_forecast(latitude: float, longitude: float) -> dict:
    params = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "daily": (
                "precipitation_sum,precipitation_probability_max,"
                "temperature_2m_max,temperature_2m_min"
            ),
            "forecast_days": 7,
            "timezone": "Asia/Kolkata",
        }
    )
    payload = _fetch_json(f"{OPEN_METEO_API}?{params}")
    if not isinstance(payload, dict) or not payload.get("daily"):
        raise WeatherProviderError("Open-Meteo did not return a daily forecast.")
    return {**payload, "source": "Open-Meteo"}


def _district_record(endpoint: str, district: str) -> dict | None:
    district_key = _normalized_key(district)
    for record in _records(_fetch_imd(endpoint)):
        record_district = _field(record, "District")
        if record_district and _normalized_key(str(record_district)) == district_key:
            return record
    return None


def get_weather_outlook(
    latitude: float, longitude: float, district: str | None = None
) -> dict:
    try:
        forecast = _imd_forecast(latitude, longitude)
        forecast_error = ""
    except WeatherProviderError as error:
        logger.warning("IMD forecast unavailable; using Open-Meteo: %s", error)
        forecast = _open_meteo_forecast(latitude, longitude)
        forecast_error = str(error)

    warnings = None
    nowcast = None
    warnings_error = ""
    nowcast_error = ""
    if district:
        try:
            warnings = _district_record("districtwarning", district)
            if warnings is None:
                warnings_error = "No IMD district warning was found for this location."
        except WeatherProviderError as error:
            warnings_error = str(error)
        try:
            nowcast = _district_record("districtnowcast", district)
            if nowcast is None:
                nowcast_error = "No IMD district nowcast was found for this location."
        except WeatherProviderError as error:
            nowcast_error = str(error)

    return {
        "forecast": forecast,
        "source": forecast["source"],
        "forecastError": forecast_error,
        "warnings": warnings,
        "nowcast": nowcast,
        "warningsError": warnings_error,
        "nowcastError": nowcast_error,
    }
