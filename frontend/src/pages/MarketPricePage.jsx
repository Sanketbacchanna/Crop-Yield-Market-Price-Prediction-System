import { useEffect, useState } from "react";
import NearestMandi from "../components/NearestMandi";
import { API_BASE_URL } from "../services/api";

function MarketPricePage({ initialFilters, liveLocation }) {
  const prefill = initialFilters || {};
  // =========================================================
  // BASIC FILTERS
  // =========================================================

  const [state, setState] = useState(prefill.state || "Karnataka");
  const [district, setDistrict] = useState(prefill.district || "");
  const [commodity, setCommodity] = useState(prefill.commodity || "");
  const [market, setMarket] = useState(prefill.market || "");
  const [variety, setVariety] = useState(prefill.variety || "");

  const [fromDate, setFromDate] = useState(prefill.fromDate || "");
  const [toDate, setToDate] = useState(prefill.toDate || "");

  // Filters actually applied after clicking Search
  const [appliedFilters, setAppliedFilters] = useState({
    state: prefill.state || "Karnataka",
    district: prefill.district || "",
    commodity: prefill.commodity || "",
    market: prefill.market || "",
    variety: prefill.variety || "",
    fromDate: prefill.fromDate || "",
    toDate: prefill.toDate || "",
  });

  // =========================================================
  // DROPDOWN DATA
  // =========================================================

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [varieties, setVarieties] = useState([]);

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
  const [historicalHasNext, setHistoricalHasNext] = useState(false);
  const [priceSummary, setPriceSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // =========================================================
  // AI MARKET INSIGHT
  // =========================================================

  const [marketInsight, setMarketInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  const withSelectedOption = (options, selected) =>
    selected && !options.includes(selected) ? [selected, ...options] : options;

  const districtOptions = withSelectedOption(districts, district);
  const marketOptions = withSelectedOption(markets, market);
  const commodityOptions = withSelectedOption(commodities, commodity);
  const varietyOptions = withSelectedOption(varieties, variety);

  // =========================================================
  // LOAD STATES
  // =========================================================

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/market-price/states`
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

        if (market) {
          params.append("market", market);
        }

        const response = await fetch(
          `${API_BASE_URL}/market-price/history/filters?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical filters");
        }

        const data = await response.json();

        setDistricts(data.districts || []);
        setCommodities(data.commodities || []);
        setMarkets(data.markets || []);
        setVarieties(data.varieties || []);
      } catch (error) {
        console.error("Historical filter loading error:", error);

        setDistricts([]);
        setCommodities([]);
        setMarkets([]);
        setVarieties([]);
      }
    };

    fetchHistoricalFilters();
  }, [state, district, market, commodity]);

  // =========================================================
  // FETCH LIVE MARKET PRICES
  // =========================================================

  useEffect(() => {
    const fetchLivePrices = async () => {
      if (!hasSearched) {
        setLivePrices([]);
        setLiveLoading(false);
        return;
      }

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

        if (appliedFilters.market) {
          params.append("market", appliedFilters.market);
        }

        if (appliedFilters.commodity) {
          params.append("commodity", appliedFilters.commodity);
        }

        if (appliedFilters.variety) {
          params.append("variety", appliedFilters.variety);
        }

        params.append("page", livePage);
        params.append("limit", liveLimit);

        const response = await fetch(
          `${API_BASE_URL}/market-price/live?${params.toString()}`
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
  }, [appliedFilters, hasSearched, livePage, liveLimit]);

  // =========================================================
  // FETCH HISTORICAL MARKET PRICES
  // =========================================================

  useEffect(() => {
    const fetchHistoricalPrices = async () => {
      if (!hasSearched) {
        setHistoricalPrices([]);
        setHistoricalHasNext(false);
        setHistoricalLoading(false);
        return;
      }

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

        if (appliedFilters.variety) {
          params.append("variety", appliedFilters.variety);
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
          `${API_BASE_URL}/market-price/history?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical market prices");
        }

        const data = await response.json();

        setHistoricalPrices(data.data || []);
        setHistoricalHasNext(data.has_next || false);
      } catch (error) {
        console.error("Historical market price error:", error);

        setHistoricalError(
          "Unable to load historical market prices."
        );

        setHistoricalPrices([]);
        setHistoricalHasNext(false);
      } finally {
        setHistoricalLoading(false);
      }
    };

    fetchHistoricalPrices();
  }, [appliedFilters, hasSearched, historicalPage, historicalLimit]);

  useEffect(() => {
    const fetchPriceSummary = async () => {
      if (!hasSearched) {
        setPriceSummary(null);
        setSummaryLoading(false);
        return;
      }

      setSummaryLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(appliedFilters).forEach(([key, value]) => {
          const apiKey = key === "fromDate" || key === "toDate" ? null : key;
          if (apiKey && value) params.append(apiKey, value);
        });
        const response = await fetch(
          `${API_BASE_URL}/market-price/summary?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch price summary");
        setPriceSummary(await response.json());
      } catch (error) {
        console.error("Price summary error:", error);
        setPriceSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchPriceSummary();
  }, [appliedFilters, hasSearched]);

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
        `${API_BASE_URL}/price-prediction/market-insight?${params.toString()}`
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
      variety,
      fromDate,
      toDate,
    };

    setLivePage(1);
    setHistoricalPage(1);

    setHasSearched(true);
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
    setVariety("");

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
    setVariety("");

    setMarketInsight(null);
    setInsightError("");

    setLivePage(1);
    setHistoricalPage(1);
  };

  const handleMarketChange = (value) => {
    setMarket(value);
    setVariety("");
    setMarketInsight(null);
    setInsightError("");
    setLivePage(1);
    setHistoricalPage(1);
  };

  const handleCommodityChange = (value) => {
    setCommodity(value);
    setVariety("");
    setMarketInsight(null);
    setInsightError("");
    setLivePage(1);
    setHistoricalPage(1);
  };

  const formatPrice = (value) =>
    value === null || value === undefined
      ? "—"
      : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const formatChange = (value) =>
    value === null || value === undefined
      ? "—"
      : `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;

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

      <NearestMandi liveLocation={liveLocation} commodity={commodity} />

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

            {districtOptions.map((item) => (
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
            onChange={(e) => handleMarketChange(e.target.value)}
            disabled={!state}
          >
            <option value="">
              All Markets
            </option>

            {marketOptions.map((item) => (
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
            onChange={(e) => handleCommodityChange(e.target.value)}
            disabled={!state}
          >
            <option value="">All Commodities</option>
            {commodityOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* VARIETY */}

        <div className="filter-group">
          <label>Variety</label>
          <select
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            disabled={!commodity}
          >
            <option value="">All Varieties</option>
            {varietyOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
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

      {!hasSearched ? (
        <div className="market-status">
          Search to view market prices and trends.
        </div>
      ) : (
      <div className="market-price-summary" aria-live="polite">
        <div className="market-summary-heading">
          <div>
            <p className="section-eyebrow">PRICE SNAPSHOT</p>
            <h3>Market price trend</h3>
          </div>
          {priceSummary?.latest_date && (
            <span>Latest available: {priceSummary.latest_date}</span>
          )}
        </div>
        <div className="market-summary-grid">
          {[
            ["Today's price", priceSummary?.today, "price"],
            ["Yesterday", priceSummary?.yesterday, "price"],
            ["7-day average", priceSummary?.average_7_day, "price"],
            ["30-day average", priceSummary?.average_30_day, "price"],
            ["Price change", priceSummary?.change_percent, "change"],
          ].map(([label, value, type]) => (
            <div className="market-summary-card" key={label}>
              <span>{label}</span>
              <strong className={type === "change" && Number(value) < 0 ? "negative" : ""}>
                {summaryLoading ? "…" : type === "change" ? formatChange(value) : formatPrice(value)}
              </strong>
              {type === "change" && <small>vs. previous available day</small>}
            </div>
          ))}
        </div>
      </div>
      )}

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

        {!hasSearched && (
          <div className="market-status">
            Search to view live market prices.
          </div>
        )}

        {hasSearched && liveLoading && (
          <div className="market-status">
            Loading live market prices...
          </div>
        )}

        {hasSearched && !liveLoading && liveError && (
          <div className="market-status error">
            {liveError}
          </div>
        )}

        {hasSearched && !liveLoading &&
          !liveError &&
          livePrices.length === 0 && (
            <div className="market-status">
              No live market price data found.
            </div>
          )}

        {hasSearched && !liveLoading &&
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

        {!hasSearched && (
          <div className="market-status">
            Search to view historical market prices.
          </div>
        )}

        {hasSearched && historicalLoading && (
          <div className="market-status">
            Loading historical market prices...
          </div>
        )}

        {hasSearched && !historicalLoading &&
          historicalError && (
            <div className="market-status error">
              {historicalError}
            </div>
          )}

        {hasSearched && !historicalLoading &&
          !historicalError &&
          historicalPrices.length === 0 && (
            <div className="market-status">
              No historical market price data found
              for the selected filters.
            </div>
          )}

        {hasSearched && !historicalLoading &&
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



                <button
                  type="button"
                  disabled={!historicalHasNext}
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
