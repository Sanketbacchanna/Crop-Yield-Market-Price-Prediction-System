
import { useState } from "react";

function App() {
  const [cropId, setCropId] = useState("1");
  const [prices, setPrices] = useState({
    previousMonth: "2800",
    previousTwoMonths: "2750",
    previousThreeMonths: "2700",
    averagePrice: "2750",
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePriceChange(event) {
    setPrices({
      ...prices,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const params = new URLSearchParams({
        user_id: "1",
        crop_id: cropId,
        price_previous_month: prices.previousMonth,
        price_previous_2_months: prices.previousTwoMonths,
        price_previous_3_months: prices.previousThreeMonths,
        price_avg_previous_3_months: prices.averagePrice,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/price-prediction/forecast?${params}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || data)
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to connect to the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Crop Recommendation Portal</h1>
      <p>Predict the next month's crop market price.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="crop">Select crop</label>
        <select
          id="crop"
          value={cropId}
          onChange={(event) => setCropId(event.target.value)}
        >
          <option value="1">Rice</option>
          <option value="2">Wheat</option>
          <option value="3">Maize</option>
        </select>

        <label htmlFor="previousMonth">Price previous month (₹)</label>
        <input
          id="previousMonth"
          name="previousMonth"
          type="number"
          min="0"
          step="any"
          value={prices.previousMonth}
          onChange={handlePriceChange}
          required
        />

        <label htmlFor="previousTwoMonths">
          Price two months ago (₹)
        </label>
        <input
          id="previousTwoMonths"
          name="previousTwoMonths"
          type="number"
          min="0"
          step="any"
          value={prices.previousTwoMonths}
          onChange={handlePriceChange}
          required
        />

        <label htmlFor="previousThreeMonths">
          Price three months ago (₹)
        </label>
        <input
          id="previousThreeMonths"
          name="previousThreeMonths"
          type="number"
          min="0"
          step="any"
          value={prices.previousThreeMonths}
          onChange={handlePriceChange}
          required
        />

        <label htmlFor="averagePrice">
          Average price of previous three months (₹)
        </label>
        <input
          id="averagePrice"
          name="averagePrice"
          type="number"
          min="0"
          step="any"
          value={prices.averagePrice}
          onChange={handlePriceChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Predict Market Price"}
        </button>
      </form>

      {error && <p role="alert">Error: {error}</p>}

      {result && (
        <section>
          <h2>Prediction Result</h2>
          <p>Crop: {result.crop}</p>
          <p>
            Predicted price: ₹
            {Number(result.forecast_price).toFixed(2)}
          </p>
          <p>Forecast date: {result.forecast_date}</p>
          <p>Model: {result.model_used}</p>
          <p>{result.message}</p>
        </section>
      )}
    </main>
  );
}

export default App;
