function YieldPrediction({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  const selectedRecord = agriculturalRecords.find(
    (record) => String(record.agricultural_id) === String(selectedAgriculturalId)
  );
  const cropNames = { 1: "Rice", 2: "Wheat", 3: "Maize" };

  return (
    <div className="yield-prediction-card">
      <div className="yield-form-panel">
        <div className="yield-form-content">
          <form onSubmit={onSubmit}>
            <div className="yield-record-field form-field">
              <label htmlFor="yield-agricultural-record">
                🌿 &nbsp; Farm record
              </label>
              <select
                id="yield-agricultural-record"
                value={selectedAgriculturalId}
                onChange={(event) => onAgriculturalChange(event.target.value)}
                disabled={loading || agriculturalRecords.length === 0}
              >
                {agriculturalRecords.length === 0 ? (
                  <option value="">No records available</option>
                ) : (
                  agriculturalRecords.map((record) => (
                    <option
                      key={record.agricultural_id}
                      value={record.agricultural_id}
                    >
                      {record.district || "Unknown"} ·{" "}
                      {record.season || "Unknown Season"} ·{" "}
                      {record.crop_year || "Unknown Year"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="yield-details-form">
              <div className="yield-detail-field">
                <span>Crop type</span>
                <strong>
                  {selectedRecord?.crop_name ||
                    cropNames[Number(selectedRecord?.crop_id)] ||
                    "Not specified"}
                </strong>
              </div>
              <div className="yield-detail-field">
                <span>Location</span>
                <strong>{selectedRecord?.district || "Not specified"}</strong>
              </div>
              <div className="yield-detail-field">
                <span>Season</span>
                <strong>{selectedRecord?.season || "Not specified"}</strong>
              </div>
              <div className="yield-detail-field">
                <span>Area</span>
                <strong>
                  {selectedRecord?.cultivated_area ?? "Not specified"}
                  {selectedRecord?.cultivated_area != null && " acres"}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              className="yield-prediction-button"
              disabled={loading || agriculturalRecords.length === 0}
            >
              {loading ? "Predicting..." : "▥  Predict Yield"}
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
                <h3><span aria-hidden="true">✓</span> Prediction Result</h3>
              </div>
            </div>

            <div className="yield-result-plant" aria-hidden="true">🌱</div>
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
            <div className="yield-result-header">
              <h3><span aria-hidden="true">✓</span> Prediction Result</h3>
            </div>
            <div className="yield-result-plant" aria-hidden="true">🌱</div>
            <h3>Ready to estimate</h3>
            <p>Choose a farm record and your yield prediction will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default YieldPrediction;