import math
import os
import unittest

os.environ["PYTHONPATH"] = os.pathsep.join(
    filter(
        None,
        [
            os.environ.get("PYTHONPATH"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        ],
    )
)

from app.ml.price_predictor import predict_price
from app.ml.yield_predictor import predict_yield


class PredictorRealTimeInputTests(unittest.TestCase):
    def test_yield_predictor_accepts_runtime_values(self):
        predictions = [
            predict_yield("Bellary", "Rice", 2020, "Kharif", 100),
            predict_yield("BELLARY", "rice", "2018-19", "kharif", 150),
        ]

        for value in predictions:
            self.assertIsInstance(value, float)
            self.assertTrue(math.isfinite(value))

    def test_price_predictor_accepts_runtime_values(self):
        prediction = predict_price(
            "rice",
            price_previous_month=2800,
            price_previous_2_months=2750,
            price_previous_3_months=2700,
            price_avg_previous_3_months=2750,
        )

        self.assertIsInstance(prediction, float)
        self.assertTrue(math.isfinite(prediction))


if __name__ == "__main__":
    unittest.main()
