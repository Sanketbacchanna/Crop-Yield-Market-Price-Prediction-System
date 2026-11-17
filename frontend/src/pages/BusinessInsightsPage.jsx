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

function ReportActions({ filename, headers, rows }) {
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
        className="business-button"
        onClick={() => window.print()}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}

function BusinessInsightsPage({ districts = [], crops = [] }) {
  const [priceCrops, setPriceCrops] = useState([]);
  const [priceCropsLoading, setPriceCropsLoading] = useState(true);
  const [priceCropsError, setPriceCropsError] = useState("");
  const [selectedPriceCrop, setSelectedPriceCrop] = useState("");
  const [priceResult, setPriceResult] = useState({ crop: "", values: [] });
  const [priceError, setPriceError] = useState({ crop: "", message: "" });
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedYieldCrop, setSelectedYieldCrop] = useState("");
  const [yieldResult, setYieldResult] = useState({
    district: "",
    crop: "",
    values: [],
  });
  const [yieldError, setYieldError] = useState({
    district: "",
    crop: "",
    message: "",
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
    yieldResult.crop === activeYieldCrop;
  const hasCurrentYieldError =
    yieldError.district === activeDistrict &&
    yieldError.crop === activeYieldCrop;
  const yieldLoading =
    Boolean(activeDistrict && activeYieldCrop) &&
    !hasCurrentYieldResult &&
    !hasCurrentYieldError;
  const yieldErrorMessage =
    yieldError.district === activeDistrict && yieldError.crop === activeYieldCrop
      ? yieldError.message
      : "";
  const yieldHistory =
    yieldResult.district === activeDistrict && yieldResult.crop === activeYieldCrop
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
    getHistoricalYield(activeDistrict, activeYieldCrop)
      .then((history) => {
        if (active) {
          setYieldResult({
            district: activeDistrict,
            crop: activeYieldCrop,
            values: history,
          });
          setYieldError({ district: "", crop: "", message: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setYieldError({
            district: activeDistrict,
            crop: activeYieldCrop,
            message:
              error.message || "Unable to load district yield history.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [activeDistrict, activeYieldCrop]);

  const priceRows = priceHistory.map((item) => [
    item.date,
    item.crop_name,
    item.modal_price,
  ]);
  const yieldRows = yieldHistory.map((item) => [
    item.district,
    item.crop_name,
    item.crop_year,
    item.yield,
    item.area,
    item.observations,
  ]);

  return (
    <section className="business-insights page-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">MARKET & PRODUCTION DATA</p>
          <h2>Farm business insights</h2>
          <p>Explore historical trends and download reports for your records.</p>
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
          {priceLoading && <p role="status">Loading price history…</p>}
          {priceErrorMessage && (
            <p className="business-error" role="alert">{priceErrorMessage}</p>
          )}
          {!priceLoading && !priceError && (
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
            </div>
          </div>
          {yieldLoading && <p role="status">Loading district yield history…</p>}
          {yieldErrorMessage && (
            <p className="business-error" role="alert">{yieldErrorMessage}</p>
          )}
          {!yieldLoading && !yieldError && (
            <>
              <TrendChart
                values={yieldHistory}
                valueKey="yield"
                label={`${activeYieldCrop} historical yield for ${activeDistrict}`}
                formatValue={(value) => Number(value).toFixed(2)}
              />
              {yieldHistory.length > 0 && (
                <p className="data-note">
                  {yieldHistory.length} crop years · area-weighted tonnes/hectare ·
                  years available: {yieldHistory.map((item) => item.crop_year).join(", ")}
                </p>
              )}
              <ReportActions
                filename={`${activeDistrict}-${activeYieldCrop}-yield-history`}
                headers={[
                  "District",
                  "Crop",
                  "Crop year",
                  "Area-weighted yield (tonnes/hectare)",
                  "Area (hectares)",
                  "Source rows",
                ]}
                rows={yieldRows}
              />
            </>
          )}
        </section>
      </div>

      <p className="data-caveat">
        Historical records end at the latest date/year in the bundled datasets and
        may not represent current mandi prices or conditions on an individual farm.
      </p>
    </section>
  );
}

export default BusinessInsightsPage;
