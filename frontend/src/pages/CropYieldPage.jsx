import YieldPrediction from "../components/YieldPrediction";

function CropYieldPage({
  agriculturalRecords,
  yieldDistricts,
  crops,
  selectedAgriculturalId,
  onAgriculturalChange,
  onSubmit,
  loading,
  error,
  result,
}) {
  return (
    <section
      className="dashboard-section yield-dashboard-section page-section"
      id="yield-prediction"
    >
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
        cropOptions={crops}
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

export default CropYieldPage;
