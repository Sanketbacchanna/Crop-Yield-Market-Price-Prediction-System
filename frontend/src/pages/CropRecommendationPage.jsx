import CropRecommendation from "../components/CropRecommendation";

function CropRecommendationPage({
  onSubmit,
  loading,
  error,
  result,
}) {
  return (
    <section
      className="dashboard-section page-section"
      id="crop-recommendation"
    >
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">SMART RECOMMENDATION</p>
          <h2>What should I plant?</h2>
          <p>
            Compare crops using Karnataka’s historical yield and market data.
          </p>
        </div>
      </div>

      <CropRecommendation
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        result={result}
      />
    </section>
  );
}

export default CropRecommendationPage;
