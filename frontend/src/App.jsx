import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import DashboardHeader from "./components/DashboardHeader";
import Sidebar from "./components/Sidebar";
import {
  clearAuthSession,
  createFarmProfile,
  createCropHistory,
  createPriceForecast,
  createYieldPrediction,
  deleteFarmProfile,
  deleteCropHistory,
  getAgriculturalRecords,
  getCrops,
  getCropRecommendations,
  getAdminUsers,
  getRegionUsers,
  getCurrentUser,
  getCropHistory,
  getFarmProfiles,
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
  updateAdminUserRole,
  updateFarmProfile,
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
  const [passwordResetToken, setPasswordResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("reset_token") || ""
  );
  const [authMode, setAuthMode] = useState(() =>
    new URLSearchParams(window.location.search).has("reset_token") ? "reset" : "login"
  );
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    region: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
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
  const [farmProfileState, setFarmProfileState] = useState({
    userId: null,
    farms: [],
    loading: true,
    error: "",
  });

  const [yieldResult, setYieldResult] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState("");
  const [yieldHistory, setYieldHistory] = useState([]);
  const [yieldHistoryLoading, setYieldHistoryLoading] = useState(true);
  const [yieldHistoryError, setYieldHistoryError] = useState("");
  const [cropHistory, setCropHistory] = useState([]);

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
  const isCurrentUserFarmState =
    farmProfileState.userId === currentUser?.user_id;
  const farmProfiles = isCurrentUserFarmState ? farmProfileState.farms : [];
  const farmProfilesLoading =
    !isCurrentUserFarmState || farmProfileState.loading;
  const farmProfilesError = isCurrentUserFarmState
    ? farmProfileState.error
    : "";

  const logoutCurrentUser = useCallback(() => {
    clearAuthSession();
    logoutUser();
    setAuthToken("");
    setCurrentUser(null);
    setCropHistory([]);
    setPriceHistory([]);
    setYieldHistory([]);
  }, []);

  const handleLogout = () => {
    logoutCurrentUser();
    setAuthError("");
  };

  useEffect(() => {
    if (!authToken) {
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
    setAuthNotice("");

    try {
      if (authMode === "forgot") {
        const result = await requestPasswordReset(authForm.email);
        setAuthNotice(result.message);
        return;
      }

      if (authMode === "reset") {
        await resetPassword(passwordResetToken, authForm.password);
        setPasswordResetToken("");
        window.history.replaceState({}, "", window.location.pathname);
        setAuthMode("login");
        setAuthForm((current) => ({ ...current, password: "" }));
        setAuthNotice("Your password was reset. Sign in with your new password.");
        return;
      }

      const payload = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        phone: authForm.phone,
        region: authForm.region,
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
      setCropHistory([]);
      setPriceHistory([]);
      setYieldHistory([]);
      setAuthForm({ name: "", email: "", password: "", phone: "", region: "" });
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

  const handleFarmSave = useCallback(async (payload, farmId) => {
    const savedFarm = farmId
      ? await updateFarmProfile(farmId, payload)
      : await createFarmProfile(payload);

    const userId = currentUser?.user_id;
    setFarmProfileState((current) => {
      const farms = current.userId === userId ? current.farms : [];
      return {
        userId,
        farms: farmId
          ? farms.map((farm) =>
              farm.farm_id === farmId ? savedFarm : farm
            )
          : [...farms, savedFarm],
        loading: false,
        error: "",
      };
    });
    return savedFarm;
  }, [currentUser?.user_id]);

  const handleFarmDelete = useCallback(async (farmId) => {
    await deleteFarmProfile(farmId);
    setFarmProfileState((current) => ({
      ...current,
      farms: current.farms.filter((farm) => farm.farm_id !== farmId),
    }));
  }, []);

  const handleCropHistorySave = useCallback(async (payload) => {
    const savedHistory = await createCropHistory(payload);
    setCropHistory((current) => [savedHistory, ...current]);
    return savedHistory;
  }, []);

  const handleCropHistoryDelete = useCallback(async (historyId) => {
    await deleteCropHistory(historyId);
    setCropHistory((current) =>
      current.filter((entry) => entry.history_id !== historyId)
    );
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

          const currentLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            name: "Current location",
          };
          setLiveLocation(currentLocation);

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
            setLiveLocation(currentLocation);
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
    if (!isAuthenticated || !currentUser?.user_id) {
      return;
    }

    let active = true;
    const userId = currentUser.user_id;

    getFarmProfiles()
      .then((farms) => {
        if (active) {
          setFarmProfileState({ userId, farms, loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setFarmProfileState({
            userId,
            farms: [],
            loading: false,
            error: getErrorMessage(error, "Unable to load farm profiles."),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, currentUser?.user_id]);

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
        getCropHistory(),
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

      if (results[5].status === "fulfilled") {
        setCropHistory(results[5].value);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [isAuthenticated, currentUser?.user_id]);

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
      farms: farmProfiles,
      farmDistricts: yieldDistricts,
      farmsLoading: farmProfilesLoading,
      farmsError: farmProfilesError,
      cropHistory,
      onFarmSave: handleFarmSave,
      onFarmDelete: handleFarmDelete,
      onCropHistorySave: handleCropHistorySave,
      onCropHistoryDelete: handleCropHistoryDelete,
      onProfileUpdate: handleProfileUpdate,
      onPasswordResetRequest: handlePasswordResetRequest,
      onEmailVerificationRequest: handleEmailVerificationRequest,
      onEmailVerification: handleEmailVerification,
      onLogout: handleLogout,
      loadAdminUsers: getAdminUsers,
      loadRegionUsers: getRegionUsers,
      onAdminUserUpdate: updateAdminUserRole,
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
      <div className="auth-shell">
        <div className="auth-card">
          <aside className="auth-visual">
            <div className="auth-brand"><span aria-hidden="true">✳</span> AgriPredict</div>
            <div>
              <p className="auth-visual-eyebrow">GROW WITH CONFIDENCE</p>
              <h1>Better decisions<br />start at the farm.</h1>
              <p>Keep your farm records close and turn trusted agricultural insights into your next growing season.</p>
            </div>
            <div className="auth-visual-note">
              <span aria-hidden="true">↗</span>
              <span>Yield insights · Market forecasts · Your farm history</span>
            </div>
          </aside>

          <section className="auth-content" aria-labelledby="auth-title">
            <div className="auth-mobile-brand"><span aria-hidden="true">✳</span> AgriPredict</div>
            <p className="auth-eyebrow">
              {authMode === "register" ? "CREATE YOUR ACCOUNT" : authMode === "reset" ? "ACCOUNT RECOVERY" : "WELCOME TO AGRIPREDICT"}
            </p>
            <h2 id="auth-title">
              {authMode === "register" ? "Start growing smarter" : authMode === "forgot" ? "Forgot your password?" : authMode === "reset" ? "Choose a new password" : "Welcome back"}
            </h2>
            <p className="auth-intro">
              {authMode === "register"
                ? "Create your farmer account to save predictions and farm records."
                : authMode === "forgot"
                  ? "Enter your account email and we’ll send a secure reset link."
                  : authMode === "reset"
                    ? "Your secure reset link is ready. Set a new password below."
                    : "Sign in to pick up where you left off."}
            </p>

            {(authMode === "login" || authMode === "register") && (
              <div className="auth-tabs" role="tablist" aria-label="Account access">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === "login"}
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === "register"}
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => { setAuthMode("register"); setAuthError(""); setAuthNotice(""); }}
                >
                  Create account
                </button>
              </div>
            )}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label className="auth-field">
                  Full name
                  <input
                    type="text"
                    autoComplete="name"
                    value={authForm.name}
                    onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                    required
                    placeholder="Your full name"
                  />
                </label>
              )}

              <label className="auth-field">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  placeholder="you@example.com"
                />
              </label>

              {authMode !== "forgot" && (
                <label className="auth-field">
                  {authMode === "reset" ? "New password" : "Password"}
                  <input
                    type="password"
                    autoComplete={authMode === "reset" ? "new-password" : authMode === "register" ? "new-password" : "current-password"}
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    required
                    minLength={6}
                    placeholder={authMode === "reset" ? "At least 6 characters" : "Enter your password"}
                  />
                </label>
              )}

              {authMode === "register" && (
                <>
                  <label className="auth-field">
                    Phone number <span className="auth-optional">Optional</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={authForm.phone}
                      onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Your phone number"
                    />
                  </label>
                  <label className="auth-field">
                    Region <span className="auth-optional">Optional</span>
                    <input
                      type="text"
                      value={authForm.region}
                      onChange={(event) => setAuthForm((current) => ({ ...current, region: event.target.value }))}
                      placeholder="District or region"
                    />
                  </label>
                </>
              )}

              {authMode === "login" && (
                <button
                  type="button"
                  className="auth-text-button auth-forgot"
                  onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthNotice(""); }}
                >
                  Forgot password?
                </button>
              )}

              {authError && <p className="auth-error" role="alert">{authError}</p>}
              {authNotice && <p className="auth-notice" role="status">{authNotice}</p>}

              <button className="auth-submit" type="submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "register"
                    ? "Create farmer account"
                    : authMode === "forgot"
                      ? "Send reset link"
                      : authMode === "reset"
                        ? "Reset password"
                        : "Sign in"}
                {!authLoading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {(authMode === "forgot" || authMode === "reset") && (
              <button
                type="button"
                className="auth-text-button auth-back"
                onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}
              >
                ← Back to sign in
              </button>
            )}
            {authMode === "register" && (
              <p className="auth-role-note">New accounts are created as farmers. Administrators assign staff access.</p>
            )}
          </section>
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
