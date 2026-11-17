import { useState } from "react";

function CropHistory({ history, farms, onSave, onDelete }) {
  const [form, setForm] = useState({
    crop_name: "",
    farm_id: "",
    season: "",
    district: "",
    planted_date: "",
    area_acres: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await onSave({
        ...form,
        farm_id: form.farm_id ? Number(form.farm_id) : null,
        area_acres: form.area_acres ? Number(form.area_acres) : null,
        planted_date: form.planted_date || null,
      });
      setForm({
        crop_name: "",
        farm_id: "",
        season: "",
        district: "",
        planted_date: "",
        area_acres: "",
        notes: "",
      });
    } catch (saveError) {
      setError(saveError.message || "Unable to save crop history.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (historyId) => {
    setError("");
    try {
      await onDelete(historyId);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete crop history.");
    }
  };

  return (
    <section className="crop-history-panel" aria-labelledby="crop-history-title">
      <div>
        <p className="section-eyebrow">FARMER RECORDS</p>
        <h3 id="crop-history-title">Crop history</h3>
        <p>Keep a private record of crops grown on your farms.</p>
      </div>

      <form className="crop-history-form" onSubmit={handleSubmit}>
        <label>
          Crop
          <input
            required
            maxLength={100}
            value={form.crop_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, crop_name: event.target.value }))
            }
            placeholder="e.g. Rice"
          />
        </label>
        <label>
          Farm
          <select
            value={form.farm_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, farm_id: event.target.value }))
            }
          >
            <option value="">No linked farm</option>
            {farms.map((farm) => (
              <option key={farm.farm_id} value={farm.farm_id}>
                {farm.farm_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Season
          <input
            maxLength={45}
            value={form.season}
            onChange={(event) =>
              setForm((current) => ({ ...current, season: event.target.value }))
            }
            placeholder="e.g. Kharif"
          />
        </label>
        <label>
          District
          <input
            maxLength={45}
            value={form.district}
            onChange={(event) =>
              setForm((current) => ({ ...current, district: event.target.value }))
            }
          />
        </label>
        <label>
          Planted on
          <input
            type="date"
            value={form.planted_date}
            onChange={(event) =>
              setForm((current) => ({ ...current, planted_date: event.target.value }))
            }
          />
        </label>
        <label>
          Area (acres)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.area_acres}
            onChange={(event) =>
              setForm((current) => ({ ...current, area_acres: event.target.value }))
            }
          />
        </label>
        <label className="crop-history-notes">
          Notes
          <textarea
            maxLength={2000}
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={2}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save crop record"}
        </button>
      </form>

      {error && <p className="crop-history-error" role="alert">{error}</p>}

      {history.length === 0 ? (
        <p className="crop-history-empty">No crop history saved yet.</p>
      ) : (
        <div className="crop-history-list">
          {history.map((item) => (
            <article key={item.history_id} className="crop-history-item">
              <div>
                <strong>{item.crop_name}</strong>
                {item.is_offline_pending && (
                  <span className="crop-history-offline-status">
                    Saved on this device · waiting to sync
                  </span>
                )}
                <span>
                  {[item.season, item.district, item.planted_date]
                    .filter(Boolean)
                    .join(" · ") || "No date or location"}
                </span>
                {item.area_acres && <span>{item.area_acres} acres</span>}
                {item.notes && <p>{item.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.history_id)}
                aria-label={`Delete ${item.crop_name} history`}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CropHistory;
