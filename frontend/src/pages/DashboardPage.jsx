import { DashboardIntro } from "../components/DashboardHeader";
import SummaryCard from "../components/SummaryCard";
import YieldPrediction from "../components/YieldPrediction";

function DashboardPage({
  agriculturalRecords,
  yieldDistricts,
  selectedAgriculturalId,
  onAgriculturalChange,
  farmArea,
  onAreaChange,
  onYieldSubmit,
  yieldLoading,
  yieldError,
  priceResult,
  recommendationResult,
  weatherData,
  weatherLoading,
  weatherError,
  yieldResult,
  liveLocation,
  liveWeather,
  liveLocationLoading,
}) {
  const firstRecord = agriculturalRecords[0];
  const firstRecommendation = recommendationResult?.recommendations?.[0];
  const currentLocationName =
    liveLocation?.name || firstRecord?.district || "Current location";
  const weatherSummary = liveWeather || weatherData[0];
  const parsedFarmArea = Number(farmArea);
  const formattedArea =
    farmArea !== "" && Number.isFinite(parsedFarmArea) && parsedFarmArea >= 0
      ? `${parsedFarmArea.toFixed(2).replace(/\.00$/, "")} acres`
      : "Enter area in the yield form";

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
          districts={yieldDistricts}
          selectedAgriculturalId={selectedAgriculturalId}
          onAgriculturalChange={onAgriculturalChange}
          area={farmArea}
          onAreaChange={onAreaChange}
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
          value={currentLocationName}
          description={
            liveLocationLoading
              ? `Live location • ${formattedArea}`
              : `${formattedArea}${firstRecord ? "" : " • No farm record"}`
          }
          accent="purple"
        />
        <SummaryCard
          icon="🌦️"
          label="Weather"
          value={
            weatherSummary
              ? `${weatherSummary.temperature ?? "—"}°C`
              : "—"
          }
          description={
            weatherSummary
              ? `${weatherSummary.location || currentLocationName} • Rainfall ${weatherSummary.rainfall ?? "—"} mm`
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
