import { useEffect, useRef, useState } from "react";
import SummaryCard from "../components/SummaryCard";
import {
  getLiveWeather,
  getTalukCoordinates,
  getWeatherOutlook,
} from "../services/api";
import { KARNATAKA_WEATHER_LOCATIONS } from "../utils/karnatakaWeatherLocations";
import "./WeatherPage.css";

const HEAVY_RAINFALL_MM = 64.5;
const IMD_WARNING_CODES = {
  2: "Heavy rain",
  3: "Heavy snow",
  4: "Thunderstorm and lightning",
  5: "Hailstorm",
  6: "Dust storm",
  7: "Dust-raising winds",
  8: "Strong surface winds",
  9: "Heat wave",
  10: "Hot day",
  11: "Warm night",
  12: "Cold wave",
  13: "Cold day",
  14: "Ground frost",
  15: "Fog",
  16: "Very heavy rain",
  17: "Extremely heavy rain",
};

function sumRainfall(values = []) {
  return values.reduce((total, value) => {
    return total + (Number.isFinite(value) ? Math.max(0, value) : 0);
  }, 0);
}

function percentile(values, percentileValue) {
  const sortedValues = values
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (sortedValues.length === 0) {
    return null;
  }

  const index = (sortedValues.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const fraction = index - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - fraction) +
    sortedValues[upperIndex] * fraction
  );
}

function formatMillimeters(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} mm` : "Unavailable";
}

function formatForecastDate(date, options) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(`${date}T12:00:00`)
  );
}

function getDailyForecast(forecast) {
  const daily = forecast?.daily;
  if (!daily?.time) {
    return [];
  }

  return daily.time.map((date, index) => ({
    date,
    rainfall: daily.precipitation_sum?.[index],
    probability: daily.precipitation_probability_max?.[index],
    minTemperature: daily.temperature_2m_min?.[index],
    maxTemperature: daily.temperature_2m_max?.[index],
    description: daily.weather_description?.[index],
  }));
}

function getHourlyForecast(forecast, hours = 24) {
  const hourly = forecast?.hourly;
  if (!hourly?.time) return [];
  return hourly.time.slice(0, hours).map((time, index) => ({
    time,
    temperature: hourly.temperature_2m?.[index],
    humidity: hourly.relative_humidity_2m?.[index],
    rainfall: hourly.precipitation?.[index],
    probability: hourly.precipitation_probability?.[index],
    code: hourly.weather_code?.[index],
  }));
}

function weatherIcon(item) {
  if (item?.rainfall > 0 || item?.probability >= 60) return "🌧️";
  if (item?.code === 0 || item?.code === 1) return "☀️";
  return "☁️";
}

function weatherDescription(item) {
  if (item?.rainfall > 0 || item?.probability >= 60) return "Rain likely";
  if (item?.code === 0) return "Sunny";
  if (item?.code === 1) return "Mostly sunny";
  if ([2, 3].includes(item?.code)) return "Partly cloudy";
  if ([45, 48].includes(item?.code)) return "Foggy";
  if ([95, 96, 99].includes(item?.code)) return "Thunderstorms";
  return "Cloudy";
}

const WEATHER_ALERT_ICONS = {
  heavy_rain: "🌧️",
  drought_risk: "🌾",
  heat_stress: "☀️",
  thunderstorm: "⛈️",
  strong_wind: "💨",
  flood_risk: "🌊",
};

function getDistrictWarnings(warnings) {
  if (!warnings) {
    return [];
  }

  return Array.from({ length: 5 }, (_, index) => {
    const day = index + 1;
    const codes = String(warnings[`Day_${day}`] || "")
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code && code !== "1");
    return codes.map(
      (code) => `Day ${day}: ${IMD_WARNING_CODES[code] || `Warning ${code}`}`
    );
  }).flat();
}

function getRainfallSignal(seasonal, dailyForecast) {
  const daily = seasonal?.daily;
  const weekly = seasonal?.weekly;
  if (!daily?.time || !weekly?.time) {
    return null;
  }

  const forecastStartDate = daily.time[0];
  const weeklyPeriods = weekly.time
    .map((date, index) => ({
      date,
      mean: weekly.precipitation_mean?.[index],
      anomaly: weekly.precipitation_anomaly?.[index],
    }))
    .filter(
      (period) =>
        period.date >= forecastStartDate &&
        Number.isFinite(period.mean) &&
        Number.isFinite(period.anomaly)
    )
    .slice(0, 4);

  const expectedRainfall = weeklyPeriods.reduce(
    (total, period) => total + Math.max(0, period.mean - period.anomaly),
    0
  );
  const rainfallAnomaly = weeklyPeriods.reduce(
    (total, period) => total + period.anomaly,
    0
  );
  const anomalyPercent =
    expectedRainfall > 0
      ? (rainfallAnomaly / expectedRainfall) * 100
      : null;
  const heavyRainDays = dailyForecast.filter(
    (day) =>
      Number.isFinite(day.rainfall) &&
      day.rainfall >= HEAVY_RAINFALL_MM &&
      (!Number.isFinite(day.probability) || day.probability >= 50)
  );
  const nextSevenDayValues = dailyForecast
    .slice(0, 7)
    .map((day) => day.rainfall);
  const nextSevenDayRainfall = nextSevenDayValues.some(Number.isFinite)
    ? sumRainfall(nextSevenDayValues)
    : null;

  return {
    anomalyPercent,
    heavyRainDays,
    nextSevenDayRainfall,
    dryLevel:
      anomalyPercent == null
        ? "unavailable"
        : anomalyPercent <= -50
          ? "elevated"
          : anomalyPercent <= -25
            ? "watch"
            : "low",
    wetLevel:
      heavyRainDays.length > 0 ||
      (nextSevenDayRainfall != null && nextSevenDayRainfall >= 100)
        ? "elevated"
        : anomalyPercent != null && anomalyPercent >= 25
          ? "watch"
          : "low",
  };
}

function WeatherPage({
  weatherLoading,
  weatherError,
  liveLocation,
  liveWeather,
  liveLocationLoading,
}) {
  const defaultDistrict =
    KARNATAKA_WEATHER_LOCATIONS.find(
      (item) => item.district === "Dakshina Kannada"
    ) || KARNATAKA_WEATHER_LOCATIONS[0];
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict.district);
  const [selectedTaluk, setSelectedTaluk] = useState(defaultDistrict.taluks[0].name);
  const [selectedFarm, setSelectedFarm] = useState(defaultDistrict.taluks[0].farms[0].name);
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const liveLocationApplied = useRef(false);
  const manualLocationSelected = useRef(false);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [forecastView, setForecastView] = useState("current");
  const [outlookState, setOutlookState] = useState({
    key: null,
    data: null,
    error: "",
  });
  const districtData = KARNATAKA_WEATHER_LOCATIONS.find((item) => item.district === selectedDistrict) || defaultDistrict;
  const talukData = districtData.taluks.find((item) => item.name === selectedTaluk) || districtData.taluks[0];
  const farmData = talukData.farms.find((item) => item.name === selectedFarm) || talukData.farms[0];
  const latitude = selectedCoordinates?.latitude;
  const longitude = selectedCoordinates?.longitude;
  const district = selectedDistrict;
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const locationKey = hasCoordinates ? `${selectedDistrict}:${selectedTaluk}:${selectedFarm}` : null;

  useEffect(() => {
    if (liveLocationApplied.current) return;
    if (!liveLocation?.latitude || !liveLocation?.longitude) return;
    const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const districtMatch = KARNATAKA_WEATHER_LOCATIONS.find(
      (item) => normalize(item.district) === normalize(liveLocation.district)
    );
    const nextDistrict = districtMatch || defaultDistrict;
    const talukMatch = nextDistrict.taluks.find(
      (item) => normalize(item.name) === normalize(liveLocation.taluk)
    );
    const nextTaluk = talukMatch || nextDistrict.taluks[0];
    setSelectedDistrict(nextDistrict.district);
    setSelectedTaluk(nextTaluk.name);
    setSelectedFarm(nextTaluk.farms[0].name);
    setSelectedVillage(liveLocation.village || liveLocation.name || nextTaluk.name);
    setSelectedCoordinates({ latitude: liveLocation.latitude, longitude: liveLocation.longitude });
    liveLocationApplied.current = true;
  }, [liveLocation?.latitude, liveLocation?.longitude, liveLocation?.district, liveLocation?.taluk, liveLocation?.village]);

  useEffect(() => {
    if (liveLocationApplied.current) return undefined;
    if (!manualLocationSelected.current) return undefined;
    const controller = new AbortController();
    getTalukCoordinates(selectedTaluk, selectedDistrict, controller.signal)
      .then(setSelectedCoordinates)
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSelectedCoordinates({ latitude: farmData.latitude, longitude: farmData.longitude });
        }
      });
    return () => controller.abort();
  }, [selectedDistrict, selectedTaluk, farmData.latitude, farmData.longitude, liveLocation?.district, liveLocation?.taluk]);

  useEffect(() => {
    if (!locationKey) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    Promise.allSettled([
      getWeatherOutlook(latitude, longitude, district, controller.signal),
      getLiveWeather(latitude, longitude),
    ]).then(([outlookResult, currentResult]) => {
        if (active) {
          if (outlookResult.status === "fulfilled") {
            setOutlookState({ key: locationKey, data: outlookResult.value, error: "" });
          } else if (outlookResult.reason?.name !== "AbortError") {
            setOutlookState({ key: locationKey, data: null, error: outlookResult.reason?.message || "Unable to load weather outlooks." });
          }
          if (currentResult.status === "fulfilled") {
            setSelectedWeather({ ...currentResult.value, location: selectedFarm });
          }
        }
      })

    return () => {
      active = false;
      controller.abort();
    };
  }, [latitude, longitude, district, locationKey, selectedFarm]);

  const currentWeather = selectedWeather || liveWeather;
  const locationName =
    selectedVillage || liveLocation?.name || currentWeather?.location || "Current location";
  const hasCurrentOutlook = outlookState.key === locationKey;
  const outlook = hasCurrentOutlook ? outlookState.data : null;
  const outlookError = hasCurrentOutlook ? outlookState.error : "";
  const outlookLoading = Boolean(locationKey && !hasCurrentOutlook);
  const dailyForecast = getDailyForecast(outlook?.forecast);
  const hourlyForecast = getHourlyForecast(outlook?.forecast);
  const currentHour = hourlyForecast[0];
  const todayForecast = dailyForecast[0];
  const currentTemperature = currentWeather?.temperature ?? currentHour?.temperature;
  const currentHumidity = currentWeather?.humidity ?? currentHour?.humidity;
  const chartForecast = forecastView === "5d"
    ? dailyForecast.slice(0, 7).map((day) => ({
        ...day,
        time: `${day.date}T12:00:00`,
        temperature: day.maxTemperature,
      }))
    : hourlyForecast.slice(0, 9);
  const chartTemperatures = chartForecast.map((item) => Number(item.temperature)).filter(Number.isFinite);
  const chartMinimum = chartTemperatures.length ? Math.min(...chartTemperatures) : 0;
  const chartMaximum = chartTemperatures.length ? Math.max(...chartTemperatures) : 1;
  const chartRange = Math.max(1, chartMaximum - chartMinimum);
  const chartPoints = chartForecast.map((item, index) => {
    const temperature = Number(item.temperature);
    if (!Number.isFinite(temperature)) return null;
    const x = chartForecast.length === 1 ? 450 : (index / (chartForecast.length - 1)) * 860 + 20;
    const y = 168 - ((temperature - chartMinimum) / chartRange) * 110;
    return { item, x, y };
  }).filter(Boolean);
  const chartLine = chartPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const chartArea = chartLine ? `20,184 ${chartLine} 880,184` : "";
  const farmingAlerts = outlook?.alerts || [];
  const seasonal = outlook?.seasonal;
  const rainfallSignal = getRainfallSignal(seasonal, dailyForecast);
  const districtWarnings = getDistrictWarnings(outlook?.warnings);
  const nowcastMessage =
    outlook?.nowcast?.message ||
    outlook?.nowcast?.Message ||
    outlook?.nowcast?.Consolidated_Warning ||
    "";
  const providerErrors = [
    outlook?.forecastError,
    outlook?.warningsError,
    outlook?.nowcastError,
  ].filter(Boolean);
  const imdKeyMissing =
    currentWeather?.fallbackReason === "IMD_API_KEY is not configured." ||
    providerErrors.includes("IMD_API_KEY is not configured.");
  const districtProviderErrors = [
    ...new Set(
      [outlook?.warningsError, outlook?.nowcastError].filter(
        (error) =>
          error && error !== "IMD_API_KEY is not configured."
      )
    ),
  ];
  const seasonalDaily = seasonal?.daily;
  const rainfallNext30Days = sumRainfall(
    seasonalDaily?.precipitation_sum?.slice(0, 30)
  );
  const ensembleKeys = Object.keys(seasonalDaily || {}).filter((key) =>
    /^precipitation_sum_member\d+$/.test(key)
  );
  const ensembleRainfallTotals = ensembleKeys.map((key) =>
    sumRainfall(seasonalDaily[key].slice(0, 30))
  );
  const rainfallRange = {
    low: percentile(ensembleRainfallTotals, 0.1),
    high: percentile(ensembleRainfallTotals, 0.9),
  };
  const monthly = seasonal?.monthly;
  const monthlyForecast = monthly?.time?.map((date, index) => ({
    date,
    rainfall: monthly.precipitation_mean?.[index],
    anomaly: monthly.precipitation_anomaly?.[index],
  })) || [];
  const maxMonthlyRainfall = Math.max(
    1,
    ...monthlyForecast.map((month) =>
      Number.isFinite(month.rainfall) ? month.rainfall : 0
    )
  );
  const dailyMaxRainfall = Math.max(
    1,
    ...dailyForecast.map((day) =>
      Number.isFinite(day.rainfall) ? day.rainfall : 0
    )
  );

  const handleDistrictChange = (event) => {
    liveLocationApplied.current = false;
    manualLocationSelected.current = true;
    const nextDistrict = KARNATAKA_WEATHER_LOCATIONS.find((item) => item.district === event.target.value) || defaultDistrict;
    setSelectedDistrict(nextDistrict.district);
    setSelectedTaluk(nextDistrict.taluks[0].name);
    setSelectedFarm(nextDistrict.taluks[0].farms[0].name);
    setSelectedVillage(nextDistrict.taluks[0].name);
    setSelectedCoordinates(null);
  };

  const handleTalukChange = (event) => {
    liveLocationApplied.current = false;
    manualLocationSelected.current = true;
    const nextTaluk = districtData.taluks.find((item) => item.name === event.target.value) || districtData.taluks[0];
    setSelectedTaluk(nextTaluk.name);
    setSelectedFarm(nextTaluk.farms[0].name);
    setSelectedVillage(nextTaluk.name);
    setSelectedCoordinates(null);
  };

  return (
    <section className="dashboard-section page-section weather-page" id="weather">
      <div className="section-heading weather-page-heading">
        <div>
          <p className="section-eyebrow">FARM CONDITIONS</p>
          <h2>Weather outlook</h2>
          <p>
            Forecasts and rainfall signals for <strong>{locationName}</strong>.
          </p>
        </div>
        {outlookLoading && (
          <span className="weather-loading-label">Updating outlook…</span>
        )}
      </div>

      <section className="weather-hero" aria-label="Current weather and hourly forecast">
        <article className="weather-current-card">
          <div className="weather-current-card-header">
            <strong>{locationName}</strong><span aria-hidden="true">•••</span>
          </div>
          <div className="weather-current-main">
            <span className="weather-sun-icon" aria-hidden="true">{weatherIcon(currentHour)}</span>
            <strong>{currentTemperature ?? "—"}<sup>°C</sup></strong>
            <div className="weather-current-rain">
              <strong>💧 {currentHour?.probability ?? "—"}%</strong>
              <span>H: {todayForecast?.maxTemperature ?? "—"}°</span>
              <span>L: {todayForecast?.minTemperature ?? "—"}°</span>
            </div>
          </div>
          <h3>{weatherDescription(currentHour)}</h3>
          <p>Current conditions for your detected farm area.</p>
          <div className="weather-current-stats">
            <div><span>Feels like</span><strong>—</strong></div>
            <div><span>Wind</span><strong>—</strong></div>
            <div><span>Humidity</span><strong>{currentHumidity ?? "—"}%</strong></div>
          </div>
        </article>

        <article className="weather-chart-card">
          <div className="weather-chart-tabs" role="tablist" aria-label="Forecast type">
            <button className={forecastView === "5d" ? "" : "active"} onClick={() => setForecastView("24h")} role="tab">Hourly</button>
            <button className={forecastView === "5d" ? "active" : ""} onClick={() => setForecastView("5d")} role="tab">Daily</button>
          </div>
          {chartPoints.length > 0 ? (
            <div className="weather-temperature-chart">
              <svg viewBox="0 0 900 220" role="img" aria-label="Hourly temperature forecast">
                <defs><linearGradient id="temperatureFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff7777" stopOpacity="0.78" /><stop offset="100%" stopColor="#fff3e7" stopOpacity="0.2" /></linearGradient></defs>
                <polygon points={chartArea} fill="url(#temperatureFill)" />
                <polyline points={chartLine} fill="none" stroke="#ff7777" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {chartPoints.map(({ item, x, y }) => <text key={item.time} x={x} y={y - 12} textAnchor="middle" className="weather-chart-temperature">{Math.round(item.temperature)}°</text>)}
              </svg>
              <div className="weather-chart-details">
                {chartForecast.map((item) => <div key={item.time}><span>{forecastView === "5d" ? formatForecastDate(item.date, { weekday: "short" }) : new Intl.DateTimeFormat([], { hour: "numeric" }).format(new Date(item.time))}</span><b>{weatherIcon(item)}</b><small>💧 {item.probability ?? 0}%</small></div>)}
              </div>
            </div>
          ) : <p className="weather-empty-state">Hourly forecast is unavailable for this location.</p>}
        </article>
      </section>

      <section className="weather-panel weather-location-panel" aria-labelledby="weather-location-title">
        <div className="weather-panel-heading">
          <div>
            <h3 id="weather-location-title">Choose your farm location</h3>
            <p>District-level weather and IMD alerts for Karnataka</p>
          </div>
          <span className="weather-location-breadcrumb">Karnataka › {selectedDistrict} › {selectedTaluk}</span>
        </div>
        <div className="weather-location-fields">
          <label>State<select value="Karnataka" disabled><option>Karnataka</option></select></label>
          <label>District<select value={selectedDistrict} onChange={handleDistrictChange}>{KARNATAKA_WEATHER_LOCATIONS.map((item) => <option key={item.district}>{item.district}</option>)}</select></label>
          <label>Taluk<select value={talukData.name} onChange={handleTalukChange}>{districtData.taluks.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label>Village<select value={selectedVillage} onChange={(event) => setSelectedVillage(event.target.value)}><option>{selectedVillage}</option></select></label>
        </div>
      </section>

      <section className="weather-panel weather-horizon-panel">
        <div className="weather-tabs" role="tablist" aria-label="Weather forecast horizon">
          {[['current', 'Current'], ['6h', 'Next 6 hours'], ['24h', 'Next 24 hours'], ['5d', 'Next 5 days']].map(([value, label]) => <button key={value} className={forecastView === value ? "weather-tab active" : "weather-tab"} onClick={() => setForecastView(value)} role="tab" aria-selected={forecastView === value}>{label}</button>)}
        </div>
        {forecastView === "current" && <div className="weather-current-detail"><span className="weather-current-icon">🌦️</span><div><strong>{currentWeather?.temperature ?? "—"}°C</strong><span>Humidity {currentWeather?.humidity ?? "—"}%</span><span>Rainfall {currentWeather?.rainfall ?? "—"} mm</span></div></div>}
        {forecastView !== "current" && hourlyForecast.length > 0 && <div className="weather-hour-grid">{hourlyForecast.slice(0, forecastView === "6h" ? 6 : 24).map((item) => <article key={item.time}><strong>{new Intl.DateTimeFormat([], { hour: "numeric" }).format(new Date(item.time))}</strong><span className="weather-hour-icon">{weatherIcon(item)}</span><b>{item.temperature ?? "—"}°</b><small>{item.probability ?? 0}% rain</small></article>)}</div>}
        {forecastView === "5d" && dailyForecast.length > 0 && <div className="weather-horizon-summary">{dailyForecast.slice(0, 5).map((day) => <span key={day.date}>{formatForecastDate(day.date, { weekday: "short" })}: {day.probability ?? 0}% rain</span>)}</div>}
        {forecastView !== "current" && hourlyForecast.length === 0 && <p className="weather-empty-state">Short-range hourly data is unavailable for this farm point.</p>}
      </section>

      <div className="weather-summary-grid">
        <SummaryCard
          icon="🌧️"
          label="Next 30 days"
          value={
            seasonal ? formatMillimeters(rainfallNext30Days) : "—"
          }
          description={
            seasonal
              ? `Ensemble range ${formatMillimeters(rainfallRange.low)}–${formatMillimeters(rainfallRange.high)}`
              : "Seasonal rainfall outlook"
          }
          accent="green"
        />
      </div>

      {!hasCoordinates && (
        <div className="weather-message">
          {liveLocationLoading
            ? "Waiting for your location…"
            : "Allow location access to load forecasts and regional rainfall signals."}
        </div>
      )}
      {outlookError && <div className="weather-message">{outlookError}</div>}

      {hasCoordinates && (
        <>
          <section className="weather-panel farming-alerts-panel">
            <div className="weather-panel-heading">
              <div>
                <h3>🌦️ Farming alerts</h3>
                <p>Weather translated into practical farm actions</p>
              </div>
            </div>
            {farmingAlerts.length > 0 ? (
              <div className="farming-alert-list">
                {farmingAlerts.map((alert) => (
                  <article
                    className={`farming-alert farming-alert-${alert.severity}`}
                    key={`${alert.type}-${alert.title}`}
                  >
                    <div className="farming-alert-title-row">
                      <span className="farming-alert-icon" aria-hidden="true">
                        {WEATHER_ALERT_ICONS[alert.type] || "⚠️"}
                      </span>
                      <div>
                        <span className="farming-alert-severity">
                          {alert.severity === "high" ? "Important alert" : "Advisory"}
                        </span>
                        <h4>{alert.title}</h4>
                      </div>
                    </div>
                    <p>{alert.message}</p>
                    <strong>Recommendation</strong>
                    <p>{alert.recommendation}</p>
                    <small>Source: {alert.source}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="weather-empty-state">
                No immediate farming weather alerts detected for this forecast.
              </p>
            )}
          </section>

          <section className="weather-panel">
            <div className="weather-panel-heading">
              <div>
                <h3>Regional rainfall signals</h3>
                <p>Model outlook for the next four weeks</p>
              </div>
            </div>
            <div className="weather-alert-grid">
              <article
                className={`weather-alert weather-alert-${rainfallSignal?.dryLevel || "unavailable"}`}
              >
                <span className="weather-alert-label">Dry-spell / drought risk</span>
                <strong>
                  {rainfallSignal?.dryLevel === "elevated"
                    ? "Elevated signal"
                    : rainfallSignal?.dryLevel === "watch"
                      ? "Watch"
                      : rainfallSignal?.dryLevel === "low"
                        ? "No strong signal"
                        : "Unavailable"}
                </strong>
                <p>
                  {rainfallSignal?.anomalyPercent == null
                    ? "A four-week rainfall anomaly is not available."
                    : rainfallSignal.anomalyPercent < 0
                      ? `${Math.abs(rainfallSignal.anomalyPercent).toFixed(0)}% below model normal over the next four weeks.`
                      : `${rainfallSignal.anomalyPercent.toFixed(0)}% above model normal over the next four weeks.`}
                </p>
              </article>

              <article
                className={`weather-alert weather-alert-${rainfallSignal?.wetLevel || "unavailable"}`}
              >
                <span className="weather-alert-label">Heavy-rain / flood signal</span>
                <strong>
                  {rainfallSignal?.wetLevel === "elevated"
                    ? "Elevated signal"
                    : rainfallSignal?.wetLevel === "watch"
                      ? "Watch"
                      : rainfallSignal?.wetLevel === "low"
                        ? "No strong signal"
                        : "Unavailable"}
                </strong>
                <p>
                  {rainfallSignal?.heavyRainDays.length
                    ? `Heavy-rain threshold reached on ${rainfallSignal.heavyRainDays
                        .map((day) =>
                          formatForecastDate(day.date, {
                            month: "short",
                            day: "numeric",
                          })
                        )
                        .join(", ")}.`
                    : rainfallSignal?.wetLevel === "watch"
                      ? "Forecast rainfall is above the model's four-week normal."
                      : rainfallSignal
                        ? `${formatMillimeters(rainfallSignal.nextSevenDayRainfall)} forecast over the next seven days.`
                        : "Rainfall risk signal is not available."}
                </p>
              </article>
            </div>
          </section>

          {(outlook?.warnings ||
            outlook?.nowcast ||
            outlook?.warningsError ||
            outlook?.nowcastError ||
            imdKeyMissing) && (
            <section className="weather-panel">
              <div className="weather-panel-heading">
                <div>
                  <h3>IMD district warnings and nowcast</h3>
                  <p>
                    {district
                      ? `Official alerts for ${district}`
                      : "District-level alerts need a district match for your location."}
                  </p>
                </div>
              </div>
              {imdKeyMissing && (
                <p className="weather-message">
                  Add your issued IMD API key as{" "}
                  <code>IMD_API_KEY</code> in <code>backend/.env</code>, then
                  restart FastAPI. Open-Meteo is providing fallback weather
                  until IMD access is configured.
                </p>
              )}
              {districtWarnings.length > 0 && (
                <ul className="weather-warning-list">
                  {districtWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              {outlook?.warnings && districtWarnings.length === 0 && (
                <p className="weather-empty-state">
                  No active district warnings were reported by IMD.
                </p>
              )}
              {nowcastMessage && (
                <p className="weather-nowcast-message">{nowcastMessage}</p>
              )}
              {!nowcastMessage && outlook?.nowcast && (
                <p className="weather-nowcast-message">
                  District nowcast is available from IMD.
                </p>
              )}
              {districtProviderErrors.length > 0 && (
                <p className="weather-panel-error">
                  {districtProviderErrors.join(" ")}
                </p>
              )}
            </section>
          )}

          <section className="weather-panel">
            <div className="weather-panel-heading">
              <div>
                <h3>Next 7 days</h3>
                <p>
                  {outlook?.source === "IMD"
                    ? "IMD daily outlook and temperature range"
                    : "Open-Meteo fallback forecast and temperature range"}
                </p>
              </div>
              {outlook?.forecastError && !imdKeyMissing && (
                <span className="weather-panel-error">
                  {outlook.forecastError}
                </span>
              )}
            </div>
            {dailyForecast.length > 0 ? (
              <div className="weather-day-grid">
                {dailyForecast.map((day) => {
                  const rainfall = Number.isFinite(day.rainfall)
                    ? Math.max(0, day.rainfall)
                    : 0;
                  const barHeight = Math.max(
                    rainfall > 0 ? 4 : 2,
                    (rainfall / dailyMaxRainfall) * 58
                  );

                  return (
                    <article className="weather-day-card" key={day.date}>
                      <strong>
                        {formatForecastDate(day.date, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>
                      {Number.isFinite(day.rainfall) ? (
                        <>
                          <div className="weather-rain-bar" aria-hidden="true">
                            <span style={{ height: `${barHeight}px` }} />
                          </div>
                          <span className="weather-day-rain">
                            {formatMillimeters(day.rainfall)}
                          </span>
                        </>
                      ) : (
                        <span className="weather-day-description">
                          Rainfall amount unavailable
                        </span>
                      )}
                      {day.description && (
                        <span className="weather-day-description">
                          {day.description}
                        </span>
                      )}
                      {Number.isFinite(day.probability) && (
                        <span>Rain chance {day.probability}%</span>
                      )}
                      <span>
                        {Number.isFinite(day.minTemperature)
                          ? `${day.minTemperature.toFixed(0)}°`
                          : "—"}
                        {" / "}
                        {Number.isFinite(day.maxTemperature)
                          ? `${day.maxTemperature.toFixed(0)}°`
                          : "—"}
                      </span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="weather-empty-state">
                {outlookLoading
                  ? "Loading the seven-day forecast…"
                  : "Seven-day forecast is unavailable."}
              </p>
            )}
          </section>

          <section className="weather-panel">
            <div className="weather-panel-heading">
              <div>
                <h3>Seasonal rainfall outlook</h3>
                <p>Monthly ensemble forecast compared with model normal</p>
              </div>
              {outlook?.seasonalError && (
                <span className="weather-panel-error">
                  {outlook.seasonalError}
                </span>
              )}
            </div>
            {monthlyForecast.length > 0 ? (
              <div className="weather-month-list">
                {monthlyForecast.map((month) => {
                  const rainfall = Number.isFinite(month.rainfall)
                    ? Math.max(0, month.rainfall)
                    : 0;
                  const anomaly = month.anomaly;

                  return (
                    <div className="weather-month-row" key={month.date}>
                      <strong>
                        {formatForecastDate(month.date, {
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      <div className="weather-month-bar">
                        <span
                          style={{
                            width: `${(rainfall / maxMonthlyRainfall) * 100}%`,
                          }}
                        />
                      </div>
                      <span>{formatMillimeters(month.rainfall)}</span>
                      <span
                        className={
                          !Number.isFinite(anomaly) || anomaly === 0
                            ? "weather-anomaly-neutral"
                            : anomaly < 0
                              ? "weather-anomaly-dry"
                              : "weather-anomaly-wet"
                        }
                      >
                        {Number.isFinite(anomaly)
                          ? `${anomaly > 0 ? "+" : ""}${anomaly.toFixed(1)} mm vs normal`
                          : "Anomaly unavailable"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="weather-empty-state">
                {outlookLoading
                  ? "Loading the seasonal outlook…"
                  : "Seasonal outlook is unavailable."}
              </p>
            )}
          </section>
        </>
      )}

      <p className="weather-source-note">
        Current/forecast source:{" "}
        {outlook?.source || currentWeather?.source || "IMD"}; Open-Meteo is the
        fallback. Seasonal outlook:{" "}
        <a
          href="https://api.imd.gov.in/public/api_reference.html"
          target="_blank"
          rel="noreferrer"
        >
          India Meteorological Department
        </a>
        {" · "}
        <a
          href="https://open-meteo.com/en/docs/seasonal-forecast-api"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo seasonal outlook
        </a>
        . Seasonal predictions are broad and uncertain. Risk signals use
        rainfall only and are not official warnings or full drought/flood
        assessments.
      </p>
    </section>
  );
}

export default WeatherPage;
