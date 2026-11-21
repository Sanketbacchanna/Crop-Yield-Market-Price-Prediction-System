function CropRecommendation({
  onSubmit,
  loading,
  error,
  result,
}) {
  const recommendation = result?.recommendations?.[0];
  const additionalRecommendations = result?.recommendations?.slice(1) || [];
  const factorLabels = result?.score_factor_labels || {
    expected_yield: "Expected yield",
    expected_market_price: "Expected market price",
    weather_suitability: "Weather suitability",
    soil_suitability: "Soil suitability",
    water_requirement: "Water requirement",
    historical_profitability: "Historical profitability",
  };
  const scoreWeights = result?.score_weights || {
    expected_yield: 25,
    expected_market_price: 25,
    weather_suitability: 15,
    soil_suitability: 15,
    water_requirement: 10,
    historical_profitability: 10,
  };
  const rankingContext =
    result?.recommendation_basis === "yield_and_forecast_price"
      ? "Ranked using six weighted factors, including your estimated yield and saved price forecasts."
      : "Ranked using six weighted factors; historical market prices fill in where a saved forecast is unavailable.";
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
          <h3>Get a clear planting recommendation</h3>

          <p>
            Choose a farm record to score crops for your district and season. The
            ranking combines yield, market price, weather, soil, water, and historical
            profitability.
          </p>

            <form onSubmit={onSubmit}>
            <button
              type="submit"
              className="recommendation-button"
              disabled={loading}
            >
              {loading ? "Analyzing historical data…" : "Show best crops"}
            </button>
          </form>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </div>

      <div className="recommendation-result">
        {recommendation ? (
          <>
            <div className="recommendation-result-header">
              <span>TOP RECOMMENDATION</span>
              <strong>#{recommendation.recommendation_rank}</strong>
            </div>
            <p className="recommendation-personalized-context">
              {rankingContext}
            </p>

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

            <div className="recommendation-factor-breakdown">
              <div className="recommendation-factor-heading">
                <h4>Why this crop ranks first</h4>
                <span>Weighted score</span>
              </div>
              {Object.entries(recommendation.score_factors || {}).map(([factor, score]) => (
                <div className="recommendation-factor" key={factor}>
                  <div className="recommendation-factor-label">
                    <span>{factorLabels[factor] || factor} ({scoreWeights[factor] || 0}% weight)</span>
                    <strong>{Number(score).toFixed(0)}%</strong>
                  </div>
                  <div className="recommendation-factor-track">
                    <span style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {additionalRecommendations.length > 0 && (
              <div className="recommendation-alternatives">
                <h4>Other suitable options</h4>
                {additionalRecommendations.map((item) => (
                  <div
                    className="recommendation-alternative"
                    key={`${item.crop_id}-${item.recommendation_rank}`}
                  >
                    <strong>#{item.recommendation_rank} {item.crop_name}</strong>
                    <span>
                      Score {Number(item.recommendation_score).toFixed(1)}% · {" "}
                      {item.historical_observations} historical records
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="recommendation-empty">
            <div>🌿</div>
            <h3>Your best crop will appear here</h3>
            <p>
              Select a farm record and choose “Show my best crop” to see the
              top option and alternatives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CropRecommendation;
