
// import { useState } from "react";
import { useEffect, useState } from "react";
import "./App.css";

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
  const [history, setHistory] = useState([]);

  const [agriculturalRecords, setAgriculturalRecords] = useState([]);
  const [selectedAgriculturalId, setSelectedAgriculturalId] = useState("");
  const [yieldResult, setYieldResult] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState("");

  const [yieldHistory, setYieldHistory] = useState([]);
  const [yieldHistoryLoading, setYieldHistoryLoading] = useState(false);
  const [yieldHistoryError, setYieldHistoryError] = useState("");


  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/price-prediction/"
      );

      if (!response.ok) {
        throw new Error("Could not load prediction history.");
      }

      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(err.message || "Unable to load prediction history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadYieldHistory() {
    setYieldHistoryLoading(true);
    setYieldHistoryError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/yield-prediction/"
      );

      if (!response.ok) {
        throw new Error("Could not load yield prediction history.");
      }

      const data = await response.json();
      setYieldHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setYieldHistoryError(
        err.message || "Unable to load yield prediction history."
      );
    } finally {
      setYieldHistoryLoading(false);
    }
  }

  async function loadAgriculturalRecords() {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/agricultural-data/"
      );

      if (!response.ok) {
        throw new Error("Could not load agricultural records.");
      }

      const data = await response.json();
      setAgriculturalRecords(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setSelectedAgriculturalId(String(data[0].agricultural_id));
      }
    } catch (err) {
      setYieldError(
        err.message || "Unable to load agricultural records."
      );
    }
  }

  async function handleYieldPrediction(event) {
    event.preventDefault();

    if (!selectedAgriculturalId) {
      setYieldError("Please select an agricultural record.");
      return;
    }

    setYieldLoading(true);
    setYieldError("");
    setYieldResult(null);

    try {
      const params = new URLSearchParams({
        user_id: "1",
        agricultural_id: selectedAgriculturalId,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/yield-prediction/?${params}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to generate yield prediction."
        );
      }

      setYieldResult(data);
    } catch (err) {
      setYieldError(
        err.message || "Unable to connect to the yield prediction API."
      );
    } finally {
      setYieldLoading(false);
    }
  }
  function handlePriceChange(event) {
    setPrices({ ...prices, [event.target.name]: event.target.value });
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
      await loadHistory();
    } catch (err) {
      setError(err.message || "Unable to connect to the API.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadHistory();
    loadAgriculturalRecords();
    loadYieldHistory();
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">🌱</div>
          <span>AgriPredict</span>
        </div>
        <div className="topbar-status">
          <span className="status-dot" />
          Prediction service
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">SMART AGRICULTURE PLATFORM</p>
            <h1>
              Make smarter decisions for your <span>next harvest.</span>
            </h1>
            <p className="hero-description">
              Estimate crop market prices using your recent price history.
              Enter your details to generate a model-based forecast.
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">🌾</div>
        </section>

        <div className="info-strip">
          <span>💡</span>
          <span>
            Price forecasts are estimates generated by a machine-learning
            model, not guaranteed market prices.
          </span>
        </div>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Market price predictor</h2>
              <p>Enter the previous three months of prices in ₹.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
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
              </div>

              <div className="form-field">
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
              </div>

              <div className="form-field">
                <label htmlFor="previousTwoMonths">Price two months ago (₹)</label>
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
              </div>

              <div className="form-field">
                <label htmlFor="previousThreeMonths">Price three months ago (₹)</label>
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
              </div>

              <div className="form-field">
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
                <span className="field-help">
                  Enter the average for the same three-month period.
                </span>
              </div>

              <button className="predict-button" type="submit" disabled={loading}>
                {loading ? "Generating forecast..." : "✦ Predict market price"}
              </button>
            </form>

            {error && <div className="error-message" role="alert">{error}</div>}
          </section>

          <section className="panel result-panel" aria-live="polite">
            <div className="panel-heading">
              <h2>Prediction result</h2>
              <p>Your forecast will appear here.</p>
            </div>

            {!result ? (
              <div className="result-placeholder">
                <div>
                  <span>🌿</span>
                  <strong>Ready when you are</strong>
                  <div>Complete the form and select Predict market price.</div>
                </div>
              </div>
            ) : (
              <>
                <p className="result-value-label">Estimated next-month price</p>
                <div className="result-value">
                  ₹{Number(result.forecast_price).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <span className="result-crop">{result.crop}</span>

                <div className="result-details">
                  <div className="result-detail">
                    <span>Forecast date</span>
                    <span>{result.forecast_date}</span>
                  </div>
                  <div className="result-detail">
                    <span>ML model</span>
                    <span>{result.model_used}</span>
                  </div>
                  <div className="result-detail">
                    <span>Status</span>
                    <span>Saved successfully</span>
                  </div>
                </div>

                <p className="disclaimer">
                  This is a model estimate, not a guaranteed selling price.
                </p>
              </>
            )}
          </section>

          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SAVED PREDICTIONS</span>
                <h2>Crop Yield Prediction History</h2>
                <p>Review your previously generated yield estimates.</p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={loadYieldHistory}
                disabled={yieldHistoryLoading}
              >
                {yieldHistoryLoading ? "Refreshing..." : "Refresh history"}
              </button>
            </div>

            {yieldHistoryError && (
              <p className="error-message" role="alert">
                {yieldHistoryError}
              </p>
            )}

            {yieldHistoryLoading && yieldHistory.length === 0 ? (
              <p>Loading yield prediction history...</p>
            ) : yieldHistory.length === 0 ? (
              <p>No yield predictions found yet.</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>

                    <tr>
                      <th>Prediction ID</th>
                      <th>Agricultural ID</th>
                      <th>Crop ID</th>
                      <th>Predicted Yield</th>
                      <th>Model</th>
                      <th>Prediction Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {yieldHistory.map((item, index) => (
                      <tr
                        key={
                          item.prediction_id ??
                          `${item.agricultural_id}-${index}`
                        }
                      >
                        <td>{item.prediction_id ?? "—"}</td>
                        <td>{item.agricultural_id ?? "—"}</td>
                        <td>{item.crop_id ?? "—"}</td>
                        <td>
                          {item.predicted_yield == null
                            ? "—"
                            : Number(item.predicted_yield).toFixed(2)}
                        </td>
                        <td>{item.model_used ?? "—"}</td>
                        <td>
                          {item.prediction_date
                            ? new Date(item.prediction_date).toLocaleDateString()
                            : "Not available"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>

        <section className="panel yield-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MACHINE LEARNING</span>
              <h2>Crop Yield Prediction</h2>
              <p>Select an agricultural record to estimate its crop yield.</p>
            </div>
          </div>

          <form onSubmit={handleYieldPrediction}>
            <div className="form-field">
              <label htmlFor="agriculturalRecord">
                Agricultural Record
              </label>

              <select
                id="agriculturalRecord"
                value={selectedAgriculturalId}
                onChange={(event) =>
                  setSelectedAgriculturalId(event.target.value)
                }
                required
              >
                <option value="">Select a record</option>

                {agriculturalRecords.map((record) => (
                  <option
                    key={record.agricultural_id}
                    value={record.agricultural_id}
                  >
                    {`Record ${record.agricultural_id} — ${record.district || "Unknown district"
                      } — ${record.season || "Unknown season"
                      } — ${record.crop_year || "Year unavailable"
                      }`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="predict-button"
              disabled={yieldLoading || agriculturalRecords.length === 0}
            >
              {yieldLoading ? "Predicting Yield..." : "Predict Crop Yield"}
            </button>
          </form>

          {yieldError && (
            <p className="error-message" role="alert">
              {yieldError}
            </p>
          )}

          {yieldResult && (
            <div className="yield-result">
              <span className="eyebrow">PREDICTION RESULT</span>
              <h3>{yieldResult.crop_name}</h3>

              <p>
                <strong>Predicted yield:</strong>{" "}
                {Number(yieldResult.predicted_yield).toFixed(2)}
              </p>

              <p>
                <strong>District:</strong> {yieldResult.district}
              </p>

              <p>
                <strong>Season:</strong> {yieldResult.season}
              </p>

              <p>
                <strong>Crop year:</strong> {yieldResult.crop_year}
              </p>

              <p>
                <strong>Cultivated area:</strong>{" "}
                {yieldResult.cultivated_area}
              </p>

              <p>
                <strong>Model:</strong> {yieldResult.model_used}
              </p>

              <p className="result-note">
                This is an ML-based estimate. Confirm the yield unit used by
                your trained model before interpreting the numerical value.
              </p>
            </div>
          )}
        </section>
      </main>
      <section className="panel history-panel">
        <div className="panel-heading">
          <h2>Prediction history</h2>
          <p>Your previously saved crop market price forecasts.</p>
        </div>

        {historyLoading && <p>Loading prediction history...</p>}

        {historyError && (
          <div className="error-message" role="alert">
            {historyError}
            <button type="button" onClick={loadHistory}>
              Try again
            </button>
          </div>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p>No prediction history found yet.</p>
        )}

        {!historyLoading && history.length > 0 && (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Forecast price</th>
                  <th>Forecast date</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.price_prediction_id}>
                    <td>
                      {Number(item.crop_id) === 1
                        ? "Rice"
                        : Number(item.crop_id) === 2
                          ? "Wheat"
                          : Number(item.crop_id) === 3
                            ? "Maize"
                            : `Crop ${item.crop_id}`}
                    </td>
                    <td>
                      ₹{Number(item.forecast_price).toLocaleString("en-IN")}
                    </td>
                    <td>{item.forecast_date}</td>
                    <td>{item.model_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          className="predict-button history-refresh"
          onClick={loadHistory}
          disabled={historyLoading}
        >
          {historyLoading ? "Refreshing..." : "Refresh history"}
        </button>
      </section>

      <footer className="footer">
        AgriPredict · Crop market price forecasting
      </footer>
    </div>
  );
}

export default App;

