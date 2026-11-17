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
          <h2>What should I plant?</h2>
          <p>
            Compare suitable crops for your district, season, and farm conditions.
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
