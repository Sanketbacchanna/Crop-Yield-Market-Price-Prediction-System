export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "https://crop-yield-market-price-prediction-system.onrender.com")
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("crop_prediction_token");
}

export function saveAuthSession(token, user) {
  localStorage.setItem("crop_prediction_token", token);
  localStorage.setItem("crop_prediction_user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("crop_prediction_token");
  localStorage.removeItem("crop_prediction_user");
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function loginUser({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser({ name, email, password, phone, region }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone, region }),
  });
}

export function updateCurrentUser(payload) {
  return request("/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(email) {
  return request("/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function updateAdminUserRole(userId, role, region) {
  return request(`/auth/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role, region }),
  });
}

export function getCropHistory() {
  return getList("/crop-history/", "Could not load crop history.");
}

export function createCropHistory(payload) {
  return request("/crop-history/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCropHistory(historyId) {
  return request(`/crop-history/${historyId}`, { method: "DELETE" });
}

export function requestEmailVerification() {
  return request("/auth/request-email-verification", {
    method: "POST",
  });
}

export function resetPassword(token, newPassword) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export function verifyEmail(token) {
  return request("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function getAdminUsers() {
  return getList("/auth/users", "Could not load users.");
}

export function getRegionUsers() {
  return getList("/auth/region/users", "Could not load regional users.");
}

export function logoutUser() {
  clearAuthSession();
}

async function request(path, options = {}) {
  const requestHeaders = new Headers(options.headers || {});

  const token = getAuthToken();
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (!response.ok) {
        throw new Error(rawText);
      }
      throw new Error("The server returned an invalid response.");
    }
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : JSON.stringify(data?.detail || data || "The request could not be completed.");
    throw new Error(detail || "The request could not be completed.");
  }

  return data;
}

async function getList(path, errorMessage) {
  const data = await request(path);
  if (!Array.isArray(data)) {
    throw new Error(errorMessage);
  }
  return data;
}

export function getCrops() {
  return getList("/crops/", "Could not load crop list.");
}

export function getPriceHistory() {
  return getList("/price-prediction/", "Could not load prediction history.");
}

export function getHistoricalPriceCrops() {
  return getList(
    "/price-prediction/historical/crops",
    "Could not load historical crop prices."
  );
}

export function getHistoricalPriceTrend(cropName) {
  const params = new URLSearchParams({ crop_name: cropName });
  return getList(
    `/price-prediction/historical?${params}`,
    "Could not load the historical price trend."
  );
}

export function getHistoricalYield(district, cropName, season = "") {
  const params = new URLSearchParams({
    district,
    crop_name: cropName,
  });
  if (season) {
    params.set("season", season);
  }
  return getList(
    `/yield-prediction/historical?${params}`,
    "Could not load historical district yield."
  );
}

export function getYieldHistory() {
  return getList(
    "/yield-prediction/",
    "Could not load yield prediction history."
  );
}

export function getYieldDistricts() {
  return getList(
    "/yield-prediction/districts",
    "Could not load Karnataka districts."
  );
}

export function getAgriculturalRecords() {
  return getList(
    "/agricultural-data/",
    "Could not load agricultural records."
  );
}

export function getFarmProfiles() {
  return getList("/farms/", "Could not load farm profiles.");
}

export function createFarmProfile(payload) {
  return request("/farms/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFarmProfile(farmId, payload) {
  return request(`/farms/${farmId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteFarmProfile(farmId) {
  return request(`/farms/${farmId}`, { method: "DELETE" });
}

export function createPriceForecast({ cropId, prices }) {
  const params = new URLSearchParams({
    crop_id: cropId,
    price_previous_month: prices.previousMonth,
    price_previous_2_months: prices.previousTwoMonths,
    price_previous_3_months: prices.previousThreeMonths,
    price_avg_previous_3_months: prices.averagePrice,
  });

  return request(`/price-prediction/forecast?${params}`, { method: "POST" });
}

export function createYieldPrediction(agriculturalId, cropName, district, area) {
  const params = new URLSearchParams({
    agricultural_id: agriculturalId,
    crop_name: cropName,
    district,
  });
  if (area) params.set("area", area);

  return request(`/yield-prediction/?${params}`, { method: "POST" });
}

export function getNearestMandiMarkets(latitude, longitude, commodity, limit = 5) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    limit: String(limit),
  });
  if (commodity) params.set("commodity", commodity);
  return request(`/market-price/nearest?${params.toString()}`);
}

export function getCropRecommendations(areaAcres, district, season, cropYear) {
  const params = new URLSearchParams({
    area_acres: String(areaAcres),
    district,
    season,
  });
  if (cropYear) params.set("crop_year", cropYear);
  return request(`/crop-recommendation/recommend?${params}`, {
    method: "POST",
  });
}

export function getWeatherData() {
  return getList(
    "/weather-data/",
    "Could not load weather data."
  );
}

export async function getLocationDetails(latitude, longitude) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "14",
    addressdetails: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    {
      headers: {
        "Accept-Language": "en",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to determine the current location.");
  }

  const data = await response.json();
  const address = data.address || {};

  return {
    state: address.state || "",
    name:
      address.neighbourhood ||
      address.suburb ||
      address.village ||
      address.hamlet ||
      address.town ||
      address.city_district ||
      address.city ||
      address.municipality ||
      address.county ||
      address.state_district ||
      "Current location",
    district: address.state_district || address.county || "",
    taluk: address.county || address.subdistrict || address.taluk || "",
    village:
      address.village ||
      address.hamlet ||
      address.town ||
      address.suburb ||
      address.city_district ||
      address.city ||
      "",
  };
}

export async function getLiveWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });

  try {
    return await request(`/weather/current?${params}`);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    // Keep location-specific weather available when the IMD/backend provider
    // is unavailable. These coordinates are still the detected farm location.
    const fallbackParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,precipitation",
      timezone: "Asia/Kolkata",
    });
    const fallback = await getWeatherProviderData(
      "https://api.open-meteo.com/v1/forecast",
      fallbackParams
    );
    const current = fallback.current || {};

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      rainfall: current.precipitation,
      location: "Current farm location",
      observedAt: current.time,
      source: "Open-Meteo",
      fallbackReason: error.message,
    };
  }
}

export async function getTalukCoordinates(taluk, district, signal) {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: `${taluk}, ${district}, Karnataka, India`,
    limit: "1",
    addressdetails: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { "Accept-Language": "en" },
  });
  if (!response.ok) throw new Error("Unable to locate the selected taluk.");
  const result = (await response.json())?.[0];
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("No coordinates were found for the selected taluk.");
  }
  return { latitude, longitude };
}

async function getWeatherProviderData(baseUrl, params, signal) {
  const response = await fetch(`${baseUrl}?${params}`, { signal });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.reason || "The weather provider returned an error.");
  }

  return data;
}

async function getWeatherForecast(latitude, longitude, district, signal) {
  const weatherParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  if (district) {
    weatherParams.set("district", district);
  }

  try {
    return await request(`/weather/outlook?${weatherParams}`, { signal });
  } catch (error) {
    if (signal?.aborted || error.name === "AbortError") {
      throw error;
    }

    const fallbackParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly:
        "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code",
      daily:
        "precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",
      forecast_days: "7",
      timezone: "Asia/Kolkata",
    });
    const fallback = await getWeatherProviderData(
      "https://api.open-meteo.com/v1/forecast",
      fallbackParams,
      signal
    );
    return {
      forecast: { ...fallback, source: "Open-Meteo" },
      source: "Open-Meteo",
      forecastError: "",
      warnings: null,
      nowcast: null,
      warningsError: "",
      nowcastError: "",
    };
  }
}

export async function getWeatherOutlook(latitude, longitude, district, signal) {
  const seasonalParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "precipitation_sum",
    weekly: "precipitation_mean,precipitation_anomaly",
    monthly: "precipitation_mean,precipitation_anomaly",
    forecast_days: "183",
    timezone: "auto",
  });

  const [forecastResult, seasonalResult] = await Promise.allSettled([
    getWeatherForecast(latitude, longitude, district, signal),
    getWeatherProviderData(
      "https://seasonal-api.open-meteo.com/v1/seasonal",
      seasonalParams,
      signal
    ),
  ]);
  const weather =
    forecastResult.status === "fulfilled" ? forecastResult.value : null;
  const seasonal =
    seasonalResult.status === "fulfilled" ? seasonalResult.value : null;

  if (!weather && !seasonal) {
    throw new Error("Unable to load short-range or seasonal weather outlooks.");
  }

  return {
    ...weather,
    seasonal,
    forecastError:
      forecastResult.status === "rejected"
        ? forecastResult.reason.message
        : weather?.forecastError || "",
    seasonalError:
      seasonalResult.status === "rejected"
        ? seasonalResult.reason.message
        : "",
  };
}
