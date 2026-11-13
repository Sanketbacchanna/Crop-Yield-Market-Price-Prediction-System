function YieldPrediction({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  return (
    <div className="yield-prediction-card">
      <div className="yield-form-panel">
        <div className="yield-icon">🌾</div>

        <div className="yield-form-content">
          <div className="section-kicker">CROP YIELD FORECAST</div>

          <h3>Estimate your crop yield</h3>

          <p>
            Select an agricultural record to estimate the expected yield
            using the machine-learning model.
          </p>

          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="yield-agricultural-record">
                Agricultural Record
              </label>

              <select
                id="yield-agricultural-record"
                value={selectedAgriculturalId}
                onChange={(event) =>
                  onAgriculturalChange(event.target.value)
                }
                disabled={
                  loading || agriculturalRecords.length === 0
                }
              >
                {agriculturalRecords.length === 0 ? (
                  <option value="">No records available</option>
                ) : (
                  agriculturalRecords.map((record) => (
                    <option
                      key={record.agricultural_id}
                      value={record.agricultural_id}
                    >
                      {record.district || "Unknown"} •{" "}
                      {record.season || "Unknown Season"} •{" "}
                      {record.crop_year || "Unknown Year"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="submit"
              className="yield-prediction-button"
              disabled={
                loading || agriculturalRecords.length === 0
              }
            >
              {loading ? "Predicting..." : "Predict Crop Yield"}
              {!loading && <span>→</span>}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>

      <div className="yield-result-card">
        {result ? (
          <>
            <div className="yield-result-header">
              <div>
                <span className="price-result-label">
                  PREDICTION RESULT
                </span>

                <h3>Estimated Crop Yield</h3>
              </div>

              <div className="yield-result-icon">🌱</div>
            </div>

            <div className="yield-result-value">
              {result.predicted_yield != null
                ? Number(result.predicted_yield).toFixed(2)
                : "—"}

              <span className="yield-unit"> units</span>
            </div>

            <div className="yield-details">
              <div>
                <span>Crop</span>
                <strong>{result.crop_name || "—"}</strong>
              </div>

              <div>
                <span>District</span>
                <strong>{result.district || "—"}</strong>
              </div>

              <div>
                <span>Season</span>
                <strong>{result.season || "—"}</strong>
              </div>

              <div>
                <span>Model</span>
                <strong>{result.model_used || "Random Forest"}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className="yield-result-empty">
            <div className="yield-empty-icon">🌱</div>

            <h3>No prediction yet</h3>

            <p>
              Select an agricultural record and generate a prediction
              to see the expected crop yield here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default YieldPrediction;