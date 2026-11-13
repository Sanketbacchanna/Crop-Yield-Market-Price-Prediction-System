export default function CropRecommendation({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  const recommendations = Array.isArray(result?.recommendations)
    ? result.recommendations
    : [];

  return (
    <section className="panel recommendation-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SMART RECOMMENDATION</span>
          <h2>Crop Recommendation</h2>
          <p>
            Get the top recommended crops based on yield prediction and
            forecast market price.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="recommendationAgriculturalRecord">
            Agricultural Record
          </label>
          <select
            id="recommendationAgriculturalRecord"
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
          {loading
            ? "Generating Recommendations..."
            : "🌱 Get Crop Recommendations"}
        </button>
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="recommendation-result">
          <span className="eyebrow">TOP RECOMMENDATIONS</span>
          <h3>Recommended Crops for {result.district}</h3>
          <p>
            <strong>Season:</strong> {result.season}
          </p>
          <p>
            <strong>Crop year:</strong> {result.crop_year}
          </p>

          <div className="recommendation-list">
            {recommendations.map((item) => (
              <div
                className="recommendation-card"
                key={`${item.crop_id}-${item.recommendation_rank}`}
              >
                <div className="recommendation-rank">
                  #{item.recommendation_rank}
                </div>
                <div className="recommendation-info">
                  <h4>{item.crop_name}</h4>
                  <p>
                    <strong>Predicted yield:</strong>{" "}
                    {Number(item.predicted_yield).toFixed(2)}
                  </p>
                  <p>
                    <strong>Forecast price:</strong> ₹
                    {Number(item.forecast_price).toLocaleString("en-IN")}
                  </p>
                  <p>
                    <strong>Recommendation score:</strong>{" "}
                    {Number(item.recommendation_score).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
