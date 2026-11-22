from __future__ import annotations

from math import asin, cos, radians, sin, sqrt


# Coordinates are the approximate public coordinates of the market town/APMC.
# Keeping them here avoids geocoding every market request and gives farmers a
# useful distance estimate even when the price dataset has no coordinate field.
KARNATAKA_MARKETS = (
    {"name": "Mangalore APMC", "district": "Dakshina Kannada", "latitude": 12.9141, "longitude": 74.8560, "aliases": ("Mangalore APMC", "Mangalore")},
    {"name": "Bantwal Market", "district": "Dakshina Kannada", "latitude": 12.8906, "longitude": 75.0347, "aliases": ("Bantwal Market", "Bantwal")},
    {"name": "Puttur Market", "district": "Dakshina Kannada", "latitude": 12.7598, "longitude": 75.0067, "aliases": ("Puttur Market", "Puttur")},
    {"name": "Udupi APMC", "district": "Udupi", "latitude": 13.3409, "longitude": 74.7421, "aliases": ("Udupi APMC", "Udupi")},
    {"name": "Kundapura APMC", "district": "Udupi", "latitude": 13.6293, "longitude": 74.6916, "aliases": ("Kundapura APMC", "Kundapura")},
    {"name": "Haveri APMC", "district": "Haveri", "latitude": 14.7950, "longitude": 75.3990, "aliases": ("Haveri APMC", "Haveri")},
    {"name": "Hanagal APMC", "district": "Haveri", "latitude": 14.7719, "longitude": 75.1245, "aliases": ("Hanagal APMC", "Hanagal")},
    {"name": "Honnali APMC", "district": "Davangere", "latitude": 14.2451, "longitude": 75.6453, "aliases": ("Honnali APMC", "Honnali")},
    {"name": "Channagiri APMC", "district": "Davangere", "latitude": 14.0234, "longitude": 75.9258, "aliases": ("Channagiri APMC", "Channagiri")},
    {"name": "Shikaripura APMC", "district": "Shivamogga", "latitude": 14.2698, "longitude": 75.3550, "aliases": ("Shikaripura APMC", "Shikaripura")},
    {"name": "Gangavathi APMC", "district": "Koppal", "latitude": 15.4315, "longitude": 76.5293, "aliases": ("Gangavathi APMC", "Gangavathi")},
    {"name": "Kanakagiri APMC", "district": "Koppal", "latitude": 15.1605, "longitude": 76.5658, "aliases": ("Kanakagiri APMC", "Kanakagiri")},
    {"name": "Kustagi APMC", "district": "Koppal", "latitude": 15.1160, "longitude": 76.1980, "aliases": ("Kustagi APMC", "Kustagi")},
    {"name": "H.B. Halli APMC", "district": "Vijayanagara", "latitude": 15.0960, "longitude": 75.6290, "aliases": ("H.B. Halli APMC", "H.B. Halli")},
    {"name": "Santhesargur APMC", "district": "Mysuru", "latitude": 12.3210, "longitude": 76.6830, "aliases": ("Santhesargur APMC", "Santhesargur")},
    {"name": "Hungund APMC", "district": "Bagalkot", "latitude": 16.0620, "longitude": 76.0580, "aliases": ("Hungund APMC", "Hungund")},
    {"name": "Kudchi APMC", "district": "Belagavi", "latitude": 16.6270, "longitude": 74.8540, "aliases": ("Kudchi APMC", "Kudchi")},
    {"name": "Haliyala APMC", "district": "Uttara Kannada", "latitude": 15.3280, "longitude": 74.7560, "aliases": ("Haliyala APMC", "Haliyala")},
)


def haversine_km(latitude: float, longitude: float, market: dict) -> float:
    earth_radius_km = 6371.0088
    lat1, lon1, lat2, lon2 = map(
        radians,
        (latitude, longitude, market["latitude"], market["longitude"]),
    )
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    value = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    )
    return earth_radius_km * 2 * asin(sqrt(value))


def nearest_markets(latitude: float, longitude: float, limit: int = 5) -> list[dict]:
    markets = []
    for market in KARNATAKA_MARKETS:
        markets.append(
            {
                **market,
                "distance_km": round(haversine_km(latitude, longitude, market), 1),
            }
        )
    return sorted(markets, key=lambda item: item["distance_km"])[:limit]


def market_aliases(market: dict) -> tuple[str, ...]:
    return tuple(alias.casefold() for alias in market["aliases"])
