import {
  PricePredictionForm,
  PricePredictionResult,
} from "../components/PricePrediction";

function MarketPricePage({
  cropId,
  crops,
  onCropChange,
  prices,
  onPriceChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  return (
    <section className="dashboard-section page-section" id="market-price">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">PREDICTIONS</p>
          <h2>Market Price</h2>
          <p>
            Forecast the expected market price using recent historical prices.
          </p>
        </div>
      </div>

      <div className="content-grid">
        <PricePredictionForm
          cropId={cropId}
          crops={crops}
          onCropChange={onCropChange}
          prices={prices}
          onPriceChange={onPriceChange}
          onSubmit={onSubmit}
          loading={loading}
          error={error}
        />
        <PricePredictionResult result={result} />
      </div>
    </section>
  );
}

export default MarketPricePage;
