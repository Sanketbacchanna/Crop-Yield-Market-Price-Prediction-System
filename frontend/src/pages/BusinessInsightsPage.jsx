import { useEffect, useMemo, useState } from "react";
import {
  getHistoricalPriceCrops,
  getHistoricalPriceTrend,
  getHistoricalYield,
} from "../services/api";
import { downloadExcelCsv } from "../utils/export";
import "./BusinessInsightsPage.css";

function TrendChart({ values, valueKey, label, formatValue }) {
  if (!values.length) {
    return <p className="insights-empty">No history is available for this selection.</p>;
  }

  const width = 760;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 62 };
  const numbers = values.map((entry) => Number(entry[valueKey]));
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  const range = maximum - minimum || 1;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = numbers.map((value, index) => {
    const x = padding.left + (index / Math.max(numbers.length - 1, 1)) * chartWidth;
    const y = padding.top + ((maximum - value) / range) * chartHeight;
    return { x, y, value, item: values[index] };
  });
  const pointList = points.map((point) => `${point.x},${point.y}`).join(" ");
  const axisLabels = [minimum, minimum + range / 2, maximum];

  return (
    <div className="insights-chart-scroll">
      <svg
        className="insights-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        {axisLabels.map((value, index) => {
          const y = padding.top + (index / 2) * chartHeight;
          return (
            <g key={index}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="insights-grid-line"
              />
              <text x={padding.left - 10} y={y + 4} textAnchor="end">
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        <polyline points={pointList} className="insights-chart-line" />
        {points.map((point, index) => (
          <circle
            key={`${point.item.date || point.item.crop_year}-${index}`}
            cx={point.x}
            cy={point.y}
            r={numbers.length < 36 ? 4 : 2}
            className="insights-chart-point"
          >
            <title>
              {point.item.date || point.item.crop_year}: {formatValue(point.value)}
            </title>
          </circle>
        ))}
        <text x={padding.left} y={height - 12}>
          {values[0].date?.slice(0, 7) || values[0].crop_year}
        </text>
        <text x={width - padding.right} y={height - 12} textAnchor="end">
          {values.at(-1).date?.slice(0, 7) || values.at(-1).crop_year}
        </text>
      </svg>
    </div>
  );
}

function ChartSkeleton({ label }) {
  return (
    <div className="chart-skeleton" role="status" aria-label={label}>
      <div className="chart-skeleton-lines">
        <span />
        <span />
        <span />
      </div>
      <div className="chart-skeleton-bars" aria-hidden="true">
        {[38, 63, 48, 76, 57, 86, 66, 94, 72, 81, 55, 70].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

function ReportActions({
  filename,
  headers,
  rows,
  title,
  onSave,
  onShare,
}) {
  return (
    <div className="report-actions page-actions">
      <button
        type="button"
        className="business-button secondary"
        onClick={() => downloadExcelCsv(filename, headers, rows)}
        disabled={!rows.length}
      >
        Download Excel-compatible CSV
      </button>
      <button
        type="button"
        className="business-button secondary"
        onClick={() => onSave({ filename, headers, rows, title })}
        disabled={!rows.length}
      >
        Save report
      </button>
      <button
        type="button"
        className="business-button secondary"
        onClick={() => onShare({ title, rowCount: rows.length })}
        disabled={!rows.length}
      >
        Share report
      </button>
      <button
        type="button"
        className="business-button"
        onClick={() => window.print()}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}

function BusinessInsightsPage({ districts = [], crops = [], userId }) {
  const [priceCrops, setPriceCrops] = useState([]);
  const [priceCropsLoading, setPriceCropsLoading] = useState(true);
  const [priceCropsError, setPriceCropsError] = useState("");
  const [selectedPriceCrop, setSelectedPriceCrop] = useState("");
  const [priceResult, setPriceResult] = useState({ crop: "", values: [] });
  const [priceError, setPriceError] = useState({ crop: "", message: "" });
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedYieldCrop, setSelectedYieldCrop] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("All seasons");
  const [yieldResult, setYieldResult] = useState({
    district: "",
    crop: "",
    season: "",
    values: [],
  });
  const [yieldError, setYieldError] = useState({
    district: "",
    crop: "",
    season: "",
    message: "",
  });
  const savedReportsKey = userId
    ? `crop_prediction_saved_business_reports_${userId}`
    : "";
  const [savedReportState, setSavedReportState] = useState(() => {
    if (!savedReportsKey) {
      return { items: [], message: "", isError: false };
    }
    try {
      const saved = JSON.parse(localStorage.getItem(savedReportsKey) || "[]");
      if (!Array.isArray(saved)) {
        throw new Error("Saved reports have an invalid format.");
      }
      return { items: saved, message: "", isError: false };
    } catch (error) {
      return {
        items: [],
        message: error.message || "Unable to load saved reports.",
        isError: true,
      };
    }
  });

  useEffect(() => {
    let active = true;
    getHistoricalPriceCrops()
      .then((names) => {
        if (!active) return;
        setPriceCrops(names);
      })
      .catch((error) => {
        if (active) {
          setPriceCropsError(
            error.message || "Unable to load historical crop prices."
          );
        }
      })
      .finally(() => {
        if (active) setPriceCropsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cropNames = useMemo(
    () =>
      crops
        .map((crop) => crop.crop_name)
        .filter((name) => typeof name === "string" && name.trim()),
    [crops]
  );

  const activePriceCrop = selectedPriceCrop || priceCrops[0] || "";
  const activeDistrict = selectedDistrict || districts[0] || "";
  const activeYieldCrop = selectedYieldCrop || cropNames[0] || "";
  const activeSeason = selectedSeason;
  const priceLoading =
    priceCropsLoading ||
    (Boolean(activePriceCrop) &&
      priceResult.crop !== activePriceCrop &&
      priceError.crop !== activePriceCrop);
  const priceErrorMessage =
    activePriceCrop && priceError.crop === activePriceCrop
      ? priceError.message
      : priceCropsError;
  const priceHistory =
    priceResult.crop === activePriceCrop ? priceResult.values : [];
  const hasCurrentYieldResult =
    yieldResult.district === activeDistrict &&
    yieldResult.crop === activeYieldCrop &&
    yieldResult.season === activeSeason;
  const hasCurrentYieldError =
    yieldError.district === activeDistrict &&
    yieldError.crop === activeYieldCrop &&
    yieldError.season === activeSeason;
  const yieldLoading =
    Boolean(activeDistrict && activeYieldCrop) &&
    !hasCurrentYieldResult &&
    !hasCurrentYieldError;
  const yieldErrorMessage =
    hasCurrentYieldError
      ? yieldError.message
      : "";
  const yieldHistory =
    hasCurrentYieldResult
      ? yieldResult.values
      : [];

  useEffect(() => {
    if (!activePriceCrop) return undefined;
    let active = true;
    getHistoricalPriceTrend(activePriceCrop)
      .then((history) => {
        if (active) {
          setPriceResult({ crop: activePriceCrop, values: history });
          setPriceError({ crop: "", message: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setPriceError({
            crop: activePriceCrop,
            message: error.message || "Unable to load the price trend.",
          });
        }
      })
    return () => {
      active = false;
    };
  }, [activePriceCrop]);

  useEffect(() => {
    if (!activeDistrict || !activeYieldCrop) return undefined;
    let active = true;
    getHistoricalYield(
      activeDistrict,
      activeYieldCrop,
      activeSeason === "All seasons" ? "" : activeSeason
    )
      .then((history) => {
        if (active) {
          setYieldResult({
            district: activeDistrict,
            crop: activeYieldCrop,
            season: activeSeason,
            values: history,
          });
          setYieldError({
            district: "",
            crop: "",
            season: "",
            message: "",
          });
        }
      })
      .catch((error) => {
        if (active) {
          setYieldError({
            district: activeDistrict,
            crop: activeYieldCrop,
            season: activeSeason,
            message:
              error.message || "Unable to load district yield history.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [activeDistrict, activeSeason, activeYieldCrop]);

  const priceRows = priceHistory.map((item) => [
    item.date,
    item.crop_name,
    item.modal_price,
  ]);
  const yieldRows = yieldHistory.map((item) => [
    item.district,
    item.crop_name,
    item.season,
    item.crop_year,
    item.yield,
    item.area,
    item.observations,
  ]);

  const saveReport = ({ filename, headers, rows, title }) => {
    if (!savedReportsKey) {
      setSavedReportState((current) => ({
        ...current,
        message: "Sign in to save reports on this device.",
        isError: true,
      }));
      return;
    }
    const report = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename,
      title,
      headers,
      rows,
      savedAt: new Date().toISOString(),
    };
    const nextReports = [report, ...savedReportState.items].slice(0, 10);
    try {
      localStorage.setItem(savedReportsKey, JSON.stringify(nextReports));
      setSavedReportState({
        items: nextReports,
        message: "Report saved on this device for your account.",
        isError: false,
      });
    } catch (error) {
      setSavedReportState((current) => ({
        ...current,
        message: error.message || "Unable to save this report on the device.",
        isError: true,
      }));
    }
  };

  const shareReport = async ({ title, rowCount }) => {
    const text = `${title}\n${rowCount} historical observations from AgriPredict.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        setSavedReportState((current) => ({
          ...current,
          message: "Report summary shared.",
          isError: false,
        }));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setSavedReportState((current) => ({
          ...current,
          message: "Report summary copied to the clipboard.",
          isError: false,
        }));
      } else {
        throw new Error("Sharing is not supported by this browser.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setSavedReportState((current) => ({
          ...current,
          message: error.message || "Unable to share this report.",
          isError: true,
        }));
      }
    }
  };

  const deleteSavedReport = (reportId) => {
    const nextReports = savedReportState.items.filter(
      (report) => report.id !== reportId
    );
    try {
      localStorage.setItem(savedReportsKey, JSON.stringify(nextReports));
      setSavedReportState({
        items: nextReports,
        message: "Saved report removed.",
        isError: false,
      });
    } catch (error) {
      setSavedReportState((current) => ({
        ...current,
        message: error.message || "Unable to remove the saved report.",
        isError: true,
      }));
    }
  };

  return (
    <section className="business-insights page-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">MARKET & PRODUCTION DATA</p>
          <h2>Farm business insights</h2>
          <p>
            Filter yield history by district, crop, and season. Market-price
            history is statewide and can be filtered by crop.
          </p>
        </div>
      </div>

      <div className="print-area">
        <section className="business-panel" aria-labelledby="price-trend-title">
          <div className="business-panel-heading">
            <div>
              <p className="section-eyebrow">KARNATAKA MARKET HISTORY</p>
              <h3 id="price-trend-title">Crop price trend</h3>
              <p>Monthly modal prices in the bundled historical dataset.</p>
            </div>
            <label className="business-select">
              <span>Crop</span>
              <select
                value={activePriceCrop}
                onChange={(event) => setSelectedPriceCrop(event.target.value)}
                disabled={priceCropsLoading || !priceCrops.length}
              >
                {priceCrops.map((crop) => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </label>
          </div>
          {priceLoading && <ChartSkeleton label="Loading price history chart" />}
          {priceErrorMessage && (
            <p className="business-error" role="alert">{priceErrorMessage}</p>
          )}
          {!priceLoading && !priceErrorMessage && (
            <>
              <TrendChart
                values={priceHistory}
                valueKey="modal_price"
                label={`${activePriceCrop} monthly modal price history`}
                formatValue={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
              />
              {priceHistory.length > 0 && (
                <p className="data-note">
                  {priceHistory.length} monthly observations · ₹ per dataset unit ·
                  historical series ends {priceHistory.at(-1).date}
                </p>
              )}
              <ReportActions
                filename={`${activePriceCrop}-price-history`}
                headers={["Date", "Crop", "Modal price (₹)"]}
                rows={priceRows}
                title={`${activePriceCrop} market price history`}
                onSave={saveReport}
                onShare={shareReport}
              />
            </>
          )}
        </section>

        <section className="business-panel" aria-labelledby="district-yield-title">
          <div className="business-panel-heading">
            <div>
              <p className="section-eyebrow">DISTRICT PRODUCTION HISTORY</p>
              <h3 id="district-yield-title">Historical yield by district</h3>
              <p>
                Area-weighted yield history from the available Karnataka crop records.
              </p>
            </div>
            <div className="business-filter-row">
              <label className="business-select">
                <span>District</span>
                <select
                  value={activeDistrict}
                  onChange={(event) => setSelectedDistrict(event.target.value)}
                >
                  {districts.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </label>
              <label className="business-select">
                <span>Crop</span>
                <select
                  value={activeYieldCrop}
                  onChange={(event) => setSelectedYieldCrop(event.target.value)}
                >
                  {cropNames.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </label>
              <label className="business-select">
                <span>Season</span>
                <select
                  value={activeSeason}
                  onChange={(event) => setSelectedSeason(event.target.value)}
                >
                  {["All seasons", "Kharif", "Rabi", "Summer", "Whole Year"].map((season) => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {yieldLoading && (
            <ChartSkeleton label="Loading district yield history chart" />
          )}
          {yieldErrorMessage && (
            <p className="business-error" role="alert">{yieldErrorMessage}</p>
          )}
          {!yieldLoading && !yieldErrorMessage && (
            <>
              <TrendChart
                values={yieldHistory}
                valueKey="yield"
                label={`${activeYieldCrop} historical yield for ${activeDistrict}, ${activeSeason}`}
                formatValue={(value) => Number(value).toFixed(2)}
              />
              {yieldHistory.length > 0 && (
                <p className="data-note">
                  {yieldHistory.length} crop years · area-weighted tonnes/hectare ·
                  {activeSeason} · years available: {yieldHistory.map((item) => item.crop_year).join(", ")}
                </p>
              )}
              <ReportActions
                filename={`${activeDistrict}-${activeYieldCrop}-${activeSeason}-yield-history`}
                headers={[
                  "District",
                  "Crop",
                  "Season",
                  "Crop year",
                  "Area-weighted yield (tonnes/hectare)",
                  "Area (hectares)",
                  "Source rows",
                ]}
                rows={yieldRows}
                title={`${activeDistrict} ${activeYieldCrop} yield history · ${activeSeason}`}
                onSave={saveReport}
                onShare={shareReport}
              />
            </>
          )}
        </section>
      </div>

      {savedReportState.message && (
        <p
          className={savedReportState.isError ? "business-error" : "data-note"}
          role={savedReportState.isError ? "alert" : "status"}
        >
          {savedReportState.message}
        </p>
      )}

      <section className="business-panel saved-reports" aria-labelledby="saved-reports-title">
        <div className="business-panel-heading">
          <div>
            <p className="section-eyebrow">YOUR DEVICE</p>
            <h3 id="saved-reports-title">Saved reports</h3>
            <p>Reports are stored locally for this signed-in account on this device.</p>
          </div>
          <span className="saved-report-count">{savedReportState.items.length} / 10</span>
        </div>
        {savedReportState.items.length ? (
          <ul className="saved-report-list">
            {savedReportState.items.map((report) => (
              <li key={report.id}>
                <div>
                  <strong>{report.title}</strong>
                  <span>{new Date(report.savedAt).toLocaleString()}</span>
                </div>
                <div className="saved-report-actions">
                  <button
                    type="button"
                    className="business-button secondary"
                    onClick={() =>
                      downloadExcelCsv(report.filename, report.headers, report.rows)
                    }
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="business-button secondary"
                    onClick={() => deleteSavedReport(report.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="insights-empty">Save a filtered report to keep it here.</p>
        )}
      </section>

      <p className="data-caveat">
        Historical records end at the latest date/year in the bundled datasets and
        may not represent current mandi prices or conditions on an individual farm.
      </p>
    </section>
  );
}

export default BusinessInsightsPage;
