function DashboardHeader({ onMenuClick }) {
  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          type="button"
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          aria-controls="primary-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="top-header-brand">
          <div className="top-header-icon">🌱</div>
          <div>
            <h1>AgriPredict</h1>
            <span>Smart Agriculture Platform</span>
          </div>
        </div>
      </div>

      <div className="top-header-status">
        <span className="status-dot" />
        <span>Prediction service</span>
      </div>
    </header>
  );
}

export function DashboardIntro() {
  return (
    <section className="dashboard-intro">
      <div className="intro-content">
        <p className="intro-eyebrow">🌿 SMART AGRICULTURE PLATFORM</p>

        <h2>
          Make smarter decisions
          <br />
          for your <span>next harvest.</span>
        </h2>

        <p className="intro-description">
          Use data-driven predictions to improve your farming yield
          <br className="desktop-break" /> and productivity.
        </p>
      </div>

      <div className="intro-visual">
        <span className="scene-cloud scene-cloud-one">☁</span>
        <span className="scene-cloud scene-cloud-two">☁</span>
        <span className="scene-drone">🚁</span>
        <span className="scene-mountain scene-mountain-back" />
        <span className="scene-mountain scene-mountain-front" />
        <span className="scene-tree scene-tree-one">🌲</span>
        <span className="scene-tree scene-tree-two">🌳</span>
        <span className="scene-house">🏡</span>
        <span className="scene-field">🌾  🌱  🌾  🌱  🌾</span>
      </div>
    </section>
  );
}

export default DashboardHeader;