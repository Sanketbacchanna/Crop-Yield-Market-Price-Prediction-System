function Sidebar({ isOpen, activePage, onNavigate, onClose }) {
  function navigateTo(pageId) {
    onNavigate(pageId);
    onClose?.();
  }

  return (
    <aside
      id="primary-navigation"
      className={`sidebar${isOpen ? " sidebar-open" : ""}`}
      aria-label="Primary navigation"
    >
      <nav className="sidebar-nav">
        <p className="nav-label">Main</p>
        <a
          className={`nav-item${activePage === "dashboard" ? " active" : ""}`}
          href="#dashboard"
          aria-current={activePage === "dashboard" ? "page" : undefined}
          onClick={() => navigateTo("dashboard")}
        >
          <span aria-hidden="true">▦</span>
          Dashboard
        </a>

        <p className="nav-label">Predictions</p>
        <a
          className={`nav-item${activePage === "crop-recommendation" ? " active" : ""}`}
          href="#crop-recommendation"
          aria-current={
            activePage === "crop-recommendation" ? "page" : undefined
          }
          onClick={() => navigateTo("crop-recommendation")}
        >
          <span aria-hidden="true">🌾</span>
          Crop Recommendation
        </a>
        <a
          className={`nav-item${activePage === "market-price" ? " active" : ""}`}
          href="#market-price"
          aria-current={activePage === "market-price" ? "page" : undefined}
          onClick={() => navigateTo("market-price")}
        >
          <span aria-hidden="true">📈</span>
          Market Price
        </a>
        <a
          className={`nav-item${activePage === "yield-prediction" ? " active" : ""}`}
          href="#yield-prediction"
          aria-current={activePage === "yield-prediction" ? "page" : undefined}
          onClick={() => navigateTo("yield-prediction")}
        >
          <span aria-hidden="true">🌱</span>
          Crop Yield
        </a>

        <p className="nav-label">Farm tools</p>
        <a
          className={`nav-item${activePage === "farmer-tools" ? " active" : ""}`}
          href="#farmer-tools"
          aria-current={activePage === "farmer-tools" ? "page" : undefined}
          onClick={() => navigateTo("farmer-tools")}
        >
          <span aria-hidden="true">🗓️</span>
          Calendar & Schemes
        </a>
        <a
          className={`nav-item${activePage === "business-insights" ? " active" : ""}`}
          href="#business-insights"
          aria-current={activePage === "business-insights" ? "page" : undefined}
          onClick={() => navigateTo("business-insights")}
        >
          <span aria-hidden="true">📊</span>
          Business Insights
        </a>

        <p className="nav-label">Data</p>
        <a
          className={`nav-item${activePage === "weather" ? " active" : ""}`}
          href="#weather"
          aria-current={activePage === "weather" ? "page" : undefined}
          onClick={() => navigateTo("weather")}
        >
          <span aria-hidden="true">🌦️</span>
          Weather
        </a>
        <a
          className={`nav-item${activePage === "prediction-history" ? " active" : ""}`}
          href="#prediction-history"
          aria-current={activePage === "prediction-history" ? "page" : undefined}
          onClick={() => navigateTo("prediction-history")}
        >
          <span aria-hidden="true">📋</span>
          Prediction History
        </a>
      </nav>

      <div className="sidebar-bottom">
        <a
          className={`nav-item${activePage === "settings" ? " active" : ""}`}
          href="#settings"
          aria-current={activePage === "settings" ? "page" : undefined}
          onClick={() => navigateTo("settings")}
        >
          <span aria-hidden="true">⚙️</span>
          Settings
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;
