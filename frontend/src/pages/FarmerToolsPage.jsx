import { useState } from "react";
import { downloadExcelCsv } from "../utils/export";
import "./FarmerToolsPage.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHLY_GUIDE = [
  "Review soil and water needs; prepare irrigated summer plots.",
  "Plan summer sowing and check irrigation availability.",
  "Manage summer crop water and prepare fields for monsoon.",
  "Maintain summer crops; prepare seed and inputs for Kharif.",
  "Prepare fields and monitor local monsoon forecasts.",
  "Kharif sowing window begins with dependable local rainfall.",
  "Continue Kharif sowing where rainfall and soil moisture allow.",
  "Monitor crop establishment, weeds, drainage, and pests.",
  "Review crop health and plan harvest and storage needs.",
  "Harvest early Kharif crops and prepare Rabi plots as locally suitable.",
  "Continue harvest and plan Rabi sowing with local advisories.",
  "Monitor Rabi crops and irrigation; plan next season's inputs.",
];

const SCHEMES = [
  {
    name: "PM-KISAN Samman Nidhi",
    category: "Income support",
    summary: "Check current beneficiary, registration, and eKYC services.",
    url: "https://pmkisan.gov.in/",
    source: "Government of India · Department of Agriculture and Farmers Welfare",
    match: "May be relevant to farmer households; eligibility is determined by the programme.",
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana",
    category: "Crop insurance",
    summary: "Review notified crops, enrollment windows, and insurance services.",
    url: "https://pmfby.gov.in/",
    source: "Government of India · PMFBY portal",
    match: "Check whether your crop, district, and season are currently notified.",
  },
  {
    name: "Soil Health Card",
    category: "Soil services",
    summary: "Explore soil testing and nutrient-management information.",
    url: "https://soilhealth.dac.gov.in/",
    source: "Government of India · Department of Agriculture and Farmers Welfare",
    match: "Useful when planning inputs for a registered field or crop.",
  },
  {
    name: "Karnataka Raita Mitra",
    category: "Karnataka services",
    summary: "Visit the state agriculture portal for current notices and farmer services.",
    url: "https://raitamitra.karnataka.gov.in/",
    source: "Government of Karnataka · Department of Agriculture",
    match: "State-focused services and updates for farmers in Karnataka.",
  },
  {
    name: "myScheme",
    category: "Scheme discovery",
    summary: "Search and check scheme eligibility using the Government of India's scheme finder.",
    url: "https://www.myscheme.gov.in/",
    source: "Government of India · myScheme",
    match: "Use your current location and personal details on the official portal to find applicable schemes.",
  },
];

function localDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function FarmerToolsPage({
  currentUser,
  farms = [],
  cropHistory = [],
  crops = [],
  recommendations,
  onNavigate,
  isOnline,
}) {
  const userId = currentUser?.user_id;
  const plannerKey = userId ? `crop_prediction_calendar_${userId}` : "";
  const [plannerState, setPlannerState] = useState(() => {
    if (!plannerKey) {
      return { items: [], error: "" };
    }
    try {
      const saved = localStorage.getItem(plannerKey);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) {
        throw new Error("Saved calendar tasks are invalid.");
      }
      return { items: parsed, error: "" };
    } catch (loadError) {
      return {
        items: [],
        error: loadError.message || "Unable to load saved calendar tasks.",
      };
    }
  });
  const { items: plannerItems, error } = plannerState;
  const [form, setForm] = useState({
    crop_name: "",
    activity: "Sowing",
    due_date: localDateString(),
    notes: "",
  });
  const [calendarYear, setCalendarYear] = useState(
    () => new Date().getFullYear()
  );
  const firstFarm = farms[0];
  const region = firstFarm?.district || currentUser?.region || "Karnataka";

  const persistPlannerItems = (items) => {
    try {
      localStorage.setItem(plannerKey, JSON.stringify(items));
      setPlannerState({ items, error: "" });
      return true;
    } catch (saveError) {
      setPlannerState((current) => ({
        ...current,
        error: saveError.message || "Unable to save this task on the device.",
      }));
      return false;
    }
  };

  const handleAddTask = (event) => {
    event.preventDefault();
    if (!plannerKey) {
      setPlannerState((current) => ({
        ...current,
        error: "Sign in to save your crop calendar.",
      }));
      return;
    }
    if (!form.crop_name.trim() || !form.due_date) {
      setPlannerState((current) => ({
        ...current,
        error: "Choose a crop and due date for this task.",
      }));
      return;
    }
    const task = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      crop_name: form.crop_name.trim(),
      activity: form.activity,
      due_date: form.due_date,
      notes: form.notes.trim(),
    };
    const saved = persistPlannerItems(
      [...plannerItems, task].sort((a, b) => a.due_date.localeCompare(b.due_date))
    );
    if (saved) {
      setForm((current) => ({ ...current, notes: "" }));
    }
  };

  const handleDeleteTask = (taskId) => {
    persistPlannerItems(plannerItems.filter((task) => task.id !== taskId));
  };

  const currentYear = new Date().getFullYear();
  const calendarYears = Array.from(
    new Set([
      ...Array.from({ length: 5 }, (_, index) => currentYear - 1 + index),
      ...plannerItems
        .map((task) => task.due_date.slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year))
        .map(Number),
      ...cropHistory
        .map((record) => (record.planted_date || "").slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year))
        .map(Number),
    ])
  ).sort((left, right) => left - right);
  const recommendationBasis =
    recommendations?.recommendation_basis === "yield_and_forecast_price"
      ? "Your yield estimate and your own saved price forecasts"
      : "Your district, season, soil information, and estimated yield";

  return (
    <section className="farmer-tools page-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">KARNATAKA FARMER TOOLKIT</p>
          <h2>Plan your growing season</h2>
          <p>Calendar guidance, personal farm tasks, and official scheme links.</p>
        </div>
      </div>

      <div className={`offline-banner${isOnline ? "" : " is-offline"}`} role="status">
        <span aria-hidden="true">{isOnline ? "✓" : "↯"}</span>
        {isOnline
          ? "Your calendar tasks are saved on this device and available offline."
          : "Offline mode: your calendar tasks are saved on this device. Predictions and live services need a connection."}
      </div>

      <section className="business-panel farmer-calendar-panel" aria-labelledby="crop-calendar-title">
        <div className="business-panel-heading">
          <div>
            <p className="section-eyebrow">SEASONAL PLANNING GUIDE · {region}</p>
            <h3 id="crop-calendar-title">Crop calendar · {calendarYear}</h3>
            <p>General month-by-month prompts for Karnataka growing seasons.</p>
          </div>
          <div className="calendar-year-tools">
            <label>
              <span>Calendar year</span>
              <select
                value={calendarYear}
                onChange={(event) => setCalendarYear(Number(event.target.value))}
              >
                {calendarYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="business-button secondary page-actions"
              onClick={() =>
                downloadExcelCsv(
                  `crop-calendar-${calendarYear}`,
                  ["Month", "Planning prompt"],
                  MONTHLY_GUIDE.map((prompt, index) => [
                    `${MONTHS[index]} ${calendarYear}`,
                    prompt,
                  ])
                )
              }
            >
              Download calendar for Excel
            </button>
          </div>
        </div>

        <div className="calendar-month-grid">
          {MONTHS.map((month, index) => {
            const tasks = plannerItems.filter(
              (task) =>
                task.due_date.startsWith(`${calendarYear}-`) &&
                Number(task.due_date.slice(5, 7)) === index + 1
            );
            const fieldEntries = cropHistory.filter((record) => {
              const date = record.planted_date || "";
              return (
                date.startsWith(`${calendarYear}-`) &&
                Number(date.slice(5, 7)) === index + 1
              );
            });
            const isCurrentMonth =
              calendarYear === currentYear && new Date().getMonth() === index;
            return (
              <article
                className={`calendar-month${isCurrentMonth ? " is-current-month" : ""}`}
                key={month}
              >
                <h4>{month}</h4>
                <p>{MONTHLY_GUIDE[index]}</p>
                {tasks.map((task) => (
                  <span className="calendar-event" key={task.id}>
                    {task.due_date.slice(8, 10)} · {task.crop_name}: {task.activity}
                  </span>
                ))}
                {fieldEntries.map((entry) => (
                  <span className="calendar-event field-record" key={entry.history_id}>
                    {entry.planted_date.slice(8, 10)} · {entry.crop_name} planted
                  </span>
                ))}
              </article>
            );
          })}
        </div>
        <p className="calendar-caveat">
          This is a general planning guide, not a crop-specific sowing prescription.
          Confirm dates with your local Krishi Vigyan Kendra (KVK) or agriculture office.
        </p>

        <div className="planner-section">
          <div>
            <h4>My field tasks</h4>
            <p>Tasks are stored on this device; no connection is needed to add or edit them.</p>
          </div>
          <form className="planner-form" onSubmit={handleAddTask}>
            <label>
              Crop
              <input
                list="planner-crop-options"
                value={form.crop_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, crop_name: event.target.value }))
                }
                placeholder="e.g. Ragi"
                maxLength={100}
                required
              />
              <datalist id="planner-crop-options">
                {crops.map((crop) => (
                  <option key={crop.crop_id} value={crop.crop_name} />
                ))}
              </datalist>
            </label>
            <label>
              Activity
              <select
                value={form.activity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, activity: event.target.value }))
                }
              >
                {["Sowing", "Irrigation", "Fertilizing", "Field check", "Harvest", "Other"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, due_date: event.target.value }))
                }
                required
              />
            </label>
            <label className="planner-notes">
              Notes
              <input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                maxLength={300}
                placeholder="Optional reminder"
              />
            </label>
            <button type="submit" className="business-button">Save task</button>
          </form>
          {error && <p className="business-error" role="alert">{error}</p>}
          {plannerItems.length === 0 ? (
            <p className="insights-empty">No personal tasks saved yet.</p>
          ) : (
            <ul className="planner-task-list">
              {plannerItems.map((task) => (
                <li key={task.id}>
                  <div>
                    <strong>{task.due_date} · {task.crop_name} — {task.activity}</strong>
                    {task.notes && <span>{task.notes}</span>}
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label={`Remove ${task.crop_name} ${task.activity} task`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {plannerItems.length > 0 && (
            <div className="report-actions page-actions">
              <button
                type="button"
                className="business-button secondary"
                onClick={() =>
                  downloadExcelCsv(
                    "my-crop-calendar",
                    ["Crop", "Activity", "Due date", "Notes"],
                    plannerItems.map((task) => [
                      task.crop_name,
                      task.activity,
                      task.due_date,
                      task.notes,
                    ])
                  )
                }
              >
                Download tasks for Excel
              </button>
              <button
                type="button"
                className="business-button"
                onClick={() => window.print()}
              >
                Print / Save calendar as PDF
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="business-panel" aria-labelledby="personal-recommendations-title">
        <div className="business-panel-heading">
          <div>
            <p className="section-eyebrow">PERSONALIZED FOR YOUR FARM</p>
            <h3 id="personal-recommendations-title">Crop recommendations</h3>
            <p>
              {recommendations
                ? `For ${recommendations.district}, ${recommendations.season} season · ranked using ${recommendationBasis.toLowerCase()}.`
                : `Use your saved agricultural record${firstFarm ? ` for ${firstFarm.district}` : ""} to build a recommendation.`}
            </p>
          </div>
          <button
            type="button"
            className="business-button"
            onClick={() => onNavigate("crop-recommendation")}
          >
            {recommendations ? "Update recommendation" : "Get recommendations"}
          </button>
        </div>
        {recommendations?.recommendations?.length ? (
          <ol className="personal-recommendation-list">
            {recommendations.recommendations.map((item) => (
              <li key={`${item.crop_id}-${item.recommendation_rank}`}>
                <span className="recommendation-rank">#{item.recommendation_rank}</span>
                <div>
                  <strong>{item.crop_name}</strong>
                  <span>Estimated yield: {Number(item.predicted_yield).toFixed(2)}</span>
                </div>
                <div className="recommendation-price">
                  {item.forecast_price == null
                    ? "No personal price forecast"
                    : `Forecast ₹${Number(item.forecast_price).toLocaleString("en-IN")}`}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="insights-empty">
            Recommendations use your district, season, soil record, and your own saved
            price forecasts when available. They are planning estimates, not guarantees.
          </p>
        )}
      </section>

      <section className="business-panel schemes-panel" aria-labelledby="scheme-suggestions-title">
        <div>
          <p className="section-eyebrow">OFFICIAL GOVERNMENT RESOURCES</p>
          <h3 id="scheme-suggestions-title">Scheme suggestions for Karnataka farmers</h3>
          <p>
            Starting points based on your farmer profile and region ({region}); this
            portal does not determine eligibility or submit applications.
          </p>
        </div>
        <div className="scheme-grid">
          {SCHEMES.map((scheme) => (
            <article className="scheme-card" key={scheme.name}>
              <span>{scheme.category}</span>
              <h4>{scheme.name}</h4>
              <p>{scheme.summary}</p>
              <small>
                {firstFarm?.primary_crop
                  ? `Farm context: ${firstFarm.primary_crop} in ${region}. `
                  : ""}
                {scheme.match}
              </small>
              <a href={scheme.url} target="_blank" rel="noreferrer">
                Visit official resource <span aria-hidden="true">↗</span>
              </a>
              <small className="scheme-source">{scheme.source}</small>
            </article>
          ))}
        </div>
        <p className="calendar-caveat">
          Programme rules, dates, and availability can change. Confirm the latest
          information with the linked government portal or your local agriculture office.
        </p>
      </section>
    </section>
  );
}

export default FarmerToolsPage;
