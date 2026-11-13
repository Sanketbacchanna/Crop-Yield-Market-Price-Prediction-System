function CropRecommendation({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  const recommendation = result?.recommendations?.[0];
  const cropImages = {
    Rice: "/crops/Rice.png",
    Wheat: "/crops/wheat.jpg",
    Maize: "/crops/maize.jpg",
    Cotton: "/crops/cotton.jpg",
    Sugarcane: "/crops/sugarcane.jpg",
  };

  const cropImage = recommendation
    ? cropImages[recommendation.crop_name]
    : null;
  return (
    <div className="recommendation-card">
      <div className="recommendation-form">
        <div className="recommendation-icon">🌾</div>

        <div className="recommendation-form-content">
          <h3>Find the best crop for your farm</h3>

          <p>
            Select your agricultural record and let the prediction model
            recommend the most suitable crop.
          </p>

          <form onSubmit={onSubmit}>
            <label htmlFor="recommendation-agricultural-record">
              Agricultural Record
            </label>

            <select
              id="recommendation-agricultural-record"
              value={selectedAgriculturalId}
              onChange={(event) =>
                onAgriculturalChange(event.target.value)
              }
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
                    {record.district || "Unknown"} •{" "}
                    {record.season || "Unknown Season"} •{" "}
                    {record.crop_year || "Unknown Year"}
                  </option>
                ))
              )}
            </select>

            <button
              type="submit"
              className="recommendation-button"
              disabled={loading || agriculturalRecords.length === 0}
            >
              {loading ? "Generating..." : "Generate Recommendation"}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>

      <div className="recommendation-result">
        {recommendation ? (
          <>
            <div className="recommendation-result-header">
              <span>TOP RECOMMENDATION</span>
              <strong>#{recommendation.recommendation_rank}</strong>
            </div>

            <div className="recommended-crop">
              <div className="recommended-crop-image">
                {cropImage ? (
                  <img
                    src={cropImage}
                    alt={recommendation.crop_name}
                  />
                ) : (
                  <span>🌱</span>
                )}
              </div>

              <div>
                <p>Recommended Crop</p>
                <h3>{recommendation.crop_name}</h3>
              </div>
            </div>

            <div className="recommendation-stats">
              <div>
                <span>Predicted Yield</span>
                <strong>
                  {recommendation.predicted_yield != null
                    ? Number(recommendation.predicted_yield).toFixed(2)
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Forecast Price</span>
                <strong>
                  {recommendation.forecast_price != null
                    ? `₹${Number(
                      recommendation.forecast_price
                    ).toLocaleString("en-IN")}`
                    : "—"}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="recommendation-empty">
            <div>🌿</div>
            <h3>No recommendation yet</h3>
            <p>
              Generate a recommendation to see the best crop for your
              selected agricultural record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CropRecommendation;