function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🌱</div>

        <div>
          <h2>AgriPredict</h2>
          <span>Smart Agriculture</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-label">MAIN</p>

        <button className="nav-item active">
          <span>▣</span>
          Dashboard
        </button>

        <p className="nav-label">PREDICTIONS</p>

        <button className="nav-item">
          <span>🌾</span>
          Crop Recommendation
        </button>

        <button className="nav-item">
          <span>📈</span>
          Market Price
        </button>

        <button className="nav-item">
          <span>🌱</span>
          Crop Yield
        </button>

        <p className="nav-label">DATA</p>

        <button className="nav-item">
          <span>🌦️</span>
          Weather
        </button>

        <button className="nav-item">
          <span>📋</span>
          Prediction History
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <span>⚙️</span>
          Settings
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;