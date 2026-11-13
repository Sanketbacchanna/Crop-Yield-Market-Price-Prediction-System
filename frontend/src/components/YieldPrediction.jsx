export default function YieldPrediction({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  return (
    <section className="panel yield-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">MACHINE LEARNING</span>
          <h2>Crop Yield Prediction</h2>
          <p>Select an agricultural record to estimate its crop yield.</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="agriculturalRecord">Agricultural Record</label>
          <select
            id="agriculturalRecord"
            value={selectedAgriculturalId}
            onChange={(event) => onAgriculturalChange(event.target.value)}
            required
          >
            <option value="">Select a record</option>
            {agriculturalRecords.map((record) => (
              <option
                key={record.agricultural_id}
                value={record.agricultural_id}
              >
                {`Record ${record.agricultural_id} — ${
                  record.district || "Unknown district"
                } — ${record.season || "Unknown season"} — ${
                  record.crop_year || "Year unavailable"
                }`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="predict-button"
          disabled={loading || agriculturalRecords.length === 0}
        >
          {loading ? "Predicting Yield..." : "Predict Crop Yield"}
        </button>
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="yield-result">
          <span className="eyebrow">PREDICTION RESULT</span>
          <h3>{result.crop_name}</h3>
          <p>
            <strong>Predicted yield:</strong>{" "}
            {Number(result.predicted_yield).toFixed(2)}
          </p>
          <p>
            <strong>District:</strong> {result.district}
          </p>
          <p>
            <strong>Season:</strong> {result.season}
          </p>
          <p>
            <strong>Crop year:</strong> {result.crop_year}
          </p>
          <p>
            <strong>Cultivated area:</strong> {result.cultivated_area}
          </p>
          <p>
            <strong>Model:</strong> {result.model_used}
          </p>
          <p className="result-note">
            This is an ML-based estimate. Confirm the yield unit used by your
            trained model before interpreting the numerical value.
          </p>
        </div>
      )}
    </section>
  );
}
