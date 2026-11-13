import { useCallback, useEffect, useState } from "react";
import CropRecommendation from "./components/CropRecommendation";
import DashboardHeader, { DashboardIntro } from "./components/DashboardHeader";
import Sidebar from "./components/Sidebar";
import SummaryCard from "./components/SummaryCard";
import HistoryTable from "./components/HistoryTable";
import {
  PricePredictionForm,
  PricePredictionResult,
} from "./components/PricePrediction";
import YieldPrediction from "./components/YieldPrediction";
import {
  createPriceForecast,
  createYieldPrediction,
  getAgriculturalRecords,
  getCropRecommendations,
  getPriceHistory,
  getYieldHistory,
} from "./services/api";
import "./App.css";

const INITIAL_PRICES = {
  previousMonth: "2800",
  previousTwoMonths: "2750",
  previousThreeMonths: "2700",
  averagePrice: "2750",
};

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function App() {
  const [cropId, setCropId] = useState("1");
  const [prices, setPrices] = useState(INITIAL_PRICES);
  const [priceResult, setPriceResult] = useState(null);
  const [priceError, setPriceError] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);

  const [agriculturalRecords, setAgriculturalRecords] = useState([]);
  const [selectedAgriculturalId, setSelectedAgriculturalId] = useState("");
  const [agriculturalError, setAgriculturalError] = useState("");

  const [yieldResult, setYieldResult] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState("");
  const [yieldHistory, setYieldHistory] = useState([]);
  const [yieldHistoryLoading, setYieldHistoryLoading] = useState(true);
  const [yieldHistoryError, setYieldHistoryError] = useState("");

  const [recommendationResult, setRecommendationResult] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(true);
  const [priceHistoryError, setPriceHistoryError] = useState("");

  const loadPriceHistory = useCallback(async () => {
    setPriceHistoryLoading(true);
    setPriceHistoryError("");
    try {
      setPriceHistory(await getPriceHistory());
    } catch (error) {
      setPriceHistoryError(
        getErrorMessage(error, "Unable to load prediction history.")
      );
    } finally {
      setPriceHistoryLoading(false);
    }
  }, []);

  const loadYieldHistory = useCallback(async () => {
    setYieldHistoryLoading(true);
    setYieldHistoryError("");
    try {
      setYieldHistory(await getYieldHistory());
    } catch (error) {
      setYieldHistoryError(
        getErrorMessage(error, "Unable to load yield prediction history.")
      );
    } finally {
      setYieldHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const results = await Promise.allSettled([
        getPriceHistory(),
        getYieldHistory(),
        getAgriculturalRecords(),
      ]);

      if (!active) {
        return;
      }

      if (results[0].status === "fulfilled") {
        setPriceHistory(results[0].value);
      } else {
        setPriceHistoryError(
          getErrorMessage(
            results[0].reason,
            "Unable to load prediction history."
          )
        );
      }
      setPriceHistoryLoading(false);

      if (results[1].status === "fulfilled") {
        setYieldHistory(results[1].value);
      } else {
        setYieldHistoryError(
          getErrorMessage(
            results[1].reason,
            "Unable to load yield prediction history."
          )
        );
      }
      setYieldHistoryLoading(false);

      if (results[2].status === "fulfilled") {
        const records = results[2].value;
        setAgriculturalRecords(records);
        if (records.length > 0) {
          setSelectedAgriculturalId(String(records[0].agricultural_id));
        }
      } else {
        setAgriculturalError(
          getErrorMessage(
            results[2].reason,
            "Unable to load agricultural records."
          )
        );
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  function handlePriceChange(event) {
    setPrices((currentPrices) => ({
      ...currentPrices,
      [event.target.name]: event.target.value,
    }));
  }

  async function handlePriceSubmit(event) {
    event.preventDefault();
    setPriceLoading(true);
    setPriceResult(null);
    setPriceError("");

    try {
      setPriceResult(await createPriceForecast({ cropId, prices }));
      await loadPriceHistory();
    } catch (error) {
      setPriceError(getErrorMessage(error, "Unable to connect to the API."));
    } finally {
      setPriceLoading(false);
    }
  }

  async function handleYieldSubmit(event) {
    event.preventDefault();
    if (!selectedAgriculturalId) {
      setYieldError("Please select an agricultural record.");
      return;
    }

    setYieldLoading(true);
    setYieldError("");
    setYieldResult(null);

    try {
      setYieldResult(await createYieldPrediction(selectedAgriculturalId));
      await loadYieldHistory();
    } catch (error) {
      setYieldError(getErrorMessage(error, "Unable to predict crop yield."));
    } finally {
      setYieldLoading(false);
    }
  }

  async function handleCropRecommendation(event) {
    event.preventDefault();
    if (!selectedAgriculturalId) {
      setRecommendationError("Please select an agricultural record.");
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendationResult(null);

    try {
      setRecommendationResult(
        await getCropRecommendations(selectedAgriculturalId)
      );
    } catch (error) {
      setRecommendationError(
        getErrorMessage(
          error,
          "Unable to connect to the crop recommendation API."
        )
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  // <div className="app-shell">
  //   <DashboardHeader />

  //   <main className="dashboard">
  //     <DashboardIntro />
  //     <div className="content-grid">
  //       <PricePredictionForm
  //         cropId={cropId}
  //         onCropChange={setCropId}
  //         prices={prices}
  //         onPriceChange={handlePriceChange}
  //         onSubmit={handlePriceSubmit}
  //         loading={priceLoading}
  //         error={priceError}
  //       />
  //       <PricePredictionResult result={priceResult} />

  //       <HistoryTable
  //         eyebrow="SAVED PREDICTIONS"
  //         title="Crop Yield Prediction History"
  //         description="Review your previously generated yield estimates."
  //         headers={[
  //           "Prediction ID",
  //           "Agricultural ID",
  //           "Crop ID",
  //           "Predicted Yield",
  //           "Model",
  //           "Prediction Date",
  //         ]}
  //         rows={yieldHistory}
  //         loading={yieldHistoryLoading}
  //         error={yieldHistoryError}
  //         emptyMessage="No yield predictions found yet."
  //         onRefresh={loadYieldHistory}
  //         refreshPlacement="header"
  //       >
  //         {yieldHistory.map((item, index) => (
  //           <tr
  //             key={
  //               item.prediction_id ??
  //               `${item.agricultural_id}-${item.crop_id}-${index}`
  //             }
  //           >
  //             <td>{item.prediction_id ?? "—"}</td>
  //             <td>{item.agricultural_id ?? "—"}</td>
  //             <td>{item.crop_id ?? "—"}</td>
  //             <td>
  //               {item.predicted_yield == null
  //                 ? "—"
  //                 : Number(item.predicted_yield).toFixed(2)}
  //             </td>
  //             <td>{item.model_used ?? "—"}</td>
  //             <td>
  //               {item.prediction_date
  //                 ? new Date(item.prediction_date).toLocaleDateString()
  //                 : "Not available"}
  //             </td>
  //           </tr>
  //         ))}
  //       </HistoryTable>
  //     </div>

  //     <YieldPrediction
  //       agriculturalRecords={agriculturalRecords}
  //       selectedAgriculturalId={selectedAgriculturalId}
  //       onAgriculturalChange={setSelectedAgriculturalId}
  //       onSubmit={handleYieldSubmit}
  //       loading={yieldLoading}
  //       error={yieldError || agriculturalError}
  //       result={yieldResult}
  //     />
  //   </main>

  //   <HistoryTable
  //     title="Prediction history"
  //     description="Your previously saved crop market price forecasts."
  //     headers={["Crop", "Forecast price", "Forecast date", "Model"]}
  //     rows={priceHistory}
  //     loading={priceHistoryLoading}
  //     error={priceHistoryError}
  //     emptyMessage="No prediction history found yet."
  //     onRefresh={loadPriceHistory}
  //   >
  //     {priceHistory.map((item) => {
  //       const cropNames = { 1: "Rice", 2: "Wheat", 3: "Maize" };
  //       return (
  //         <tr key={item.price_prediction_id}>
  //           <td>
  //             {cropNames[Number(item.crop_id)] || `Crop ${item.crop_id}`}
  //           </td>
  //           <td>
  //             ₹{Number(item.forecast_price).toLocaleString("en-IN")}
  //           </td>
  //           <td>{item.forecast_date}</td>
  //           <td>{item.model_used}</td>
  //         </tr>
  //       );
  //     })}
  //   </HistoryTable>

  //   <CropRecommendation
  //     agriculturalRecords={agriculturalRecords}
  //     selectedAgriculturalId={selectedAgriculturalId}
  //     onAgriculturalChange={setSelectedAgriculturalId}
  //     onSubmit={handleCropRecommendation}
  //     loading={recommendationLoading}
  //     error={recommendationError || agriculturalError}
  //     result={recommendationResult}
  //   />

  //   <footer className="footer">
  //     AgriPredict · Crop market price forecasting
  //   </footer>
  // </div>
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <DashboardHeader />

        <main className="dashboard">
          <DashboardIntro />

          <section className="summary-grid">
            <SummaryCard
              icon="🌾"
              label="Recommended Crop"
              value={
                recommendationResult?.recommendations?.[0]?.crop_name || "—"
              }
              description={
                recommendationResult?.recommendations?.[0]
                  ? `Rank #${recommendationResult.recommendations[0].recommendation_rank}`
                  : "Generate a recommendation"
              }
              accent="green"
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
                  ? priceResult.crop_name
                  : "Generate a price forecast"
              }
              accent="orange"
            />

            <SummaryCard
              icon="🌱"
              label="Predicted Yield"
              value={
                yieldResult?.predicted_yield != null
                  ? Number(yieldResult.predicted_yield).toFixed(2)
                  : "—"
              }
              description={
                yieldResult?.crop_name
                  ? yieldResult.crop_name
                  : "Generate a yield prediction"
              }
              accent="blue"
            />
            <SummaryCard
              icon="📍"
              label="Farm Location"
              value={
                agriculturalRecords.length > 0
                  ? agriculturalRecords[0].district || "—"
                  : "—"
              }
              description={
                agriculturalRecords.length > 0
                  ? `${agriculturalRecords[0].season || "Season"} • ${agriculturalRecords[0].cultivated_area ?? "—"
                  } acres`
                  : "No agricultural record"
              }
              accent="purple"
            />
          </section>


          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">PREDICTIONS</p>
                <h2>Market Price</h2>
                <p>
                  Forecast the expected market price using recent historical
                  prices.
                </p>
              </div>
            </div>

            <div className="content-grid">
              <PricePredictionForm
                cropId={cropId}
                onCropChange={setCropId}
                prices={prices}
                onPriceChange={handlePriceChange}
                onSubmit={handlePriceSubmit}
                loading={priceLoading}
                error={priceError}
              />

              <PricePredictionResult result={priceResult} />
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">MACHINE LEARNING</p>
                <h2>Crop Yield Prediction</h2>
                <p>
                  Estimate crop yield using your agricultural information.
                </p>
              </div>
            </div>

            <YieldPrediction
              agriculturalRecords={agriculturalRecords}
              selectedAgriculturalId={selectedAgriculturalId}
              onAgriculturalChange={setSelectedAgriculturalId}
              onSubmit={handleYieldSubmit}
              loading={yieldLoading}
              error={yieldError || agriculturalError}
              result={yieldResult}
            />
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">SMART RECOMMENDATION</p>
                <h2>Crop Recommendation</h2>
                <p>
                  Find the most suitable crop based on your agricultural
                  information.
                </p>
              </div>
            </div>

            <CropRecommendation
              agriculturalRecords={agriculturalRecords}
              selectedAgriculturalId={selectedAgriculturalId}
              onAgriculturalChange={setSelectedAgriculturalId}
              onSubmit={handleCropRecommendation}
              loading={recommendationLoading}
              error={recommendationError || agriculturalError}
              result={recommendationResult}
            />
          </section>

          <section className="dashboard-section">
            <HistoryTable
              eyebrow="YIELD HISTORY"
              title="Crop Yield Prediction History"
              description="Review your previously generated yield estimates."
              headers={[
                "Prediction ID",
                "Agricultural ID",
                "Crop ID",
                "Predicted Yield",
                "Model",
                "Prediction Date",
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
                  <td>{item.prediction_id ?? "—"}</td>
                  <td>{item.agricultural_id ?? "—"}</td>
                  <td>{item.crop_id ?? "—"}</td>
                  <td>
                    {item.predicted_yield == null
                      ? "—"
                      : Number(item.predicted_yield).toFixed(2)}
                  </td>
                  <td>{item.model_used ?? "—"}</td>
                  <td>
                    {item.prediction_date
                      ? new Date(item.prediction_date).toLocaleDateString()
                      : "Not available"}
                  </td>
                </tr>
              ))}
            </HistoryTable>
          </section>

          <section className="dashboard-section">
            <HistoryTable
              eyebrow="PRICE HISTORY"
              title="Market Price Prediction History"
              description="Review your previously generated market price forecasts."
              headers={["Crop", "Forecast price", "Forecast date", "Model"]}
              rows={priceHistory}
              loading={priceHistoryLoading}
              error={priceHistoryError}
              emptyMessage="No prediction history found yet."
              onRefresh={loadPriceHistory}
            >
              {priceHistory.map((item) => {
                const cropNames = {
                  1: "Rice",
                  2: "Wheat",
                  3: "Maize",
                };

                return (
                  <tr key={item.price_prediction_id}>
                    <td>
                      {cropNames[Number(item.crop_id)] ||
                        `Crop ${item.crop_id}`}
                    </td>

                    <td>
                      ₹{Number(item.forecast_price).toLocaleString("en-IN")}
                    </td>

                    <td>{item.forecast_date}</td>

                    <td>{item.model_used}</td>
                  </tr>
                );
              })}
            </HistoryTable>
          </section>
        </main>

        <footer className="footer">
          AgriPredict · Smart Agriculture Prediction Platform
        </footer>
      </div>
    </div>
  );
}

export default App;
