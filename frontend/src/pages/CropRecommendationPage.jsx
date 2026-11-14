import CropRecommendation from "../components/CropRecommendation";

function CropRecommendationPage({
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
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
          <h2>Crop Recommendation</h2>
          <p>
            Find the most suitable crop based on your agricultural information.
          </p>
        </div>
      </div>

      <CropRecommendation
        agriculturalRecords={agriculturalRecords}
        selectedAgriculturalId={selectedAgriculturalId}
        onAgriculturalChange={onAgriculturalChange}
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        result={result}
      />
    </section>
  );
}

export default CropRecommendationPage;
