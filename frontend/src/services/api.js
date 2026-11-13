const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail || data);
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

export function getPriceHistory() {
  return getList("/price-prediction/", "Could not load prediction history.");
}

export function getYieldHistory() {
  return getList(
    "/yield-prediction/",
    "Could not load yield prediction history."
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
    user_id: "1",
    crop_id: cropId,
    price_previous_month: prices.previousMonth,
    price_previous_2_months: prices.previousTwoMonths,
    price_previous_3_months: prices.previousThreeMonths,
    price_avg_previous_3_months: prices.averagePrice,
  });

  return request(`/price-prediction/forecast?${params}`, { method: "POST" });
}

export function createYieldPrediction(agriculturalId) {
  const params = new URLSearchParams({
    user_id: "1",
    agricultural_id: agriculturalId,
  });

  return request(`/yield-prediction/?${params}`, { method: "POST" });
}

export function getCropRecommendations(agriculturalId) {
  const params = new URLSearchParams({
    user_id: "1",
    agricultural_id: agriculturalId,
  });

  return request(`/crop-recommendation/recommend?${params}`, {
    method: "POST",
  });
}
