import CropRecommendation from "../components/CropRecommendation";

function CropRecommendationPage({
  onSubmit,
  loading,
  error,
  result,
  area,
  onAreaChange,
  agriculturalRecords,
  selectedAgriculturalId,
  onAgriculturalChange,
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
            Compare expected revenue, estimated expenses, and profit before you plant.
          </p>
        </div>
      </div>

      <CropRecommendation
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        result={result}
        area={area}
        onAreaChange={onAreaChange}
        agriculturalRecords={agriculturalRecords}
        selectedAgriculturalId={selectedAgriculturalId}
        onAgriculturalChange={onAgriculturalChange}
      />
    </section>
  );
}

export default CropRecommendationPage;
