import { useCallback, useEffect, useRef, useState } from "react";

function YieldPrediction({
  agriculturalRecords,
  districts,
  cropOptions = [],
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
  area,
  onAreaChange,
}) {
  const [cropType, setCropType] = useState("");
  const [districtSelection, setDistrictSelection] = useState(null);
  const availableCrops = cropOptions.length
    ? cropOptions
    : [
        { crop_id: 1, crop_name: "Rice" },
        { crop_id: 2, crop_name: "Wheat" },
        { crop_id: 3, crop_name: "Maize" },
        { crop_id: 4, crop_name: "Cotton" },
        { crop_id: 5, crop_name: "Sugarcane" },
      ];
  const [localArea, setLocalArea] = useState("");
  const currentArea = area ?? localArea;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLookupLoading, setLocationLookupLoading] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState("");
  const locationRequested = useRef(false);
  const selectedRecord = agriculturalRecords.find(
    (record) => String(record.agricultural_id) === String(selectedAgriculturalId)
  );
  const matchingDistrict = districts.find(
    (name) =>
      name.toLowerCase() ===
      selectedRecord?.district?.trim().toLowerCase()
  );
  const district =
    districtSelection?.agriculturalId === String(selectedAgriculturalId)
      ? districtSelection.value
      : matchingDistrict || "";

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

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    const controller = new AbortController();
    const lookupArea = async () => {
      setLocationLookupLoading(true);
      setLocationLookupError("");
      setLocationName("");

      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
          zoom: "14",
          addressdetails: "1",
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Area lookup request failed.");
        }

        const data = await response.json();
        const address = data.address || {};
        const areaName =
          address.neighbourhood ||
          address.suburb ||
          address.village ||
          address.hamlet ||
          address.town ||
          address.city_district ||
          address.city ||
          address.municipality ||
          address.county ||
          address.state_district;

        if (!areaName) {
          throw new Error("No nearby area name was returned.");
        }

        setLocationName(areaName);
      } catch (error) {
        if (error.name !== "AbortError") {
          setLocationLookupError(
            "Area name unavailable. Your coordinates are shown below."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLocationLookupLoading(false);
        }
      }
    };

    lookupArea();
    return () => controller.abort();
  }, [currentLocation]);

  return (
    <div className="yield-prediction-card">
      <div className="yield-form-panel">
        <div className="yield-form-content">
          <form onSubmit={(event) => onSubmit(event, cropType, district)}>
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
                  required
                  onChange={(event) => setCropType(event.target.value)}
                >
                  <option value="">Select crop</option>
                  {availableCrops.map((crop) => (
                    <option key={crop.crop_id ?? crop.crop_name} value={crop.crop_name}>
                      {crop.crop_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field yield-input-field">
                <label htmlFor="yield-district">District</label>
                <select
                  id="yield-district"
                  value={district}
                  required
                  disabled={districts.length === 0}
                  onChange={(event) =>
                    setDistrictSelection({
                      agriculturalId: String(selectedAgriculturalId),
                      value: event.target.value,
                    })
                  }
                >
                  <option value="">
                    {districts.length === 0
                      ? "Districts unavailable"
                      : "Select district"}
                  </option>
                  {districts.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <small className="yield-location-note">
                  Current area:{" "}
                  {locationLoading
                    ? "Fetching location..."
                    : locationLookupLoading
                      ? "Finding nearby area..."
                      : locationName || locationError || "Not available"}
                </small>
                {currentLocation && (
                  <small className="yield-location-note">
                    {currentLocation.latitude.toFixed(5)},{" "}
                    {currentLocation.longitude.toFixed(5)}
                    {" · "}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      © OpenStreetMap contributors
                    </a>
                  </small>
                )}
                {(locationError || locationLookupError) && (
                  <button
                    type="button"
                    className="yield-location-retry"
                    onClick={requestLocation}
                  >
                    {locationLookupError ? "Retry area lookup" : "Retry location"}
                  </button>
                )}
                {locationLookupError && (
                  <small className="yield-location-error">
                    {locationLookupError}
                  </small>
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
                  value={currentArea}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (onAreaChange) {
                      onAreaChange(nextValue);
                    } else {
                      setLocalArea(nextValue);
                    }
                  }}
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