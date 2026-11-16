const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("crop_prediction_token");
}

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

export function registerUser({ name, email, password, phone, role = "farmer" }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone, role }),
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
  const data = rawText ? JSON.parse(rawText) : null;

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

export function createYieldPrediction(agriculturalId, cropName, district) {
  const params = new URLSearchParams({
    agricultural_id: agriculturalId,
    crop_name: cropName,
    district,
  });

  return request(`/yield-prediction/?${params}`, { method: "POST" });
}

export function getCropRecommendations(agriculturalId) {
  const params = new URLSearchParams({
    agricultural_id: agriculturalId,
  });
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

export async function getLocationName(latitude, longitude) {
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

  return (
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
    "Current location"
  );
}

export async function getLiveWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,precipitation",
    timezone: "auto",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch live weather data.");
  }

  const data = await response.json();
  const current = data.current || {};

  return {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    rainfall: current.precipitation,
    location: "Current location",
  };
}