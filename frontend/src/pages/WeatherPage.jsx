import SummaryCard from "../components/SummaryCard";

function WeatherPage({
  weatherData,
  weatherLoading,
  weatherError,
  liveLocation,
  liveWeather,
  liveLocationLoading,
}) {
  const currentWeather = liveWeather || weatherData[0];
  const locationName = liveLocation?.name || currentWeather?.location || "Current location";

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
              ? `${locationName} • Rainfall ${currentWeather.rainfall ?? "—"} mm`
              : weatherError ||
                (weatherLoading || liveLocationLoading
                  ? "Loading weather..."
                  : "No weather data")
          }
          accent="blue"
        />
      </div>
    </section>
  );
}

export default WeatherPage;
