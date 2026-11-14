function Sidebar({ isOpen, onClose }) {
  const closeMenu = () => onClose?.();

  return (
    <aside
      id="primary-navigation"
      className={`sidebar${isOpen ? " sidebar-open" : ""}`}
      aria-label="Primary navigation"
    >
      <nav className="sidebar-nav">
        <p className="nav-label">Main</p>
        <a className="nav-item active" href="#dashboard" onClick={closeMenu}>
          <span aria-hidden="true">▦</span>
          Dashboard
        </a>

        <p className="nav-label">Predictions</p>
        <a className="nav-item" href="#crop-recommendation" onClick={closeMenu}>
          <span aria-hidden="true">🌾</span>
          Crop Recommendation
        </a>
        <a className="nav-item" href="#market-price" onClick={closeMenu}>
          <span aria-hidden="true">📈</span>
          Market Price
        </a>
        <a className="nav-item" href="#yield-prediction" onClick={closeMenu}>
          <span aria-hidden="true">🌱</span>
          Crop Yield
        </a>

        <p className="nav-label">Data</p>
        <a className="nav-item" href="#weather" onClick={closeMenu}>
          <span aria-hidden="true">🌦️</span>
          Weather
        </a>
        <a className="nav-item" href="#prediction-history" onClick={closeMenu}>
          <span aria-hidden="true">📋</span>
          Prediction History
        </a>
      </nav>

      <div className="sidebar-bottom">
        <a className="nav-item" href="#dashboard" onClick={closeMenu}>
          <span aria-hidden="true">⚙️</span>
          Settings
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;
