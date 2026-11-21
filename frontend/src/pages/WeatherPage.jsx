import { useEffect, useState } from "react";
import SummaryCard from "../components/SummaryCard";
import { getWeatherOutlook } from "../services/api";
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
  weatherData,
  weatherLoading,
  weatherError,
  liveLocation,
  liveWeather,
  liveLocationLoading,
}) {
  const [outlookState, setOutlookState] = useState({
    key: null,
    data: null,
    error: "",
  });
  const latitude = liveLocation?.latitude;
  const longitude = liveLocation?.longitude;
  const district = liveLocation?.district;
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const locationKey = hasCoordinates ? `${latitude},${longitude}` : null;

  useEffect(() => {
    if (!locationKey) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    getWeatherOutlook(latitude, longitude, district, controller.signal)
      .then((data) => {
        if (active) {
          setOutlookState({ key: locationKey, data, error: "" });
        }
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          setOutlookState({
            key: locationKey,
            data: null,
            error: error.message || "Unable to load weather outlooks.",
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [latitude, longitude, district, locationKey]);

  const currentWeather = liveWeather || weatherData[0];
  const locationName =
    liveLocation?.name || currentWeather?.location || "Current location";
  const hasCurrentOutlook = outlookState.key === locationKey;
  const outlook = hasCurrentOutlook ? outlookState.data : null;
  const outlookError = hasCurrentOutlook ? outlookState.error : "";
  const outlookLoading = Boolean(locationKey && !hasCurrentOutlook);
  const dailyForecast = getDailyForecast(outlook?.forecast);
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

      <div className="weather-summary-grid">
        <SummaryCard
          icon="🌦️"
          label="Current weather"
          value={
            currentWeather ? `${currentWeather.temperature ?? "—"}°C` : "—"
          }
          description={
            currentWeather
              ? `${locationName} · Rainfall ${currentWeather.rainfall ?? "—"} mm`
              : weatherError ||
                (weatherLoading || liveLocationLoading
                  ? "Loading current conditions…"
                  : "Current conditions unavailable")
          }
          accent="blue"
        />
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
