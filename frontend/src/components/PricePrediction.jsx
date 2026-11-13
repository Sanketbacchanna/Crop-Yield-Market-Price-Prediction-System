function PricePredictionForm({
  cropId,
  prices,
  onCropChange,
  onPriceChange,
  onSubmit,
  loading,
  error,
}) {
  return (
    <div className="price-prediction-card">
      <div className="price-form-panel">
        <div className="price-form-icon">📈</div>

        <div className="price-form-content">
          <div className="section-kicker">MARKET PRICE FORECAST</div>

          <h3>Predict the next market price</h3>

          <p>
            Enter recent crop prices to estimate the future market price
            using the prediction model.
          </p>

          <form onSubmit={onSubmit}>
            <div className="price-form-grid">
              <div className="form-field">
                <label htmlFor="price-crop">Crop</label>

                <select
                  id="price-crop"
                  value={cropId}
                  onChange={(event) => onCropChange(event.target.value)}
                  disabled={loading}
                >
                  <option value="1">Rice</option>
                  <option value="2">Wheat</option>
                  <option value="3">Maize</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="previous-month">
                  Previous Month Price
                </label>

                <div className="input-with-prefix">
                  <span>₹</span>

                  <input
                    id="previous-month"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices.previousMonth}
                    onChange={(event) =>
                      onPriceChange(
                        "previousMonth",
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="previous-two-months">
                  Previous 2 Months Price
                </label>

                <div className="input-with-prefix">
                  <span>₹</span>

                  <input
                    id="previous-two-months"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices.previousTwoMonths}
                    onChange={(event) =>
                      onPriceChange(
                        "previousTwoMonths",
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="previous-three-months">
                  Previous 3 Months Price
                </label>

                <div className="input-with-prefix">
                  <span>₹</span>

                  <input
                    id="previous-three-months"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices.previousThreeMonths}
                    onChange={(event) =>
                      onPriceChange(
                        "previousThreeMonths",
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="average-price">
                  Average Price
                </label>

                <div className="input-with-prefix">
                  <span>₹</span>

                  <input
                    id="average-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices.averagePrice}
                    onChange={(event) =>
                      onPriceChange(
                        "averagePrice",
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="price-prediction-button"
              disabled={loading}
            >
              {loading ? "Predicting..." : "Predict Market Price"}
              {!loading && <span>→</span>}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function PricePredictionResult({ result }) {
  if (!result) {
    return (
      <div className="price-result-empty">
        <div className="price-result-empty-icon">💰</div>

        <h3>No forecast yet</h3>

        <p>
          Enter the recent market prices and generate a forecast to
          see the predicted price here.
        </p>
      </div>
    );
  }

  return (
    <div className="price-result-card">
      <div className="price-result-header">
        <div>
          <span className="price-result-label">FORECAST RESULT</span>
          <h3>Estimated Market Price</h3>
          <p className="price-result-crop">
            Crop: <strong>{result.crop_name || "Rice"}</strong>
          </p>
        </div>

        <div className="price-result-icon">₹</div>
      </div>

      <div className="price-result-value">
        ₹
        {Number(
          result.predicted_price ?? result.forecast_price ?? 0
        ).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        <span className="price-unit"> / unit</span>
      </div>

      <p className="price-result-note">
        Predicted using the recent price history provided above.
      </p>
    </div>
  );
}

export { PricePredictionForm, PricePredictionResult };