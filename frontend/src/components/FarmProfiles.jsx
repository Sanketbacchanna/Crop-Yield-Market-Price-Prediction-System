import { useState } from "react";
import "./FarmProfiles.css";

const EMPTY_FARM = {
  farm_name: "",
  district: "",
  area_acres: "",
  soil_type: "",
  irrigation_type: "",
  primary_crop: "",
  season: "",
};

function FarmProfiles({
  farms,
  districts,
  loading,
  error,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(EMPTY_FARM);
  const [editingFarmId, setEditingFarmId] = useState(null);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm(EMPTY_FARM);
    setEditingFarmId(null);
    setFormError("");
    setStatusMessage("");
  }

  function editFarm(farm) {
    setForm({
      farm_name: farm.farm_name,
      district: farm.district,
      area_acres: String(farm.area_acres),
      soil_type: farm.soil_type || "",
      irrigation_type: farm.irrigation_type || "",
      primary_crop: farm.primary_crop || "",
      season: farm.season || "",
    });
    setEditingFarmId(farm.farm_id);
    setFormError("");
    setStatusMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setStatusMessage("");

    try {
      await onSave(
        {
          ...form,
          farm_name: form.farm_name.trim(),
          area_acres: Number(form.area_acres),
          soil_type: form.soil_type.trim() || null,
          irrigation_type: form.irrigation_type.trim() || null,
          primary_crop: form.primary_crop.trim() || null,
          season: form.season.trim() || null,
        },
        editingFarmId
      );
      resetForm();
      setStatusMessage(
        editingFarmId ? "Farm profile updated." : "Farm profile created."
      );
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save this farm profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(farm) {
    if (!window.confirm(`Delete the farm profile "${farm.farm_name}"?`)) {
      return;
    }

    setFormError("");
    setStatusMessage("");
    try {
      await onDelete(farm.farm_id);
      if (editingFarmId === farm.farm_id) {
        resetForm();
      }
      setStatusMessage("Farm profile deleted.");
    } catch (deleteError) {
      setFormError(deleteError.message || "Unable to delete this farm profile.");
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="farm-profiles-section" aria-labelledby="farm-profiles-title">
      <div className="farm-profiles-heading">
        <div>
          <p className="section-eyebrow">YOUR FARM</p>
          <h3 id="farm-profiles-title">Farm profiles</h3>
          <p>Save your farm details to make future advice more relevant.</p>
        </div>
      </div>

      <div className="farm-profiles-layout">
        <form className="farm-profile-form" onSubmit={handleSubmit}>
          <h4>{editingFarmId ? "Edit farm" : "Add a farm"}</h4>
          <p className="farm-profile-hint">
            Farm profiles are private to your account. Location is currently
            supported for Karnataka.
          </p>

          <label htmlFor="farm-name">Farm name</label>
          <input
            id="farm-name"
            name="farm_name"
            value={form.farm_name}
            onChange={updateField}
            maxLength={100}
            required
            placeholder="e.g. North Field"
          />

          <label htmlFor="farm-district">District</label>
          <select
            id="farm-district"
            name="district"
            value={form.district}
            onChange={updateField}
            required
            disabled={districts.length === 0}
          >
            <option value="">
              {districts.length ? "Select district" : "Districts unavailable"}
            </option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <label htmlFor="farm-area">Area (acres)</label>
          <input
            id="farm-area"
            name="area_acres"
            type="number"
            min="0.01"
            max="99999999.99"
            step="0.01"
            value={form.area_acres}
            onChange={updateField}
            required
            placeholder="e.g. 2.5"
          />

          <label htmlFor="farm-soil">Soil type (optional)</label>
          <input
            id="farm-soil"
            name="soil_type"
            value={form.soil_type}
            onChange={updateField}
            maxLength={100}
            placeholder="e.g. red soil"
          />

          <label htmlFor="farm-irrigation">Irrigation (optional)</label>
          <input
            id="farm-irrigation"
            name="irrigation_type"
            value={form.irrigation_type}
            onChange={updateField}
            maxLength={100}
            placeholder="e.g. drip, canal, rain-fed"
          />

          <label htmlFor="farm-primary-crop">Main crop (optional)</label>
          <input
            id="farm-primary-crop"
            name="primary_crop"
            value={form.primary_crop}
            onChange={updateField}
            maxLength={100}
            placeholder="e.g. rice"
          />

          <label htmlFor="farm-season">Season (optional)</label>
          <input
            id="farm-season"
            name="season"
            value={form.season}
            onChange={updateField}
            maxLength={45}
            placeholder="e.g. Kharif"
          />

          {formError && (
            <p className="farm-profile-error" role="alert">
              {formError}
            </p>
          )}
          {statusMessage && (
            <p className="farm-profile-status" role="status">
              {statusMessage}
            </p>
          )}

          <div className="farm-profile-form-actions">
            <button type="submit" disabled={saving || districts.length === 0}>
              {saving
                ? "Saving..."
                : editingFarmId
                  ? "Save changes"
                  : "Save farm"}
            </button>
            {editingFarmId && (
              <button type="button" className="farm-profile-cancel" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="farm-profile-list" aria-live="polite">
          <h4>Your saved farms</h4>
          {loading ? (
            <p>Loading farm profiles...</p>
          ) : error ? (
            <p className="farm-profile-error" role="alert">
              {error}
            </p>
          ) : farms.length === 0 ? (
            <p className="farm-profile-empty">
              No farms saved yet. Add your first farm to get started.
            </p>
          ) : (
            farms.map((farm) => (
              <article className="farm-profile-card" key={farm.farm_id}>
                <div>
                  <h5>{farm.farm_name}</h5>
                  <p>
                    {farm.district}, {farm.state} · {farm.area_acres} acres
                  </p>
                  <p>
                    {[farm.primary_crop, farm.season, farm.soil_type]
                      .filter(Boolean)
                      .join(" · ") || "Add crop, season, or soil details"}
                  </p>
                  {farm.irrigation_type && <p>{farm.irrigation_type} irrigation</p>}
                </div>
                <div className="farm-profile-card-actions">
                  <button type="button" onClick={() => editFarm(farm)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="farm-profile-delete"
                    onClick={() => handleDelete(farm)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default FarmProfiles;
