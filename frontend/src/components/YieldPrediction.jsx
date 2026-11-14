import { useCallback, useEffect, useRef, useState } from "react";

function YieldPrediction({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  const [cropType, setCropType] = useState("");
  const [area, setArea] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const locationRequested = useRef(false);
  const selectedRecord = agriculturalRecords.find(
    (record) => String(record.agricultural_id) === String(selectedAgriculturalId)
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        const messages = {
          1: "Allow location access in your browser, then retry.",
          2: "Your location is currently unavailable.",
          3: "Location request timed out. Please retry.",
        };
        setLocationError(
          messages[error.code] || "Unable to get your current location."
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (locationRequested.current) {
      return;
    }

    locationRequested.current = true;
    requestLocation();
  }, [requestLocation]);

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
              <div className="form-field yield-input-field">
                <label htmlFor="yield-crop-type">Crop type</label>
                <select
                  id="yield-crop-type"
                  value={cropType}
                  onChange={(event) => setCropType(event.target.value)}
                >
                  <option value="">Select crop</option>
                  <option value="Rice">Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Maize">Maize</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Sugarcane">Sugarcane</option>
                </select>
              </div>
              <div className="yield-detail-field">
                <span>Location</span>
                <strong className="yield-location-value">
                  {locationLoading
                    ? "Fetching current location..."
                    : currentLocation
                      ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
                      : locationError}
                </strong>
                {locationError && (
                  <button
                    type="button"
                    className="yield-location-retry"
                    onClick={requestLocation}
                  >
                    Retry location
                  </button>
                )}
              </div>
              <div className="yield-detail-field">
                <span>Season</span>
                <strong>{selectedRecord?.season || "Not specified"}</strong>
              </div>
              <div className="form-field yield-input-field">
                <label htmlFor="yield-area">Area (acres)</label>
                <input
                  id="yield-area"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter area"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                />
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