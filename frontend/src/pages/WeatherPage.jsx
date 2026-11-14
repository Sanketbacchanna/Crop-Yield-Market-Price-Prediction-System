import SummaryCard from "../components/SummaryCard";

function WeatherPage({ weatherData, weatherLoading, weatherError }) {
  const currentWeather = weatherData[0];

  return (
    <section className="dashboard-section page-section" id="weather">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">FARM CONDITIONS</p>
          <h2>Weather</h2>
          <p>Current weather information available for your farm.</p>
        </div>
      </div>

      <div className="weather-summary-grid">
        <SummaryCard
          icon="🌦️"
          label="Weather"
          value={
            currentWeather ? `${currentWeather.temperature ?? "—"}°C` : "—"
          }
          description={
            currentWeather
              ? `${currentWeather.location || "Unknown"} • Rainfall ${currentWeather.rainfall ?? "—"} mm`
              : weatherError ||
                (weatherLoading ? "Loading weather..." : "No weather data")
          }
          accent="blue"
        />
      </div>
    </section>
  );
}

export default WeatherPage;
