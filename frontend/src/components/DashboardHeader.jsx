import { useState } from "react";

function DashboardHeader({
  onMenuClick,
  isMenuOpen,
  isOnline = true,
  pendingCropHistoryCount = 0,
  theme = "light",
  onThemeToggle,
  onProfileClick,
  onLogout,
  currentUser,
  canInstall = false,
  onInstall,
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          type="button"
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          aria-controls="primary-navigation"
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="top-header-brand">
          <img
            className="top-header-logo"
            src="/crop-yield-portal-logo.png"
            alt="Crop Yield & Market Price Prediction Portal"
          />
          <div className="top-header-brand-copy">
            <h1>AgriPredict</h1>
            <span>Smart Agriculture Platform</span>
          </div>
        </div>
      </div>

      <div className="top-header-actions">
        <button
          type="button"
          className="profile-button"
          onClick={() => setProfileOpen((isOpen) => !isOpen)}
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
          aria-controls="profile-menu"
          title="Profile"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20c.7-3.25 3.1-5 6.5-5s5.8 1.75 6.5 5" />
          </svg>
        </button>
        {profileOpen && (
          <div className="profile-menu" id="profile-menu">
            <div className="profile-menu-heading">
              <strong>{currentUser?.name || "Your profile"}</strong>
              <span>{currentUser?.email || "Signed-in account"}</span>
            </div>
            <div
              className={`profile-menu-status${isOnline ? "" : " is-offline"}${pendingCropHistoryCount ? " has-pending" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="status-dot" />
              <span>
                {!isOnline
                  ? "Offline mode"
                  : pendingCropHistoryCount
                    ? `${pendingCropHistoryCount} crop record${pendingCropHistoryCount === 1 ? "" : "s"} to sync`
                    : "Online"}
              </span>
            </div>
            <button
              type="button"
              className="profile-menu-link"
              onClick={() => {
                setProfileOpen(false);
                onProfileClick?.();
              }}
            >
              Profile settings
            </button>
            {canInstall && (
              <button
                type="button"
                className="profile-menu-install"
                onClick={() => {
                  setProfileOpen(false);
                  onInstall?.();
                }}
              >
                Install AgriPredict
              </button>
            )}
            <button
              type="button"
              className="profile-menu-logout"
              onClick={() => {
                setProfileOpen(false);
                onLogout?.();
              }}
            >
              Logout
            </button>
          </div>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-pressed={theme === "dark"}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
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
