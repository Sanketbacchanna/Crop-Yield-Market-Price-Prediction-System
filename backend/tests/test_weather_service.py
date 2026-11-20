import app.services.weather_service as weather_service


def test_current_weather_uses_imd_before_open_meteo(monkeypatch):
    imd_conditions = {
        "temperature": 28.5,
        "humidity": 61,
        "rainfall": 0,
        "location": "Bengaluru",
        "source": "IMD",
    }
    monkeypatch.setenv("IMD_API_KEY", "test-key")
    monkeypatch.setattr(
        weather_service, "_imd_current", lambda latitude, longitude: imd_conditions
    )
    monkeypatch.setattr(
        weather_service,
        "_open_meteo_current",
        lambda latitude, longitude: (_ for _ in ()).throw(AssertionError()),
    )

    assert weather_service.get_current_weather(12.97, 77.59) is imd_conditions


def test_current_weather_falls_back_to_open_meteo_without_imd_key(monkeypatch):
    fallback_conditions = {
        "temperature": 29,
        "humidity": 60,
        "rainfall": 0,
        "location": "Current location",
        "source": "Open-Meteo",
    }
    monkeypatch.delenv("IMD_API_KEY", raising=False)
    monkeypatch.setattr(
        weather_service, "_open_meteo_current", lambda latitude, longitude: fallback_conditions
    )

    conditions = weather_service.get_current_weather(12.97, 77.59)

    assert conditions["source"] == "Open-Meteo"
    assert conditions["fallbackReason"] == "IMD_API_KEY is not configured."


def test_imd_forecast_normalizes_seven_days():
    forecast = weather_service._forecast_dates(
        {
            "Date": "2026-01-02",
            "Todays_Forecast_Max_Temp": "30",
            "Todays_Forecast_Min_temp": "19",
            "Todays_Forecast": "Partly cloudy",
            "Day_2_Max_Temp": "31",
            "Day_2_Min_temp": "20",
            "Day_2_Forecast": "Light rain",
        }
    )

    assert len(forecast) == 7
    assert forecast[0] == {
        "date": "2026-01-02",
        "max": 30,
        "min": 19,
        "description": "Partly cloudy",
    }
    assert forecast[1]["date"] == "2026-01-03"
    assert forecast[1]["description"] == "Light rain"


def test_imd_current_uses_nearest_mapped_station(monkeypatch):
    requests = []

    def fake_fetch_imd(path, params=None):
        requests.append((path, params))
        if path == "cityforecast_mapping":
            return [
                {
                    "Station_Code": "north",
                    "Station_Name": "North station",
                    "Latitude": "13.2",
                    "Longitude": "77.6",
                },
                {
                    "Station_Code": "south",
                    "Station_Name": "South station",
                    "Latitude": "12.9",
                    "Longitude": "77.6",
                },
            ]
        return [
            {
                "Station": "South station",
                "Temperature": "27.5",
                "Humidity": "70",
                "Last 24 hrs Rainfall": "2.4",
            }
        ]

    monkeypatch.setattr(weather_service, "_fetch_imd", fake_fetch_imd)

    conditions = weather_service._imd_current(12.91, 77.59)

    assert requests[1] == ("current_wx", {"id": "south"})
    assert conditions["temperature"] == 27.5
    assert conditions["rainfall"] == 2.4
    assert conditions["source"] == "IMD"


def test_weather_outlook_returns_district_alerts(monkeypatch):
    monkeypatch.setattr(
        weather_service,
        "_imd_forecast",
        lambda latitude, longitude: {
            "daily": {"time": []},
            "source": "IMD",
        },
    )
    monkeypatch.setattr(
        weather_service,
        "_district_record",
        lambda endpoint, district: {"District": district, "Day_1": "2"}
        if endpoint == "districtwarning"
        else {"District": district, "message": "Rain likely"},
    )

    outlook = weather_service.get_weather_outlook(12.97, 77.59, "Bengaluru Urban")

    assert outlook["source"] == "IMD"
    assert outlook["warnings"]["Day_1"] == "2"
    assert outlook["nowcast"]["message"] == "Rain likely"
