import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import DashboardHeader from "./components/DashboardHeader";
import Sidebar from "./components/Sidebar";
import {
  clearAuthSession,
  createPriceForecast,
  createYieldPrediction,
  getAgriculturalRecords,
  getCrops,
  getCropRecommendations,
  getAdminUsers,
  getCurrentUser,
  getPriceHistory,
  getYieldDistricts,
  getYieldHistory,
  getLiveWeather,
  getLocationName,
  getWeatherData,
  loginUser,
  logoutUser,
  registerUser,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  saveAuthSession,
  updateCurrentUser,
  verifyEmail,
} from "./services/api";
import "./App.css";

const pages = {
  dashboard: lazy(() => import("./pages/DashboardPage")),
  "market-price": lazy(() => import("./pages/MarketPricePage")),
  "yield-prediction": lazy(() => import("./pages/CropYieldPage")),
  "crop-recommendation": lazy(() => import("./pages/CropRecommendationPage")),
  weather: lazy(() => import("./pages/WeatherPage")),
  "prediction-history": lazy(() => import("./pages/PredictionHistoryPage")),
  settings: lazy(() => import("./pages/SettingsPage")),
};

const INITIAL_PRICES = {
  previousMonth: "2800",
  previousTwoMonths: "2750",
  previousThreeMonths: "2700",
  averagePrice: "2750",
};

function getStoredUser() {
  const storedUser = localStorage.getItem("crop_prediction_user");
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function getPageFromHash() {
  const pageId = window.location.hash.slice(1);
  return Object.hasOwn(pages, pageId) ? pageId : "dashboard";
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("crop_prediction_token") || ""
  );
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const isAuthenticated = Boolean(authToken && currentUser);

  const [cropOptions, setCropOptions] = useState([]);
  const [cropId, setCropId] = useState("1");
  const [prices, setPrices] = useState(INITIAL_PRICES);
  const [priceResult, setPriceResult] = useState(null);
  const [priceError, setPriceError] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);

  const [agriculturalRecords, setAgriculturalRecords] = useState([]);
  const [selectedAgriculturalId, setSelectedAgriculturalId] = useState("");
  const [farmArea, setFarmArea] = useState("");
  const [agriculturalError, setAgriculturalError] = useState("");
  const [yieldDistricts, setYieldDistricts] = useState([]);
  const [yieldDistrictError, setYieldDistrictError] = useState("");

  const [yieldResult, setYieldResult] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState("");
  const [yieldHistory, setYieldHistory] = useState([]);
  const [yieldHistoryLoading, setYieldHistoryLoading] = useState(true);
  const [yieldHistoryError, setYieldHistoryError] = useState("");

  const [recommendationResult, setRecommendationResult] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(true);
  const [priceHistoryError, setPriceHistoryError] = useState("");

  const [weatherData, setWeatherData] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveWeather, setLiveWeather] = useState(null);
  const [liveLocationLoading, setLiveLocationLoading] = useState(true);

  const logoutCurrentUser = useCallback(() => {
    clearAuthSession();
    logoutUser();
    setAuthToken("");
    setCurrentUser(null);
  }, []);

  const handleLogout = () => {
    logoutCurrentUser();
    setAuthError("");
  };

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      return;
    }

    let active = true;

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser();
        if (!active) {
          return;
        }

        setCurrentUser(user);
        saveAuthSession(authToken, user);
      } catch {
        if (active) {
          logoutCurrentUser();
        }
      }
    }

    loadCurrentUser();
    return () => {
      active = false;
    };
  }, [authToken, logoutCurrentUser]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        phone: authForm.phone,
      };

      const response =
        authMode === "login"
          ? await loginUser({
              email: payload.email,
              password: payload.password,
            })
          : await registerUser(payload);

      const { access_token, user } = response;
      saveAuthSession(access_token, user);
      setAuthToken(access_token);
      setCurrentUser(user);
      setAuthForm({ name: "", email: "", password: "", phone: "" });
    } catch (error) {
      setAuthError(getErrorMessage(error, "Unable to authenticate."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileUpdate = useCallback(
    async (payload) => {
      const updatedUser = await updateCurrentUser(payload);
      setCurrentUser(updatedUser);
      saveAuthSession(authToken, updatedUser);
      return updatedUser;
    },
    [authToken]
  );

  const handlePasswordResetRequest = useCallback(async (email) => {
    return requestPasswordReset(email);
  }, []);

  const handleEmailVerificationRequest = useCallback(async () => {
    return requestEmailVerification();
  }, []);

  const handlePasswordReset = useCallback(async (token, newPassword) => {
    return resetPassword(token, newPassword);
  }, []);

  const handleEmailVerification = useCallback(
    async (token) => {
      const result = await verifyEmail(token);
      const refreshedUser = await getCurrentUser();
      setCurrentUser(refreshedUser);
      saveAuthSession(authToken, refreshedUser);
      return result;
    },
    [authToken]
  );

  const loadPriceHistory = useCallback(async () => {
    setPriceHistoryLoading(true);
    setPriceHistoryError("");
    try {
      setPriceHistory(await getPriceHistory());
    } catch (error) {
      setPriceHistoryError(
        getErrorMessage(error, "Unable to load prediction history.")
      );
    } finally {
      setPriceHistoryLoading(false);
    }
  }, []);

  const loadYieldHistory = useCallback(async () => {
    setYieldHistoryLoading(true);
    setYieldHistoryError("");
    try {
      setYieldHistory(await getYieldHistory());
    } catch (error) {
      setYieldHistoryError(
        getErrorMessage(error, "Unable to load yield prediction history.")
      );
    } finally {
      setYieldHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setActivePage(getPageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    async function loadLiveFarmContext() {
      if (!navigator.geolocation) {
        setLiveLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          if (!active) {
            return;
          }

          try {
            const [locationName, weather] = await Promise.all([
              getLocationName(coords.latitude, coords.longitude),
              getLiveWeather(coords.latitude, coords.longitude),
            ]);

            setLiveLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              name: locationName,
            });
            setLiveWeather({ ...weather, location: locationName });
          } catch {
            setLiveLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              name: "Current location",
            });
          } finally {
            setLiveLocationLoading(false);
          }
        },
        () => {
          if (active) {
            setLiveLocationLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }

    loadLiveFarmContext();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    async function loadCrops() {
      try {
        const crops = await getCrops();
        if (!active) {
          return;
        }

        const normalizedCrops = Array.isArray(crops) ? crops : [];
        setCropOptions(normalizedCrops);

        if (normalizedCrops.length > 0) {
          const firstCropId = String(normalizedCrops[0].crop_id);
          setCropId((current) =>
            normalizedCrops.some((crop) => String(crop.crop_id) === current)
              ? current
              : firstCropId
          );
        }
      } catch {
        if (active) {
          setCropOptions([]);
        }
      }
    }

    loadCrops();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    async function loadInitialData() {
      const results = await Promise.allSettled([
        getPriceHistory(),
        getYieldHistory(),
        getAgriculturalRecords(),
        getWeatherData(),
        getYieldDistricts(),
      ]);

      if (!active) {
        return;
      }

      if (results[0].status === "fulfilled") {
        setPriceHistory(results[0].value);
      } else {
        setPriceHistoryError(
          getErrorMessage(
            results[0].reason,
            "Unable to load prediction history."
          )
        );
      }
      setPriceHistoryLoading(false);

      if (results[1].status === "fulfilled") {
        setYieldHistory(results[1].value);
      } else {
        setYieldHistoryError(
          getErrorMessage(
            results[1].reason,
            "Unable to load yield prediction history."
          )
        );
      }
      setYieldHistoryLoading(false);

      if (results[2].status === "fulfilled") {
        const records = results[2].value;
        setAgriculturalRecords(records);
        if (records.length > 0) {
          setSelectedAgriculturalId(String(records[0].agricultural_id));
        }
      } else {
        setAgriculturalError(
          getErrorMessage(
            results[2].reason,
            "Unable to load agricultural records."
          )
        );
      }

      if (results[3].status === "fulfilled") {
        setWeatherData(results[3].value);
      } else {
        setWeatherError(
          getErrorMessage(results[3].reason, "Unable to load weather data.")
        );
      }
      setWeatherLoading(false);

      if (results[4].status === "fulfilled") {
        setYieldDistricts(results[4].value);
      } else {
        setYieldDistrictError(
          getErrorMessage(
            results[4].reason,
            "Unable to load Karnataka districts."
          )
        );
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  function handlePriceChange(field, value) {
    setPrices((currentPrices) => ({
      ...currentPrices,
      [field]: value,
    }));
  }

  async function handlePriceSubmit(event) {
    event.preventDefault();
    setPriceLoading(true);
    setPriceResult(null);
    setPriceError("");

    try {
      setPriceResult(await createPriceForecast({ cropId, prices }));
      await loadPriceHistory();
    } catch (error) {
      setPriceError(getErrorMessage(error, "Unable to connect to the API."));
    } finally {
      setPriceLoading(false);
    }
  }

  async function handleYieldSubmit(event, cropName, district) {
    event.preventDefault();
    if (!selectedAgriculturalId) {
      setYieldError("Please select an agricultural record.");
      return;
    }

    setYieldLoading(true);
    setYieldError("");
    setYieldResult(null);

    try {
      setYieldResult(
        await createYieldPrediction(selectedAgriculturalId, cropName, district)
      );
      await loadYieldHistory();
    } catch (error) {
      setYieldError(getErrorMessage(error, "Unable to predict crop yield."));
    } finally {
      setYieldLoading(false);
    }
  }

  async function handleCropRecommendation(event) {
    event.preventDefault();
    if (!selectedAgriculturalId) {
      setRecommendationError("Please select an agricultural record.");
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendationResult(null);

    try {
      setRecommendationResult(
        await getCropRecommendations(selectedAgriculturalId)
      );
    } catch (error) {
      setRecommendationError(
        getErrorMessage(
          error,
          "Unable to connect to the crop recommendation API."
        )
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  const pageProps = {
    dashboard: {
      agriculturalRecords,
      yieldDistricts,
      selectedAgriculturalId,
      onAgriculturalChange: setSelectedAgriculturalId,
      farmArea,
      onAreaChange: setFarmArea,
      onYieldSubmit: handleYieldSubmit,
      yieldLoading,
      yieldError: yieldError || agriculturalError || yieldDistrictError,
      priceResult,
      recommendationResult,
      weatherData,
      weatherLoading,
      weatherError,
      yieldResult,
      liveLocation,
      liveWeather,
      liveLocationLoading,
    },
    "market-price": {
      cropId,
      crops: cropOptions,
      onCropChange: setCropId,
      prices,
      onPriceChange: handlePriceChange,
      onSubmit: handlePriceSubmit,
      loading: priceLoading,
      error: priceError,
      result: priceResult,
    },
    "yield-prediction": {
      agriculturalRecords,
      yieldDistricts,
      crops: cropOptions,
      selectedAgriculturalId,
      onAgriculturalChange: setSelectedAgriculturalId,
      farmArea,
      onAreaChange: setFarmArea,
      onSubmit: handleYieldSubmit,
      loading: yieldLoading,
      error: yieldError || agriculturalError || yieldDistrictError,
      result: yieldResult,
    },
    "crop-recommendation": {
      agriculturalRecords,
      selectedAgriculturalId,
      onAgriculturalChange: setSelectedAgriculturalId,
      onSubmit: handleCropRecommendation,
      loading: recommendationLoading,
      error: recommendationError || agriculturalError,
      result: recommendationResult,
    },
    weather: {
      weatherData,
      weatherLoading,
      weatherError,
      liveLocation,
      liveWeather,
      liveLocationLoading,
    },
    settings: {
      currentUser,
      onProfileUpdate: handleProfileUpdate,
      onPasswordResetRequest: handlePasswordResetRequest,
      onPasswordReset: handlePasswordReset,
      onEmailVerificationRequest: handleEmailVerificationRequest,
      onEmailVerification: handleEmailVerification,
      onLogout: handleLogout,
      loadAdminUsers: getAdminUsers,
    },
    "prediction-history": {
      yieldHistory,
      yieldHistoryLoading,
      yieldHistoryError,
      loadYieldHistory,
      priceHistory,
      priceHistoryLoading,
      priceHistoryError,
      loadPriceHistory,
    },
  };
  const ActivePage = pages[activePage];

  if (!isAuthenticated) {
    return (
      <div className="auth-shell" style={{ maxWidth: 540, margin: "80px auto", padding: 24 }}>
        <div className="card" style={{ borderRadius: 16, padding: 24, background: "#fff", boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 28 }}>AgriPredict</h2>
            <p style={{ margin: "8px 0 0", color: "#4b5563" }}>
              Sign in to access crop yield and market price predictions.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: authMode === "login" ? "#2563eb" : "#e5e7eb",
                color: authMode === "login" ? "#fff" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: authMode === "register" ? "#2563eb" : "#e5e7eb",
                color: authMode === "register" ? "#fff" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required={authMode === "register"}
                  placeholder="Enter your full name"
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Email
              </label>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, email: event.target.value }))
                }
                required
                placeholder="you@example.com"
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Password
              </label>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                required
                minLength={6}
                placeholder="Enter your password"
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </div>

            {authMode === "register" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Phone number
                </label>
                <input
                  type="tel"
                  value={authForm.phone}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="Optional"
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
                />
              </div>
            )}

            {authError && (
              <p style={{ margin: "0 0 16px", color: "#b91c1c", fontSize: 14 }}>
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#16a34a",
                color: "#fff",
                fontWeight: 700,
                cursor: authLoading ? "not-allowed" : "pointer",
              }}
            >
              {authLoading
                ? authMode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : authMode === "login"
                  ? "Login"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardHeader
        isMenuOpen={menuOpen}
        onMenuClick={() => setMenuOpen((isOpen) => !isOpen)}
      />
      <div className={`app-layout ${menuOpen ? "menu-open" : "menu-closed"}`}>
        <Sidebar
          isOpen={menuOpen}
          activePage={activePage}
          onNavigate={setActivePage}
          onClose={() => setMenuOpen(false)}
        />
        {menuOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <div className="main-area">
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px 0" }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: "none",
                borderRadius: 10,
                background: "#111827",
                color: "#fff",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Logout ({currentUser?.name || currentUser?.email || "User"})
            </button>
          </div>

          <main className="dashboard">
            <Suspense
              fallback={
                <p className="page-loading" role="status">
                  Loading page...
                </p>
              }
            >
              <ActivePage {...pageProps[activePage]} />
            </Suspense>
          </main>
          <footer className="footer">
            AgriPredict · Smart Agriculture Prediction Platform
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
