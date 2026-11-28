function CropRecommendation({
  onSubmit,
  loading,
  error,
  result,
  districts = [],
  district,
  onDistrictChange,
  season,
  onSeasonChange,
  area,
  onAreaChange,
}) {
  const recommendation = result?.recommendations?.[0];
  const hasProfitableCrop = result?.has_profitable_crop ?? true;
  const hasProfitEstimate = recommendation?.expected_profit != null;
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
    hasProfitableCrop
      ? "Ranked by expected profit after estimated seed, fertilizer, pesticide, labour, irrigation, and transportation costs."
      : hasProfitEstimate
        ? "All available crops currently estimate a loss after costs. The option below has the smallest estimated loss."
        : "There is not enough market-price data to estimate profit for the available crops.";
  const formatCurrency = (value) =>
    value == null
      ? "—"
      : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const expenseLabels = {
    seed: "Seed",
    fertilizer: "Fertilizer",
    pesticide: "Pesticide",
    labour: "Labour",
    irrigation: "Irrigation",
    transportation: "Transportation",
  };
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
  const recommendationFactors = recommendation?.score_factors || {};
  const explanationReasons = recommendation
    ? [
        Number(recommendationFactors.expected_profit) >= 60
          ? "Strong expected profit compared with the other crops"
          : null,
        Number(recommendationFactors.expected_yield) >= 60
          ? "High predicted yield compared with the other crops"
          : null,
        Number(recommendationFactors.expected_market_price) >= 60
          ? "Strong market price compared with the other crops"
          : null,
        Number(recommendationFactors.weather_suitability) >= 60
          ? `Stable local yields based on ${recommendation.historical_years} years of history`
          : null,
        Number(recommendationFactors.soil_suitability) >= 60
          ? "Strong historical coverage for this district and season"
          : null,
        recommendation.expected_profit != null
          ? recommendation.expected_profit > 0
            ? `Expected profit ${formatCurrency(recommendation.expected_profit)}`
            : `Estimated loss ${formatCurrency(Math.abs(recommendation.expected_profit))}`
          : null,
      ].filter(Boolean)
    : [];
  return (
    <div className="recommendation-card">
      <div className="recommendation-form">
        <div className="recommendation-icon">🌾</div>

        <div className="recommendation-form-content">
          <h3>Get a clear planting recommendation</h3>

          <p>
            Choose your district and growing season to compare local historical
            yields, recent mandi prices, and estimated costs for your farm area.
          </p>

          <form onSubmit={(event) => onSubmit(event, area, district, season)}>
            <label htmlFor="recommendation-district">
              District
              <select
                id="recommendation-district"
                value={district || ""}
                onChange={(event) => onDistrictChange?.(event.target.value)}
                required
              >
                <option value="">Select district</option>
                {districts.map((districtOption) => (
                  <option key={districtOption} value={districtOption}>
                    {districtOption}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="recommendation-season">
              Season
              <select
                id="recommendation-season"
                value={season || ""}
                onChange={(event) => onSeasonChange?.(event.target.value)}
                required
              >
                <option value="">Select season</option>
                {["Kharif", "Rabi", "Summer", "Whole Year"].map((seasonOption) => (
                  <option key={seasonOption} value={seasonOption}>
                    {seasonOption}
                  </option>
                ))}
              </select>
            </label>
            <label className="recommendation-area-field" htmlFor="recommendation-area">
              Farm area (acres)
              <input
                id="recommendation-area"
                type="number"
                min="0.01"
                step="0.01"
                value={area || ""}
                onChange={(event) => onAreaChange?.(event.target.value)}
                placeholder="e.g. 2.5"
                required
              />
            </label>
            <button
              type="submit"
              className="recommendation-button"
              disabled={loading}
            >
              {loading ? "Calculating profitability…" : "Compare crop profits"}
            </button>
          </form>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </div>

      <div className="recommendation-result">
        {recommendation ? (
          <>
            <div className="recommendation-result-header">
              <span className={!hasProfitableCrop ? "recommendation-loss-heading" : ""}>
                {hasProfitableCrop
                  ? "TOP RECOMMENDATION"
                  : hasProfitEstimate
                    ? "NO PROFITABLE CROP FOUND UNDER CURRENT CONDITIONS"
                    : "INSUFFICIENT MARKET DATA TO ESTIMATE PROFIT"}
              </span>
              <strong>#{recommendation.recommendation_rank}</strong>
            </div>
            <p className="recommendation-personalized-context">
              {rankingContext} Based on {result.district}, {result.season} historical
              yields; recent district mandi prices are used when available.
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
                <p>
                  {hasProfitableCrop
                    ? "Recommended Crop"
                    : hasProfitEstimate
                      ? "Closest option (least estimated loss)"
                      : "Best-supported option"}
                </p>
                <h3>{recommendation.crop_name}</h3>
              </div>
            </div>

            <div className="profitability-summary">
              <div className="profitability-summary-heading">
                <div>
                  <span>ESTIMATED PROFIT</span>
                  <h4>Profit estimate for {recommendation.area_acres} acres</h4>
                </div>
                <strong>{formatCurrency(recommendation.expected_profit)}</strong>
              </div>
              <div className="profitability-stats">
                <div>
                  <span>Expected yield</span>
                  <strong>{recommendation.expected_yield_quintals ?? "—"} qtl</strong>
                </div>
                <div>
                  <span>Expected revenue</span>
                  <strong>{formatCurrency(recommendation.expected_revenue)}</strong>
                </div>
                <div>
                  <span>Estimated expenses</span>
                  <strong>{formatCurrency(recommendation.estimated_expenses)}</strong>
                </div>
              </div>
              <p>
                Price basis: {recommendation.market_price_source}.
              </p>
              <div className="profitability-expenses">
                {Object.entries(recommendation.expense_breakdown || {}).map(([key, value]) => (
                  <span key={key}>{expenseLabels[key] || key}: {formatCurrency(value)}</span>
                ))}
              </div>
            </div>

            <div className="recommendation-why-card">
              <div className="recommendation-why-heading">
                <div>
                  <span>EXPLAINABLE RECOMMENDATION</span>
                  <h4>Why recommended?</h4>
                </div>
                <small>Based on this prediction</small>
              </div>
              <ul>
                {(explanationReasons.length > 0
                  ? explanationReasons
                  : ["This crop has the strongest combined score among the available options."]
                ).map((reason) => (
                  <li key={reason}>
                    <span aria-hidden="true">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
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
                      Profit {formatCurrency(item.expected_profit)} · Score {Number(item.recommendation_score).toFixed(1)}%
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
              Select a district, growing season, and farm area to see local
              recommendations and alternatives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CropRecommendation;
