import { useState } from "react";
import FarmProfiles from "../components/FarmProfiles";
import CropHistory from "../components/CropHistory";
import "./SettingsPage.css";

function SettingsPage({
  currentUser,
  onProfileUpdate,
  onPasswordResetRequest,
  onEmailVerificationRequest,
  onEmailVerification,
  onLogout,
  loadAdminUsers,
  loadRegionUsers,
  onAdminUserUpdate,
  farms,
  cropHistory,
  farmDistricts,
  farmsLoading,
  farmsError,
  onFarmSave,
  onFarmDelete,
  onCropHistorySave,
  onCropHistoryDelete,
}) {
  const [form, setForm] = useState(() => ({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    password: "",
    region: currentUser?.region || "",
  }));
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [regionEdits, setRegionEdits] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    setSavingProfile(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        region: form.region,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const updatedUser = await onProfileUpdate(payload);
      setForm((current) => ({ ...current, password: "" }));
      setStatusMessage(`Profile updated for ${updatedUser.name || updatedUser.email}.`);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await onPasswordResetRequest(form.email);
      setStatusMessage(response?.message || "Password reset request generated.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to process the password reset request.");
    }
  };

  const handleVerifyEmail = async () => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await onEmailVerificationRequest();
      if (response?.verification_token) {
        setVerificationToken(response.verification_token);
      }
      setStatusMessage(response?.message || "Email verification token generated.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to generate an email verification token.");
    }
  };

  const handleTokenVerification = async () => {
    if (!verificationToken.trim()) {
      setErrorMessage("Generate a verification token first.");
      return;
    }

    try {
      const response = await onEmailVerification(verificationToken.trim());
      setVerificationToken("");
      setStatusMessage(response?.message || "Email verified successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to verify email.");
    }
  };

  const loadUsers = async () => {
    const load = currentUser.role === "regional_admin" ? loadRegionUsers : loadAdminUsers;
    if (!load) {
      return;
    }

    try {
      setLoadingUsers(true);
      const users = await load();
      setAdminUsers(users);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdminUserUpdate = async (user) => {
    setStatusMessage("");
    setErrorMessage("");
    try {
      const updatedUser = await onAdminUserUpdate(
        user.user_id,
        user.role,
        regionEdits[user.user_id] ?? user.region ?? ""
      );
      setAdminUsers((current) =>
        current.map((item) => item.user_id === updatedUser.user_id ? updatedUser : item)
      );
      setStatusMessage(`Updated access for ${updatedUser.name || updatedUser.email}.`);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update user access.");
    }
  };

  if (!currentUser) {
    return <p>Loading profile...</p>;
  }

  return (
    <section className="dashboard-section page-section settings-page" id="settings">
      <div className="section-heading settings-heading">
        <div>
          <p className="section-eyebrow">PROFILE</p>
          <h2>Settings & Profile</h2>
          <p>Manage your account, security, and access preferences.</p>
        </div>
      </div>

      <div className="settings-hero">
        <div className="settings-avatar" aria-hidden="true">
          {(currentUser.name || currentUser.email || "U").slice(0, 1).toUpperCase()}
        </div>
        <div className="settings-hero-copy">
          <span className="settings-hero-kicker">Account center</span>
          <h3>{currentUser.name || "Your profile"}</h3>
          <p>{currentUser.email}</p>
        </div>
        <div className="settings-hero-badges">
          <span className="settings-role-badge">{currentUser.role || "farmer"}</span>
          <span className={`settings-verified-badge${currentUser.is_email_verified ? " is-verified" : ""}`}>
            <span aria-hidden="true">{currentUser.is_email_verified ? "✓" : "!"}</span>
            {currentUser.is_email_verified ? "Email verified" : "Email pending"}
          </span>
        </div>
      </div>

      <div className="settings-summary" aria-label="Account summary">
        <div className="settings-summary-card settings-summary-primary">
          <span className="settings-summary-icon" aria-hidden="true">⌂</span>
          <div>
            <strong>{farms?.length || 0}</strong>
            <span>Farm profiles</span>
          </div>
        </div>
        <div className="settings-summary-card settings-summary-blue">
          <span className="settings-summary-icon" aria-hidden="true">▦</span>
          <div>
            <strong>{cropHistory?.length || 0}</strong>
            <span>Crop records</span>
          </div>
        </div>
        <div className="settings-summary-card settings-summary-gold">
          <span className="settings-summary-icon" aria-hidden="true">✦</span>
          <div>
            <strong>{currentUser.is_email_verified ? "Ready" : "Action"}</strong>
            <span>Account status</span>
          </div>
        </div>
      </div>

      {currentUser.role === "farmer" && (
        <>
          <div className="settings-section-heading">
            <span className="settings-section-number">01</span>
            <div>
              <p>FARM WORKSPACE</p>
              <h3>Farm profiles & crop history</h3>
            </div>
          </div>
          <FarmProfiles
            farms={farms}
            districts={farmDistricts}
            loading={farmsLoading}
            error={farmsError}
            onSave={onFarmSave}
            onDelete={onFarmDelete}
          />
          <CropHistory
            history={cropHistory}
            farms={farms}
            onSave={onCropHistorySave}
            onDelete={onCropHistoryDelete}
          />
        </>
      )}

      <div className="settings-section-heading settings-account-heading">
        <span className="settings-section-number">02</span>
        <div>
          <p>ACCOUNT CONTROL</p>
          <h3>Profile details & security</h3>
        </div>
      </div>
      <div className="settings-grid">
        <div className="settings-card">
          <h3 style={{ marginTop: 0 }}>Profile details</h3>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="settings-name" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Name</label>
              <input
                id="settings-name"
                type="text"
                value={form.name}
                required
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label htmlFor="settings-email" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Email</label>
              <input
                id="settings-email"
                type="email"
                value={form.email}
                required
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label htmlFor="settings-phone" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Phone</label>
              <input
                id="settings-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label htmlFor="settings-region" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Region</label>
              <input
                id="settings-region"
                type="text"
                value={form.region}
                disabled={currentUser.role !== "farmer"}
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                placeholder="District or region"
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
              {currentUser.role !== "farmer" && (
                <small>Staff regions are assigned by an administrator.</small>
              )}
            </div>

            <div>
              <label htmlFor="settings-password" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>New password</label>
              <input
                id="settings-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Leave empty to keep current password"
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "#475569" }}>Role</div>
                <strong>{currentUser.role || "farmer"}</strong>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#475569" }}>Email status</div>
                <strong>{currentUser.is_email_verified ? "Verified" : "Pending verification"}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {savingProfile ? "Saving profile…" : "Save profile"}
            </button>
          </form>
        </div>

        <div className="settings-card">
          <h3 style={{ marginTop: 0 }}>Security</h3>

          <div style={{ display: "grid", gap: 14 }}>
            <button
              type="button"
              onClick={handlePasswordReset}
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                cursor: "pointer",
              }}
            >
              Email password reset link
            </button>
            <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
              A secure link will be sent to {form.email || "your account email"}.
            </p>

            <button
              type="button"
              onClick={handleVerifyEmail}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Generate email verification token
            </button>

            {verificationToken && (
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 10, wordBreak: "break-all" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Verification token</div>
                <div>{verificationToken}</div>
              </div>
            )}

            <button
              type="button"
              onClick={handleTokenVerification}
              style={{
                background: "#06b6d4",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Verify email with token
            </button>

            <button
              type="button"
              onClick={onLogout}
              style={{
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {(currentUser.role === "admin" || currentUser.role === "regional_admin") && (
        <div className="settings-card settings-admin">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{currentUser.role === "admin" ? "User access management" : `Farmers in ${currentUser.region || "your region"}`}</h3>
            <button type="button" onClick={loadUsers} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
              {loadingUsers ? "Loading..." : "Load users"}
            </button>
          </div>

          {adminUsers.length === 0 ? (
            <p style={{ color: "#475569" }}>No users loaded yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {adminUsers.map((user) => (
                <div key={user.user_id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
                  <div style={{ color: "#475569" }}>{user.email}</div>
                  <div style={{ color: "#475569" }}>Role: {user.role || "farmer"}</div>
                  {currentUser.role === "admin" && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <select
                        aria-label={`Role for ${user.email}`}
                        value={user.role || "farmer"}
                        onChange={(event) => setAdminUsers((current) =>
                          current.map((item) => item.user_id === user.user_id
                            ? { ...item, role: event.target.value }
                            : item)
                        )}
                      >
                        <option value="farmer">Farmer</option>
                        <option value="regional_admin">Regional admin</option>
                        <option value="admin">Admin</option>
                      </select>
                      <input
                        aria-label={`Assigned region for ${user.email}`}
                        value={regionEdits[user.user_id] ?? user.region ?? ""}
                        onChange={(event) => setRegionEdits((current) => ({
                          ...current,
                          [user.user_id]: event.target.value,
                        }))}
                        placeholder="Assigned region"
                      />
                      <button type="button" onClick={() => handleAdminUserUpdate(user)}>
                        Save access
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <div className="settings-message is-success" role="status">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="settings-message is-error" role="alert">
          {errorMessage}
        </div>
      )}
    </section>
  );
}

export default SettingsPage;
