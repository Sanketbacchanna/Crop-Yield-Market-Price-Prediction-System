const CROPS = [
  { id: "1", name: "Rice" },
  { id: "2", name: "Wheat" },
  { id: "3", name: "Maize" },
];

const PRICE_FIELDS = [
  { name: "previousMonth", label: "Price previous month (₹)" },
  { name: "previousTwoMonths", label: "Price two months ago (₹)" },
  { name: "previousThreeMonths", label: "Price three months ago (₹)" },
  { name: "averagePrice", label: "Average price of previous three months (₹)" },
];

export function PricePredictionForm({
  cropId,
  onCropChange,
  prices,
  onPriceChange,
  onSubmit,
  loading,
  error,
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Market price predictor</h2>
        <p>Enter the previous three months of prices in ₹.</p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="crop">Select crop</label>
          <select
            id="crop"
            value={cropId}
            onChange={(event) => onCropChange(event.target.value)}
          >
            {CROPS.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </select>
        </div>

        {PRICE_FIELDS.map((field) => (
          <div className="form-field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type="number"
              min="0"
              step="any"
              value={prices[field.name]}
              onChange={onPriceChange}
              required
            />
            {field.name === "averagePrice" && (
              <span className="field-help">
                Enter the average for the same three-month period.
              </span>
            )}
          </div>
        ))}

        <button className="predict-button" type="submit" disabled={loading}>
          {loading ? "Generating forecast..." : "✦ Predict market price"}
        </button>
      </form>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

export function PricePredictionResult({ result }) {
  return (
    <section className="panel result-panel" aria-live="polite">
      <div className="panel-heading">
        <h2>Prediction result</h2>
        <p>Your forecast will appear here.</p>
      </div>

      {!result ? (
        <div className="result-placeholder">
          <div>
            <span>🌿</span>
            <strong>Ready when you are</strong>
            <div>Complete the form and select Predict market price.</div>
          </div>
        </div>
      ) : (
        <>
          <p className="result-value-label">Estimated next-month price</p>
          <div className="result-value">
            ₹
            {Number(result.forecast_price).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="result-crop">{result.crop}</span>

          <div className="result-details">
            <div className="result-detail">
              <span>Forecast date</span>
              <span>{result.forecast_date}</span>
            </div>
            <div className="result-detail">
              <span>ML model</span>
              <span>{result.model_used}</span>
            </div>
            <div className="result-detail">
              <span>Status</span>
              <span>Saved successfully</span>
            </div>
          </div>

          <p className="disclaimer">
            This is a model estimate, not a guaranteed selling price.
          </p>
        </>
      )}
    </section>
  );
}
