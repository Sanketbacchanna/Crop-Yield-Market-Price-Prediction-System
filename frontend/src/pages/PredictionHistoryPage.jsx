import HistoryTable from "../components/HistoryTable";

function PredictionHistoryPage({
  yieldHistory,
  yieldHistoryLoading,
  yieldHistoryError,
  loadYieldHistory,
  priceHistory,
  priceHistoryLoading,
  priceHistoryError,
  loadPriceHistory,
}) {
  const cropNames = { 1: "Rice", 2: "Wheat", 3: "Maize" };

  return (
    <div className="history-page" id="prediction-history">
      <section className="dashboard-section page-section">
        <HistoryTable
          eyebrow="YIELD HISTORY"
          title="Crop Yield Prediction History"
          description="Review your previously generated yield estimates."
          headers={[
            "Prediction",
            "Agricultural Record",
            "Crop",
            "Predicted Yield",
            "Model",
            "Date",
          ]}
          rows={yieldHistory}
          loading={yieldHistoryLoading}
          error={yieldHistoryError}
          emptyMessage="No yield predictions found yet."
          onRefresh={loadYieldHistory}
          refreshPlacement="header"
        >
          {yieldHistory.map((item, index) => (
            <tr
              key={
                item.prediction_id ??
                `${item.agricultural_id}-${item.crop_id}-${index}`
              }
            >
              <td>#{item.prediction_id ?? "—"}</td>
              <td>#{item.agricultural_id ?? "—"}</td>
              <td>
                <strong>
                  {cropNames[Number(item.crop_id)] ||
                    `Crop ${item.crop_id ?? "—"}`}
                </strong>
              </td>
              <td>
                <strong>
                  {item.predicted_yield == null
                    ? "—"
                    : Number(item.predicted_yield).toFixed(2)}
                </strong>
              </td>
              <td>
                <span className="history-model-badge">
                  {item.model_used ?? "—"}
                </span>
              </td>
              <td>
                {item.prediction_date
                  ? new Date(item.prediction_date).toLocaleDateString("en-IN")
                  : "Not available"}
              </td>
            </tr>
          ))}
        </HistoryTable>
      </section>

      <section className="dashboard-section page-section">
        <HistoryTable
          eyebrow="PRICE HISTORY"
          title="Market Price Prediction History"
          description="Review your previously generated market price forecasts."
          headers={["Crop", "Forecast Price", "Forecast Date", "Model"]}
          rows={priceHistory}
          loading={priceHistoryLoading}
          error={priceHistoryError}
          emptyMessage="No prediction history found yet."
          onRefresh={loadPriceHistory}
        >
          {priceHistory.map((item, index) => (
            <tr
              key={
                item.price_prediction_id ??
                `${item.crop_id}-${item.forecast_date}-${index}`
              }
            >
              <td>
                <strong>
                  {cropNames[Number(item.crop_id)] ||
                    `Crop ${item.crop_id ?? "—"}`}
                </strong>
              </td>
              <td>
                <strong>
                  ₹
                  {item.forecast_price == null
                    ? "—"
                    : Number(item.forecast_price).toLocaleString("en-IN")}
                </strong>
              </td>
              <td>
                {item.forecast_date
                  ? new Date(item.forecast_date).toLocaleDateString("en-IN")
                  : "Not available"}
              </td>
              <td>
                <span className="history-model-badge">
                  {item.model_used ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </HistoryTable>
      </section>
    </div>
  );
}

export default PredictionHistoryPage;
