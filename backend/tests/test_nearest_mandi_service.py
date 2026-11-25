from app.services.nearest_mandi_service import nearest_markets


def test_vamanjoor_distance_uses_mangaluru_apmc_location():
    markets = nearest_markets(12.9169819, 74.9005045)

    mangalore = next(item for item in markets if item["name"] == "Mangalore APMC")

    # This is the straight-line distance to the Baikampady APMC yard, not the
    # old distance to central Mangaluru.
    assert mangalore["distance_km"] == 10.8


def test_nearest_markets_remains_sorted_by_distance():
    markets = nearest_markets(12.9169819, 74.9005045)

    distances = [item["distance_km"] for item in markets]

    assert distances == sorted(distances)
