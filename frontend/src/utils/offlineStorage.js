function storageKey(userId, collection) {
  return `crop_prediction_${collection}_${userId}`;
}

function readList(userId, collection) {
  if (!userId) {
    return [];
  }
  const stored = localStorage.getItem(storageKey(userId, collection));
  if (!stored) {
    return [];
  }
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed)) {
    throw new Error(`Saved offline ${collection} data is invalid.`);
  }
  return parsed;
}

export function getCachedCropHistory(userId) {
  return readList(userId, "crop_history_cache");
}

export function getPendingCropHistory(userId) {
  return readList(userId, "crop_history_queue");
}

export function saveCachedCropHistory(userId, history) {
  if (userId) {
    localStorage.setItem(
      storageKey(userId, "crop_history_cache"),
      JSON.stringify(history)
    );
  }
}

export function queueOfflineCropHistory(userId, payload) {
  if (!userId) {
    throw new Error("Sign in before saving an offline crop record.");
  }
  const clientId =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = {
    ...payload,
    history_id: `offline-${clientId}`,
    client_id: clientId,
    is_offline_pending: true,
  };
  const pending = getPendingCropHistory(userId);
  localStorage.setItem(
    storageKey(userId, "crop_history_queue"),
    JSON.stringify([...pending, record])
  );
  return record;
}

export function removePendingCropHistory(userId, clientId) {
  const remaining = getPendingCropHistory(userId).filter(
    (record) => record.client_id !== clientId
  );
  localStorage.setItem(
    storageKey(userId, "crop_history_queue"),
    JSON.stringify(remaining)
  );
  return remaining;
}
