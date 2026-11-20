import { useCallback, useEffect, useRef, useState } from "react";
import { findKarnatakaDistrict } from "../utils/karnatakaDistrict";

const KARNATAKA_YIELD_CROPS = [
  "Arecanut",
  "Arhar/Tur",
  "Bajra",
  "Banana",
  "Black pepper",
  "Cardamom",
  "Castor seed",
  "Coconut",
  "Coriander",
  "Cotton(lint)",
  "Dry chillies",
  "Garlic",
  "Ginger",
  "Gram",
  "Groundnut",
  "Horse-gram",
  "Jowar",
  "Linseed",
  "Maize",
  "Mesta",
  "Moong(Green Gram)",
  "Niger seed",
  "Onion",
  "Other Kharif pulses",
  "Other Rabi pulses",
  "Peas & beans (Pulses)",
  "Potato",
  "Ragi",
  "Rapeseed &Mustard",
  "Rice",
  "Safflower",
  "Sannhamp",
  "Sesamum",
  "Small millets",
  "Soyabean",
  "Sugarcane",
  "Sunflower",
  "Sweet potato",
  "Tapioca",
  "Tobacco",
  "Turmeric",
  "Urad",
  "Wheat",
].map((crop_name, index) => ({ crop_id: index + 1, crop_name }));

const YIELD_UNIT_BY_CROP = {
  Coconut: "nuts",
  "Cotton(lint)": "bales",
};

function YieldPrediction({
  agriculturalRecords,
  districts,
  cropOptions = [],
  selectedAgriculturalId,
  onSubmit,
  loading,
  error,
  result,
  area,
  onAreaChange,
  marketPricePreview = [],
  marketPricePreviewLoading = false,
  marketPricePreviewError = "",
}) {
  const [cropType, setCropType] = useState("");
  const [districtSelection, setDistrictSelection] = useState(null);
  const availableCrops = cropOptions.length
    ? cropOptions
    : KARNATAKA_YIELD_CROPS;
  const [localArea, setLocalArea] = useState("");
  const currentArea = area ?? localArea;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError] = useState("");
  const [locationName] = useState("");
  const [locationDetails, setLocationDetails] = useState(null);
  const [locationLookupLoading, setLocationLookupLoading] = useState(false);
  const [locationLookupError] = useState("");
  const locationRequested = useRef(false);
  const selectedRecord = agriculturalRecords.find(
    (record) => String(record.agricultural_id) === String(selectedAgriculturalId)
  );
  const matchingDistrict = districts.find(
    (name) =>
      name.toLowerCase() ===
      selectedRecord?.district?.trim().toLowerCase()
  );
  const autoDetectedDistrict = findKarnatakaDistrict(locationDetails, districts);
  const isKarnatakaLocation =
    locationDetails?.state?.trim().toLowerCase() === "karnataka" &&
    (!locationDetails.countryCode ||
      locationDetails.countryCode.toLowerCase() === "in");
  const locationKey = currentLocation
    ? `${currentLocation.latitude},${currentLocation.longitude}`
    : "";
  const districtSelectionKey =
    locationKey || `record:${selectedAgriculturalId}`;
  const manuallySelectedDistrict =
    districtSelection?.selectionKey === districtSelectionKey
      ? districtSelection.value
      : "";
  const district =
    manuallySelectedDistrict ||
    autoDetectedDistrict ||
    (!locationLoading &&
    !locationLookupLoading &&
    !currentLocation
      ? matchingDistrict || ""
      : "");
  const predictedYield = Number(result?.predicted_yield);
  const areaAcres = Number(currentArea || result?.cultivated_area);
  const yieldUnit = YIELD_UNIT_BY_CROP[result?.crop_name] || "tonnes";
  const perAcreYield = Number.isFinite(predictedYield)
    ? predictedYield * 0.404686
    : null;
  const totalYield =
    perAcreYield !== null && Number.isFinite(areaAcres) && areaAcres > 0
      ? perAcreYield * areaAcres
      : null;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationLookupLoading(false);
    setCurrentLocation(null);
    setLocationDetails(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationLoading(false);
      },
      () => {
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
        setLocationDetails({
          state: address.state || "",
          countryCode: address.country_code || "",
          districtCandidates: [
            address.state_district,
            address.county,
            address.district,
          ].filter((candidate) => typeof candidate === "string"),
        });

      } catch (error) {
        if (error.name !== "AbortError") {
          setLocationDetails(null);
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
          <form onSubmit={(event) => onSubmit(event, cropType, district, currentArea)}>
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
                <label htmlFor="yield-district">
                  District
                  {autoDetectedDistrict && !manuallySelectedDistrict
                    ? " (auto-detected)"
                    : ""}
                </label>
                <select
                  id="yield-district"
                  value={district}
                  required
                  disabled={districts.length === 0}
                  onChange={(event) =>
                    setDistrictSelection({
                      selectionKey: districtSelectionKey,
                      value: event.target.value,
                    })
                  }
                >
                  <option value="">
                    {districts.length === 0
                      ? "Districts unavailable"
                      : locationLoading || locationLookupLoading
                        ? "Detecting district..."
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
                <small className="yield-location-note">
                  {autoDetectedDistrict
                    ? manuallySelectedDistrict
                      ? `Manually selected · live location suggests ${autoDetectedDistrict}`
                      : `District auto-selected from live location: ${autoDetectedDistrict}`
                    : locationLookupLoading || locationLoading
                      ? "Detecting district from live location..."
                      : currentLocation
                        ? isKarnatakaLocation
                          ? "Could not match this Karnataka location to a district. Select one manually."
                          : "Choose a supported Karnataka district manually."
                        : "Choose the district for your farm record."}
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

          {error && <p className="form-error" role="alert">{error}</p>}
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
              {totalYield !== null
                ? totalYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                : perAcreYield !== null
                  ? perAcreYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : "—"}
              <span className="yield-unit"> {yieldUnit}</span>
            </div>
            <p className="yield-result-explanation">
              {perAcreYield !== null
                ? `${perAcreYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${yieldUnit} per acre${
                    totalYield !== null
                      ? ` · ${totalYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${yieldUnit} estimated for ${areaAcres} acres`
                      : ""
                  }`
                : "Enter the cultivated area to estimate total production."}
            </p>

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

      {result && (
        <section className="yield-market-preview" aria-live="polite">
          <div className="yield-market-preview-heading">
            <div>
              <p className="section-eyebrow">MARKET PRICE</p>
              <h3>{result.crop_name} prices for {result.district}</h3>
            </div>
            {marketPricePreviewLoading && <span>Loading market prices...</span>}
          </div>
          {marketPricePreviewError && (
            <p className="market-status error">{marketPricePreviewError}</p>
          )}
          {!marketPricePreviewLoading &&
            !marketPricePreviewError &&
            marketPricePreview.length === 0 && (
              <p className="market-status">No matching market prices found.</p>
            )}
          {!marketPricePreviewLoading &&
            !marketPricePreviewError &&
            marketPricePreview.length > 0 && (
              <div className="market-table-wrapper">
                <table className="market-table">
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Variety</th>
                      <th>Date</th>
                      <th>Modal price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketPricePreview.map((price) => (
                      <tr key={price.id}>
                        <td>{price.market}</td>
                        <td>{price.variety || "—"}</td>
                        <td>{price.arrival_date}</td>
                        <td><strong>₹{Number(price.modal_price).toLocaleString("en-IN")}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      )}
    </div>
  );
}

export default YieldPrediction;
