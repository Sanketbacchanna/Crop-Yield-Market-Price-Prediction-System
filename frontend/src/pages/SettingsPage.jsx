import { useState } from "react";
import FarmProfiles from "../components/FarmProfiles";
import CropHistory from "../components/CropHistory";

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

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
    <section className="dashboard-section page-section" id="settings">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">PROFILE</p>
          <h2>Settings & Profile</h2>
          <p>Manage your account, security, and access preferences.</p>
        </div>
      </div>

      {currentUser.role === "farmer" && (
        <>
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

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
          <h3 style={{ marginTop: 0 }}>Profile details</h3>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Region</label>
              <input
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
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>New password</label>
              <input
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
              Save profile
            </button>
          </form>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
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
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
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
        <div style={{ marginTop: 20, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: 12, color: "#166534" }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ marginTop: 20, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, color: "#991b1b" }}>
          {errorMessage}
        </div>
      )}
    </section>
  );
}

export default SettingsPage;
