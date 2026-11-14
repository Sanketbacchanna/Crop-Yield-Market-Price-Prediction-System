import { DashboardIntro } from "../components/DashboardHeader";
import SummaryCard from "../components/SummaryCard";
import YieldPrediction from "../components/YieldPrediction";

function DashboardPage({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
  onYieldSubmit,
  yieldLoading,
  yieldError,
  priceResult,
  recommendationResult,
  weatherData,
  weatherLoading,
  weatherError,
  yieldResult,
}) {
  const firstRecord = agriculturalRecords[0];
  const firstRecommendation = recommendationResult?.recommendations?.[0];

  return (
    <div id="dashboard" className="dashboard-page">
      <DashboardIntro />

      <section className="dashboard-section yield-dashboard-section">
        <div className="section-heading yield-section-heading">
          <span aria-hidden="true">🌱</span>
          <div>
            <h2>Crop Yield Prediction</h2>
            <p>Estimate crop yield using your agricultural information.</p>
          </div>
        </div>

        <YieldPrediction
          agriculturalRecords={agriculturalRecords}
          selectedAgriculturalId={selectedAgriculturalId}
          onAgriculturalChange={onAgriculturalChange}
          onSubmit={onYieldSubmit}
          loading={yieldLoading}
          error={yieldError}
          result={yieldResult}
        />
      </section>

      <section className="summary-grid">
        <SummaryCard
          icon="🌾"
          label="Recommended Crop"
          value={firstRecommendation?.crop_name || "—"}
          description={
            firstRecommendation
              ? `Rank #${firstRecommendation.recommendation_rank} • Best match`
              : "Generate a recommendation"
          }
          accent="green"
        />
        <SummaryCard
          icon="💰"
          label="Forecast Price"
          value={
            priceResult?.forecast_price != null
              ? `₹${Number(priceResult.forecast_price).toLocaleString("en-IN")}`
              : "—"
          }
          description={
            priceResult?.crop_name
              ? `${priceResult.crop_name} • Next forecast`
              : "Generate a price forecast"
          }
          accent="orange"
        />
        <SummaryCard
          icon="🌱"
          label="Predicted Yield"
          value={
            yieldResult?.predicted_yield != null
              ? Number(yieldResult.predicted_yield).toFixed(2)
              : "—"
          }
          description={
            yieldResult?.crop_name
              ? `${yieldResult.crop_name} • Random Forest`
              : "Generate a yield prediction"
          }
          accent="blue"
        />
        <SummaryCard
          icon="📍"
          label="Farm Location"
          value={firstRecord?.district || "—"}
          description={
            firstRecord
              ? `${firstRecord.state || "State"} • ${firstRecord.cultivated_area ?? "—"} acres`
              : "No agricultural record"
          }
          accent="purple"
        />
        <SummaryCard
          icon="🌦️"
          label="Weather"
          value={
            weatherData.length > 0
              ? `${weatherData[0].temperature ?? "—"}°C`
              : "—"
          }
          description={
            weatherData.length > 0
              ? `${weatherData[0].location || "Unknown"} • Rainfall ${weatherData[0].rainfall ?? "—"} mm`
              : weatherError ||
                (weatherLoading ? "Loading weather..." : "No weather data")
          }
          accent="blue"
        />
      </section>
    </div>
  );
}

export default DashboardPage;
