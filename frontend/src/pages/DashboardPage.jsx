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
  priceLoading,
  recommendationLoading,
  priceResult,
  recommendationResult,
  weatherData,
  weatherLoading,
  weatherError,
  yieldResult,
  liveLocation,
  liveWeather,
  liveLocationLoading,
  marketPricePreview,
  marketPricePreviewLoading,
  marketPricePreviewError,
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
  const rawYield = Number(yieldResult?.predicted_yield);
  const yieldAreaAcres = Number(farmArea || yieldResult?.area_acres);
  const yieldUnit = "quintals";
  const perAcreYield = Number.isFinite(rawYield)
    ? rawYield * 0.404686 * 10
    : null;
  const totalYield =
    perAcreYield !== null && Number.isFinite(yieldAreaAcres) && yieldAreaAcres > 0
      ? perAcreYield * yieldAreaAcres
      : null;

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
          marketPricePreview={marketPricePreview}
          marketPricePreviewLoading={marketPricePreviewLoading}
          marketPricePreviewError={marketPricePreviewError}
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
          loading={recommendationLoading}
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
          loading={priceLoading}
        />
        <SummaryCard
          icon="🌱"
          label="Expected Yield"
          value={
            totalYield !== null
              ? `${totalYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${yieldUnit}`
              : "—"
          }
          description={
            yieldResult?.crop_name
              ? `${yieldResult.crop_name} • ${
                  perAcreYield !== null
                    ? `${perAcreYield.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${yieldUnit}/acre`
                    : "Per-acre estimate unavailable"
                }`
              : "Generate a yield prediction"
          }
          accent="blue"
          loading={yieldLoading}
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
          loading={liveLocationLoading}
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
          loading={weatherLoading}
        />
      </section>
    </div>
  );
}

export default DashboardPage;
