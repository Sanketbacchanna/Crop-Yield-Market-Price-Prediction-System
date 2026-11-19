import { useEffect, useState } from "react";

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
  // =========================
  // FILTER VALUES
  // =========================

  const [state, setState] = useState("Karnataka");
  const [district, setDistrict] = useState("");
  const [commodity, setCommodity] = useState("");

  const [marketInsight, setMarketInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  // Filters actually used for the market-price API
  const [appliedFilters, setAppliedFilters] = useState({
    state: "Karnataka",
    district: "",
    commodity: "",
  });

  // =========================
  // DROPDOWN DATA
  // =========================

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [commodities, setCommodities] = useState([]);

  // =========================
  // LIVE MARKET DATA
  // =========================

  const [livePrices, setLivePrices] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // =========================
  // LOAD STATES
  // =========================

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/market-price/states"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch states");
        }

        const data = await response.json();
        setStates(data.data || []);
      } catch (error) {
        console.error("State loading error:", error);
      }
    };

    fetchStates();
  }, []);

  // =========================
  // LOAD DISTRICTS
  // =========================

  useEffect(() => {
    const fetchDistricts = async () => {
      if (!state) {
        setDistricts([]);
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/market-price/districts?state=${encodeURIComponent(
            state
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch districts");
        }

        const data = await response.json();
        setDistricts(data.data || []);
      } catch (error) {
        console.error("District loading error:", error);
        setDistricts([]);
      }
    };

    fetchDistricts();
  }, [state]);

  // =========================
  // LOAD COMMODITIES
  // =========================

  useEffect(() => {
    const fetchCommodities = async () => {
      if (!state || !district) {
        setCommodities([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          state,
          district,
        });

        const response = await fetch(
          `http://127.0.0.1:8000/market-price/commodities?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch commodities");
        }

        const data = await response.json();
        setCommodities(data.data || []);
      } catch (error) {
        console.error("Commodity loading error:", error);
        setCommodities([]);
      }
    };

    fetchCommodities();
  }, [state, district]);

  // =========================
  // FETCH LIVE MARKET PRICES
  // =========================

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        setLiveLoading(true);
        setLiveError("");

        const params = new URLSearchParams();

        if (appliedFilters.state) {
          params.append("state", appliedFilters.state);
        }

        if (appliedFilters.district) {
          params.append("district", appliedFilters.district);
        }

        if (appliedFilters.commodity) {
          params.append("commodity", appliedFilters.commodity);
        }

        params.append("page", page);
        params.append("limit", limit);

        const response = await fetch(
          `http://127.0.0.1:8000/market-price/live?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch live market prices");
        }

        const data = await response.json();
        setLivePrices(data.data || []);
      } catch (error) {
        console.error("Live market price error:", error);
        setLiveError("Unable to load live market prices.");
        setLivePrices([]);
      } finally {
        setLiveLoading(false);
      }
    };

    fetchLivePrices();
  }, [appliedFilters, page, limit]);

  // =========================
  // FETCH MARKET INSIGHT
  // =========================

  const fetchMarketInsight = async (filters) => {
    if (!filters.state || !filters.district || !filters.commodity) {
      setMarketInsight(null);
      setInsightError("");
      return;
    }

    try {
      setInsightLoading(true);
      setInsightError("");
      setMarketInsight(null);

      const params = new URLSearchParams({
        state: filters.state,
        district: filters.district,
        commodity: filters.commodity,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/price-prediction/market-insight?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to fetch market insight"
        );
      }

      setMarketInsight(data);
    } catch (error) {
      console.error("Market insight error:", error);

      setMarketInsight(null);
      setInsightError(
        error.message || "Unable to load market insight."
      );
    } finally {
      setInsightLoading(false);
    }
  };

  // =========================
  // SEARCH
  // =========================

  const handleSearch = () => {
    const filters = {
      state,
      district,
      commodity,
    };

    setPage(1);

    setAppliedFilters(filters);

    fetchMarketInsight(filters);
  };

  // =========================
  // RENDER
  // =========================

  return (
    <section
      className="dashboard-section page-section"
      id="market-price"
    >
      {/* =========================
          PRICE PREDICTION
      ========================= */}

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

      {/* =========================
          LIVE MANDI PRICES
      ========================= */}

      <div className="live-market-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">LIVE MARKET</p>

            <h2>Live Mandi Prices</h2>

            <p>
              View the latest available mandi prices from AGMARKNET.
            </p>
          </div>
        </div>

        {/* =========================
            FILTERS
        ========================= */}

        <div className="market-filters">
          {/* STATE */}

          <div className="filter-group">
            <label>State</label>

            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setDistrict("");
                setCommodity("");
                setMarketInsight(null);
                setInsightError("");
                setPage(1);
              }}
            >
              <option value="">Select State</option>

              {states.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* DISTRICT */}

          <div className="filter-group">
            <label>District</label>

            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setCommodity("");
                setMarketInsight(null);
                setInsightError("");
                setPage(1);
              }}
              disabled={!state}
            >
              <option value="">Select District</option>

              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* COMMODITY */}

          <div className="filter-group">
            <label>Commodity</label>

            <select
              value={commodity}
              onChange={(e) => {
                setCommodity(e.target.value);
                setMarketInsight(null);
                setInsightError("");
                setPage(1);
              }}
              disabled={!district}
            >
              <option value="">Select Commodity</option>

              {commodities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* SEARCH */}

          <button
            type="button"
            className="primary-button"
            onClick={handleSearch}
            disabled={!state || !district || !commodity}
          >
            Search
          </button>
        </div>

        {/* =========================
            LIVE MARKET LOADING
        ========================= */}

        {liveLoading && (
          <div className="market-status">
            Loading live market prices...
          </div>
        )}

        {/* =========================
            LIVE MARKET ERROR
        ========================= */}

        {!liveLoading && liveError && (
          <div className="market-status error">
            {liveError}
          </div>
        )}

        {/* =========================
            NO MARKET DATA
        ========================= */}

        {!liveLoading &&
          !liveError &&
          livePrices.length === 0 && (
            <div className="market-status">
              No market price data found for the selected filters.
            </div>
          )}

        {/* =========================
            MARKET TABLE
        ========================= */}

        {!liveLoading && livePrices.length > 0 && (
          <div className="market-table-wrapper">
            <table className="market-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Commodity</th>
                  <th>Variety</th>
                  <th>Min Price</th>
                  <th>Max Price</th>
                  <th>Modal Price</th>
                  <th>Arrival Date</th>
                  <th>Source</th>
                </tr>
              </thead>

              <tbody>
                {livePrices.map((item) => (
                  <tr key={item.id}>
                    <td>{item.market || "-"}</td>

                    <td>{item.commodity || "-"}</td>

                    <td>{item.variety || "-"}</td>

                    <td>
                      ₹
                      {Number(item.min_price).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      ₹
                      {Number(item.max_price).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      <strong>
                        ₹
                        {Number(item.modal_price).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </td>

                    <td>{item.arrival_date || "-"}</td>

                    <td>{item.source || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================
            MARKET INSIGHT LOADING
        ========================= */}

        {insightLoading && (
          <div className="market-insight-status">
            Generating market insight...
          </div>
        )}

        {/* =========================
            MARKET INSIGHT ERROR
        ========================= */}

        {!insightLoading && insightError && (
          <div className="market-insight-status error">
            {insightError}
          </div>
        )}

        {/* =========================
            MARKET INSIGHT CARD
        ========================= */}

        {!insightLoading &&
          !insightError &&
          marketInsight && (
            <div className="market-insight-card">
              <div className="market-insight-header">
                <div>
                  <p className="section-eyebrow">
                    AI MARKET INSIGHT
                  </p>

                  <h3>
                    {marketInsight.commodity} Price Outlook
                  </h3>

                  <p>
                    {marketInsight.location.district},{" "}
                    {marketInsight.location.state}
                  </p>
                </div>
              </div>

              <div className="market-insight-grid">
                {/* CURRENT PRICE */}

                <div className="insight-item">
                  <span>Current Mandi Price</span>

                  <strong>
                    ₹
                    {Number(
                      marketInsight.current_market.modal_price
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* PREDICTED PRICE */}

                <div className="insight-item">
                  <span>Predicted Price</span>

                  <strong>
                    ₹
                    {Number(
                      marketInsight.prediction.predicted_price
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* PRICE CHANGE */}

                <div className="insight-item">
                  <span>Expected Change</span>

                  <strong
                    className={
                      marketInsight.prediction.change >= 0
                        ? "positive-value"
                        : "negative-value"
                    }
                  >
                    {marketInsight.prediction.change >= 0 ? "+" : "-"}₹
                    {Number(
                      Math.abs(marketInsight.prediction.change)
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* PERCENTAGE CHANGE */}

                <div className="insight-item">
                  <span>Expected Change %</span>

                  <strong
                    className={
                      marketInsight.prediction.change_percent >= 0
                        ? "positive-value"
                        : "negative-value"
                    }
                  >
                    {marketInsight.prediction.change_percent >= 0
                      ? "+"
                      : ""}
                    {marketInsight.prediction.change_percent}%
                  </strong>
                </div>
              </div>

              {/* RECOMMENDATION */}

              <div className="market-recommendation">
                <span>Recommendation</span>

                <p>
                  {marketInsight.recommendation}
                </p>
              </div>

              {/* CURRENT MARKET DETAILS */}

              <div className="market-insight-details">
                <div>
                  <span>Market</span>
                  <strong>
                    {marketInsight.current_market.market || "-"}
                  </strong>
                </div>

                <div>
                  <span>Variety</span>
                  <strong>
                    {marketInsight.current_market.variety || "-"}
                  </strong>
                </div>

                <div>
                  <span>Arrival Date</span>
                  <strong>
                    {marketInsight.current_market.arrival_date || "-"}
                  </strong>
                </div>
              </div>
            </div>
          )}

        {/* =========================
            PAGINATION
        ========================= */}

        {!liveLoading && livePrices.length > 0 && (
          <div className="market-pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((current) => current - 1)
              }
            >
              Previous
            </button>

            <span>Page {page}</span>

            <button
              type="button"
              disabled={livePrices.length < limit}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default MarketPricePage;