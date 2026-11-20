import { useEffect, useState } from "react";

function MarketPricePage() {
  // =========================================================
  // BASIC FILTERS
  // =========================================================

  const [state, setState] = useState("Karnataka");
  const [district, setDistrict] = useState("");
  const [commodity, setCommodity] = useState("");
  const [market, setMarket] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Filters actually applied after clicking Search
  const [appliedFilters, setAppliedFilters] = useState({
    state: "Karnataka",
    district: "",
    commodity: "",
    market: "",
    fromDate: "",
    toDate: "",
  });

  // =========================================================
  // DROPDOWN DATA
  // =========================================================

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [markets, setMarkets] = useState([]);

  // =========================================================
  // LIVE MARKET DATA
  // =========================================================

  const [livePrices, setLivePrices] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");

  const [livePage, setLivePage] = useState(1);
  const [liveLimit] = useState(20);

  // =========================================================
  // HISTORICAL MARKET DATA
  // =========================================================

  const [historicalPrices, setHistoricalPrices] = useState([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState("");

  const [historicalPage, setHistoricalPage] = useState(1);
  const [historicalLimit] = useState(20);
  const [historicalTotal, setHistoricalTotal] = useState(0);

  // =========================================================
  // AI MARKET INSIGHT
  // =========================================================

  const [marketInsight, setMarketInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  // =========================================================
  // LOAD STATES
  // =========================================================

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

  // =========================================================
  // LOAD HISTORICAL FILTERS
  // =========================================================

  useEffect(() => {
    const fetchHistoricalFilters = async () => {
      if (!state) {
        setDistricts([]);
        setCommodities([]);
        setMarkets([]);
        return;
      }

      try {
        const params = new URLSearchParams();

        params.append("state", state);

        if (district) {
          params.append("district", district);
        }

        if (commodity) {
          params.append("commodity", commodity);
        }

        const response = await fetch(
          `http://127.0.0.1:8000/market-price/history/filters?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical filters");
        }

        const data = await response.json();

        setDistricts(data.districts || []);
        setCommodities(data.commodities || []);
        setMarkets(data.markets || []);
      } catch (error) {
        console.error("Historical filter loading error:", error);

        setDistricts([]);
        setCommodities([]);
        setMarkets([]);
      }
    };

    fetchHistoricalFilters();
  }, [state, district, commodity]);

  // =========================================================
  // FETCH LIVE MARKET PRICES
  // =========================================================

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

        params.append("page", livePage);
        params.append("limit", liveLimit);

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
  }, [appliedFilters, livePage, liveLimit]);

  // =========================================================
  // FETCH HISTORICAL MARKET PRICES
  // =========================================================

  useEffect(() => {
    const fetchHistoricalPrices = async () => {
      try {
        setHistoricalLoading(true);
        setHistoricalError("");

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

        if (appliedFilters.market) {
          params.append("market", appliedFilters.market);
        }

        if (appliedFilters.fromDate) {
          params.append("from_date", appliedFilters.fromDate);
        }

        if (appliedFilters.toDate) {
          params.append("to_date", appliedFilters.toDate);
        }

        params.append("page", historicalPage);
        params.append("limit", historicalLimit);

        const response = await fetch(
          `http://127.0.0.1:8000/market-price/history?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical market prices");
        }

        const data = await response.json();

        setHistoricalPrices(data.data || []);
        setHistoricalTotal(data.total || 0);
      } catch (error) {
        console.error("Historical market price error:", error);

        setHistoricalError(
          "Unable to load historical market prices."
        );

        setHistoricalPrices([]);
        setHistoricalTotal(0);
      } finally {
        setHistoricalLoading(false);
      }
    };

    fetchHistoricalPrices();
  }, [appliedFilters, historicalPage, historicalLimit]);

  // =========================================================
  // FETCH MARKET INSIGHT
  // =========================================================

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

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = () => {
    const filters = {
      state,
      district,
      commodity,
      market,
      fromDate,
      toDate,
    };

    setLivePage(1);
    setHistoricalPage(1);

    setAppliedFilters(filters);

    fetchMarketInsight(filters);
  };

  // =========================================================
  // STATE CHANGE
  // =========================================================

  const handleStateChange = (value) => {
    setState(value);

    setDistrict("");
    setCommodity("");
    setMarket("");

    setMarketInsight(null);
    setInsightError("");

    setLivePage(1);
    setHistoricalPage(1);
  };

  // =========================================================
  // DISTRICT CHANGE
  // =========================================================

  const handleDistrictChange = (value) => {
    setDistrict(value);

    setCommodity("");
    setMarket("");

    setMarketInsight(null);
    setInsightError("");

    setLivePage(1);
    setHistoricalPage(1);
  };

  // =========================================================
  // COMMODITY CHANGE
  // =========================================================

  const handleCommodityChange = (value) => {
    setCommodity(value);

    setMarket("");

    setMarketInsight(null);
    setInsightError("");

    setLivePage(1);
    setHistoricalPage(1);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section
      className="dashboard-section page-section"
      id="market-price"
    >
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="section-heading">
        <div>
          <p className="section-eyebrow">MARKET DATA</p>

          <h2>Market Price</h2>

          <p>
            View live mandi prices, historical market prices and
            AI-powered market insights.
          </p>
        </div>
      </div>

      {/* =====================================================
          MARKET FILTERS
      ===================================================== */}

      <div className="market-filters">
        {/* STATE */}

        <div className="filter-group">
          <label>State</label>

          <select
            value={state}
            onChange={(e) =>
              handleStateChange(e.target.value)
            }
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
            onChange={(e) =>
              handleDistrictChange(e.target.value)
            }
            disabled={!state}
          >
            <option value="">
              All Districts
            </option>

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
            onChange={(e) =>
              handleCommodityChange(e.target.value)
            }
            disabled={!state}
          >
            <option value="">
              All Commodities
            </option>

            {commodities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* MARKET */}

        <div className="filter-group">
          <label>Market</label>

          <select
            value={market}
            onChange={(e) => {
              setMarket(e.target.value);
              setHistoricalPage(1);
            }}
            disabled={!state}
          >
            <option value="">
              All Markets
            </option>

            {markets.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* FROM DATE */}

        <div className="filter-group">
          <label>From Date</label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) =>
              setFromDate(e.target.value)
            }
          />
        </div>

        {/* TO DATE */}

        <div className="filter-group">
          <label>To Date</label>

          <input
            type="date"
            value={toDate}
            onChange={(e) =>
              setToDate(e.target.value)
            }
          />
        </div>

        {/* SEARCH */}

        <button
          type="button"
          className="primary-button"
          onClick={handleSearch}
          disabled={!state}
        >
          Search
        </button>
      </div>

      {/* =====================================================
          LIVE MANDI PRICES
      ===================================================== */}

      <div className="live-market-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              LIVE MARKET
            </p>

            <h2>Live Mandi Prices</h2>

            <p>
              View the latest available mandi prices from
              AGMARKNET.
            </p>
          </div>
        </div>

        {liveLoading && (
          <div className="market-status">
            Loading live market prices...
          </div>
        )}

        {!liveLoading && liveError && (
          <div className="market-status error">
            {liveError}
          </div>
        )}

        {!liveLoading &&
          !liveError &&
          livePrices.length === 0 && (
            <div className="market-status">
              No live market price data found.
            </div>
          )}

        {!liveLoading &&
          !liveError &&
          livePrices.length > 0 && (
            <div className="market-table-wrapper">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>District</th>
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
                      <td>{item.district || "-"}</td>

                      <td>{item.market || "-"}</td>

                      <td>{item.commodity || "-"}</td>

                      <td>{item.variety || "-"}</td>

                      <td>
                        ₹
                        {Number(
                          item.min_price
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        ₹
                        {Number(
                          item.max_price
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            item.modal_price
                          ).toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td>
                        {item.arrival_date || "-"}
                      </td>

                      <td>
                        {item.source || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* LIVE PAGINATION */}

        {!liveLoading &&
          livePrices.length > 0 && (
            <div className="market-pagination">
              <button
                type="button"
                disabled={livePage === 1}
                onClick={() =>
                  setLivePage(
                    (current) => current - 1
                  )
                }
              >
                Previous
              </button>

              <span>
                Page {livePage}
              </span>

              <button
                type="button"
                disabled={
                  livePrices.length < liveLimit
                }
                onClick={() =>
                  setLivePage(
                    (current) => current + 1
                  )
                }
              >
                Next
              </button>
            </div>
          )}
      </div>

      {/* =====================================================
          HISTORICAL MARKET PRICES
      ===================================================== */}

      <div className="historical-market-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              HISTORICAL MARKET
            </p>

            <h2>Historical Market Prices</h2>

            <p>
              Explore historical mandi prices across
              Karnataka districts, markets and commodities.
            </p>
          </div>
        </div>

        {historicalLoading && (
          <div className="market-status">
            Loading historical market prices...
          </div>
        )}

        {!historicalLoading &&
          historicalError && (
            <div className="market-status error">
              {historicalError}
            </div>
          )}

        {!historicalLoading &&
          !historicalError &&
          historicalPrices.length === 0 && (
            <div className="market-status">
              No historical market price data found
              for the selected filters.
            </div>
          )}

        {!historicalLoading &&
          !historicalError &&
          historicalPrices.length > 0 && (
            <>
              <div className="market-table-wrapper">
                <table className="market-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>District</th>
                      <th>Market</th>
                      <th>Commodity</th>
                      <th>Variety</th>
                      <th>Min Price</th>
                      <th>Max Price</th>
                      <th>Modal Price</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historicalPrices.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.arrival_date || "-"}
                        </td>

                        <td>
                          {item.district || "-"}
                        </td>

                        <td>
                          {item.market || "-"}
                        </td>

                        <td>
                          {item.commodity || "-"}
                        </td>

                        <td>
                          {item.variety || "-"}
                        </td>

                        <td>
                          ₹
                          {Number(
                            item.min_price
                          ).toLocaleString("en-IN")}
                        </td>

                        <td>
                          ₹
                          {Number(
                            item.max_price
                          ).toLocaleString("en-IN")}
                        </td>

                        <td>
                          <strong>
                            ₹
                            {Number(
                              item.modal_price
                            ).toLocaleString("en-IN")}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HISTORICAL PAGINATION */}

              <div className="market-pagination">
                <button
                  type="button"
                  disabled={
                    historicalPage === 1
                  }
                  onClick={() =>
                    setHistoricalPage(
                      (current) => current - 1
                    )
                  }
                >
                  Previous
                </button>

                <span>
                  Page {historicalPage}
                </span>

                <span>
                  {historicalTotal.toLocaleString(
                    "en-IN"
                  )}{" "}
                  records
                </span>

                <button
                  type="button"
                  disabled={
                    historicalPage *
                      historicalLimit >=
                    historicalTotal
                  }
                  onClick={() =>
                    setHistoricalPage(
                      (current) => current + 1
                    )
                  }
                >
                  Next
                </button>
              </div>
            </>
          )}
      </div>

      {/* =====================================================
          AI MARKET INSIGHT
      ===================================================== */}

      {insightLoading && (
        <div className="market-insight-status">
          Generating market insight...
        </div>
      )}

      {!insightLoading && insightError && (
        <div className="market-insight-status error">
          {insightError}
        </div>
      )}

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
                  {marketInsight.commodity}{" "}
                  Price Outlook
                </h3>

                <p>
                  {marketInsight.location.district},{" "}
                  {marketInsight.location.state}
                </p>
              </div>
            </div>

            <div className="market-insight-grid">
              <div className="insight-item">
                <span>
                  Current Mandi Price
                </span>

                <strong>
                  ₹
                  {Number(
                    marketInsight.current_market
                      .modal_price
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="insight-item">
                <span>
                  Predicted Price
                </span>

                <strong>
                  ₹
                  {Number(
                    marketInsight.prediction
                      .predicted_price
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="insight-item">
                <span>
                  Expected Change
                </span>

                <strong
                  className={
                    marketInsight.prediction
                      .change >= 0
                      ? "positive-value"
                      : "negative-value"
                  }
                >
                  {marketInsight.prediction.change >=
                  0
                    ? "+"
                    : "-"}
                  ₹
                  {Number(
                    Math.abs(
                      marketInsight.prediction
                        .change
                    )
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="insight-item">
                <span>
                  Expected Change %
                </span>

                <strong
                  className={
                    marketInsight.prediction
                      .change_percent >= 0
                      ? "positive-value"
                      : "negative-value"
                  }
                >
                  {marketInsight.prediction
                    .change_percent >= 0
                    ? "+"
                    : ""}
                  {
                    marketInsight.prediction
                      .change_percent
                  }
                  %
                </strong>
              </div>
            </div>

            <div className="market-recommendation">
              <span>Recommendation</span>

              <p>
                {marketInsight.recommendation}
              </p>
            </div>

            <div className="market-insight-details">
              <div>
                <span>Market</span>

                <strong>
                  {marketInsight.current_market
                    .market || "-"}
                </strong>
              </div>

              <div>
                <span>Variety</span>

                <strong>
                  {marketInsight.current_market
                    .variety || "-"}
                </strong>
              </div>

              <div>
                <span>Arrival Date</span>

                <strong>
                  {marketInsight.current_market
                    .arrival_date || "-"}
                </strong>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}

export default MarketPricePage;