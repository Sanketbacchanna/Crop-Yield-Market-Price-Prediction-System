import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  getLocationDetails,
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
import {
  getCachedCropHistory,
  getPendingCropHistory,
  queueOfflineCropHistory,
  removePendingCropHistory,
  saveCachedCropHistory,
} from "./utils/offlineStorage";
import "./App.css";

const pages = {
  dashboard: lazy(() => import("./pages/DashboardPage")),
  "market-price": lazy(() => import("./pages/MarketPricePage")),
  "yield-prediction": lazy(() => import("./pages/CropYieldPage")),
  "crop-recommendation": lazy(() => import("./pages/CropRecommendationPage")),
  "farmer-tools": lazy(() => import("./pages/FarmerToolsPage")),
  "business-insights": lazy(() => import("./pages/BusinessInsightsPage")),
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

const MARKET_COMMODITY_NAMES = {
  Bajra: "Bajra (Pearl Millet/Cumbu)",
  Arecanut: "Arecanut (Betelnut/Supari)",
  "Black pepper": "Black pepper",
  "Cotton(lint)": "Cotton",
  "Dry chillies": "Dry Chillies",
  Groundnut: "Ground Nut Seed",
  "Horse-gram": "Kulthi (Horse Gram)",
  Rice: "Rice",
  Sunflower: "Sunflower/Sunflower Seed",
};

const MARKET_DISTRICT_NAMES = {
  "Dakshina Kannada": "Mangalore (Dakshin Kannad)",
  "Bengaluru Urban": "Bangalore",
  Ballari: "Bellary",
  Belagavi: "Belgaum",
  Kalaburagi: "Kalburgi",
  Mysuru: "Mysore",
  Shivamogga: "Shimoga",
  Tumakuru: "Tumkur",
  Vijayapura: "Bijapur",
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
  const cropHistorySyncRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCropHistoryCount, setPendingCropHistoryCount] = useState(0);
  const [offlineSyncError, setOfflineSyncError] = useState("");
  const [cropHistoryLoaded, setCropHistoryLoaded] = useState(false);
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("crop_prediction_token") || ""
  );
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("agripredict_theme") === "dark" ? "dark" : "light"
  );
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

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleAppInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agripredict_theme", theme);
  }, [theme]);

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
  const [marketPricePrefill, setMarketPricePrefill] = useState(null);
  const [marketPricePreview, setMarketPricePreview] = useState([]);
  const [marketPricePreviewLoading, setMarketPricePreviewLoading] = useState(false);
  const [marketPricePreviewError, setMarketPricePreviewError] = useState("");
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
    setCropHistoryLoaded(false);
    setPendingCropHistoryCount(0);
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
      } catch (error) {
        if (active && (!navigator.onLine || error instanceof TypeError)) {
          setOfflineSyncError(
            "Using this device's last signed-in profile while offline. Reconnect to verify your account."
          );
        } else if (active) {
          logoutCurrentUser();
        }
      }
    }

    loadCurrentUser();
    return () => {
      active = false;
    };
  }, [authToken, logoutCurrentUser, isOnline]);

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
    try {
      const savedHistory = await createCropHistory(payload);
      setCropHistory((current) => [savedHistory, ...current]);
      return savedHistory;
    } catch (error) {
      if (navigator.onLine) {
        throw error;
      }
      const userId = currentUser?.user_id;
      const savedOffline = queueOfflineCropHistory(userId, payload);
      setCropHistory((current) => [savedOffline, ...current]);
      setPendingCropHistoryCount(getPendingCropHistory(userId).length);
      setOfflineSyncError("");
      return savedOffline;
    }
  }, [currentUser?.user_id]);

  const handleCropHistoryDelete = useCallback(async (historyId) => {
    if (!navigator.onLine) {
      throw new Error("Connect to the internet before deleting a synced crop record.");
    }
    await deleteCropHistory(historyId);
    setCropHistory((current) =>
      current.filter((entry) => entry.history_id !== historyId)
    );
  }, []);

  const syncPendingCropHistory = useCallback(async () => {
    const userId = currentUser?.user_id;
    if (
      !isAuthenticated ||
      !userId ||
      !navigator.onLine ||
      cropHistorySyncRef.current
    ) {
      return;
    }
    cropHistorySyncRef.current = true;

    try {
      try {
        const pending = getPendingCropHistory(userId);
        for (const record of pending) {
          const {
            history_id: localHistoryId,
            ...payload
          } = record;
          const clientId = payload.client_id;
          delete payload.client_id;
          delete payload.is_offline_pending;
          try {
            const savedHistory = await createCropHistory(payload);
            removePendingCropHistory(userId, clientId);
            setCropHistory((current) => [
              savedHistory,
              ...current.filter(
                (item) =>
                  item.client_id !== clientId &&
                  item.history_id !== localHistoryId
              ),
            ]);
          } catch (error) {
            setOfflineSyncError(
              getErrorMessage(error, "Unable to sync offline crop records.")
            );
            break;
          }
        }
      } catch (error) {
        setOfflineSyncError(error.message || "Unable to read offline crop records.");
      }

      try {
        const remaining = getPendingCropHistory(userId).length;
        setPendingCropHistoryCount(remaining);
        if (remaining === 0) {
          setOfflineSyncError("");
        }
      } catch (error) {
        setOfflineSyncError(error.message || "Unable to update offline sync status.");
      }
    } finally {
      cropHistorySyncRef.current = false;
    }
  }, [currentUser?.user_id, isAuthenticated]);

  useEffect(() => {
    function handleHashChange() {
      setActivePage(getPageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.user_id && cropHistoryLoaded) {
      try {
        saveCachedCropHistory(currentUser.user_id, cropHistory);
      } catch (error) {
        console.error("Unable to cache crop history.", error);
      }
    }
  }, [cropHistory, cropHistoryLoaded, currentUser?.user_id]);

  useEffect(() => {
    if (isAuthenticated && isOnline && cropHistoryLoaded) {
      Promise.resolve().then(syncPendingCropHistory);
    }
  }, [isAuthenticated, isOnline, cropHistoryLoaded, syncPendingCropHistory]);

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
            const [locationDetails, weather] = await Promise.all([
              getLocationDetails(coords.latitude, coords.longitude),
              getLiveWeather(coords.latitude, coords.longitude),
            ]);

            setLiveLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              ...locationDetails,
            });
            setLiveWeather({ ...weather, location: locationDetails.name });
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
    const userId = currentUser?.user_id;

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
      setCropHistoryLoaded(false);
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
        try {
          const userId = currentUser?.user_id;
          const pending = getPendingCropHistory(userId);
          const serverHistory = results[5].value;
          setCropHistory([...pending, ...serverHistory]);
          setPendingCropHistoryCount(pending.length);
          setOfflineSyncError("");
        } catch (error) {
          setOfflineSyncError(error.message || "Unable to load saved crop records.");
          setCropHistory(results[5].value);
        }
      } else {
        try {
          const userId = currentUser.user_id;
          const pending = getPendingCropHistory(userId);
          const cached = getCachedCropHistory(userId);
          const pendingIds = new Set(pending.map((record) => record.history_id));
          setCropHistory([
            ...pending,
            ...cached.filter((record) => !pendingIds.has(record.history_id)),
          ]);
          setPendingCropHistoryCount(pending.length);
          setOfflineSyncError(
            navigator.onLine
              ? "Showing the last saved crop history because it could not be refreshed."
              : "Showing saved crop history while offline."
          );
        } catch (error) {
          setOfflineSyncError(error.message || "Unable to load saved crop records.");
        }
      }
      setCropHistoryLoaded(true);
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

  async function handleYieldSubmit(event, cropName, district, area) {
    event.preventDefault();
    if (!selectedAgriculturalId) {
      setYieldError("Please select an agricultural record.");
      return;
    }

    setYieldLoading(true);
    setYieldError("");
    setYieldResult(null);
    setMarketPricePreview([]);
    setMarketPricePreviewError("");

    try {
      const prediction = await createYieldPrediction(
        selectedAgriculturalId,
        cropName,
        district,
        area
      );
      setYieldResult(prediction);
      setMarketPricePrefill({
        state: "Karnataka",
        district:
          MARKET_DISTRICT_NAMES[prediction.district || district] ||
          prediction.district ||
          district,
        commodity:
          MARKET_COMMODITY_NAMES[prediction.crop_name || cropName] ||
          prediction.crop_name ||
          cropName,
      });

      const marketParams = new URLSearchParams({
        state: "Karnataka",
        district:
          MARKET_DISTRICT_NAMES[prediction.district || district] ||
          prediction.district ||
          district,
        commodity:
          MARKET_COMMODITY_NAMES[prediction.crop_name || cropName] ||
          prediction.crop_name ||
          cropName,
        page: "1",
        limit: "5",
      });
      setMarketPricePreviewLoading(true);
      try {
        const marketResponse = await fetch(
          `http://127.0.0.1:8000/market-price/history?${marketParams}`
        );
        if (!marketResponse.ok) throw new Error("Market prices are unavailable.");
        const marketData = await marketResponse.json();
        setMarketPricePreview(marketData.data || []);
      } catch (marketError) {
        setMarketPricePreviewError(
          marketError.message || "Unable to load market prices."
        );
      } finally {
        setMarketPricePreviewLoading(false);
      }
      await loadYieldHistory();
    } catch (error) {
      setYieldError(getErrorMessage(error, "Unable to predict crop yield."));
    } finally {
      setYieldLoading(false);
    }
  }

  async function handleCropRecommendation(event, areaAcres) {
    event.preventDefault();

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendationResult(null);

    try {
      setRecommendationResult(
        await getCropRecommendations(areaAcres)
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
      priceLoading,
      recommendationLoading,
      priceResult,
      recommendationResult,
      weatherData,
      weatherLoading,
      weatherError,
      yieldResult,
      liveLocation,
      liveWeather,
      liveLocationLoading,
      marketPricePreview,
      marketPricePreviewLoading,
      marketPricePreviewError,
    },
    "market-price": {
      initialFilters: marketPricePrefill,
      liveLocation,
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
      marketPricePreview,
      marketPricePreviewLoading,
      marketPricePreviewError,
    },
    "crop-recommendation": {
      agriculturalRecords,
      selectedAgriculturalId,
      area: farmArea,
      onAreaChange: setFarmArea,
      onAgriculturalChange: setSelectedAgriculturalId,
      onSubmit: handleCropRecommendation,
      loading: recommendationLoading,
      error: recommendationError || agriculturalError,
      result: recommendationResult,
    },
    "farmer-tools": {
      currentUser,
      farms: farmProfiles,
      cropHistory,
      crops: cropOptions,
      recommendations: recommendationResult,
      onNavigate: (pageId) => {
        window.location.hash = pageId;
        setActivePage(pageId);
      },
      isOnline,
    },
    "business-insights": {
      districts: yieldDistricts,
      crops: cropOptions,
      userId: currentUser?.user_id,
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
      isOnline,
      pendingCropHistoryCount,
      offlineSyncError,
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
            <div className="auth-brand">
              <img src="/crop-yield-portal-logo.png" alt="Crop Yield Prediction Portal" />
            </div>
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
            <div className="auth-mobile-brand">
              <img src="/crop-yield-portal-logo.png" alt="Crop Yield Prediction Portal" />
            </div>
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
        isOnline={isOnline}
        pendingCropHistoryCount={pendingCropHistoryCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        canInstall={Boolean(installPrompt)}
        onInstall={handleInstallApp}
        theme={theme}
        onProfileClick={() => {
          window.location.hash = "settings";
          setActivePage("settings");
        }}
        onThemeToggle={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
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
          <main className="dashboard">
            {offlineSyncError && (
              <p className="offline-sync-error" role="status">
                {offlineSyncError}
              </p>
            )}
            <Suspense
              fallback={
                <div className="page-loading-skeleton" role="status" aria-busy="true">
                  <span className="page-loading-title" />
                  <span className="page-loading-subtitle" />
                  <div className="page-loading-cards">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="sr-only">Loading page…</span>
                </div>
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
