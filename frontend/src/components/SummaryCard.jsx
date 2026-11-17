function SummaryCard({
  icon,
  label,
  value,
  description,
  accent = "green",
  loading = false,
}) {
  return (
    <div
      className={`summary-card summary-card-${accent}${loading ? " is-loading" : ""}`}
      aria-busy={loading}
    >
      <div className="summary-card-top">
        <div className="summary-card-icon">{icon}</div>
        <span>{label}</span>
      </div>

      <div className="summary-card-value">
        {loading ? <span className="summary-card-skeleton" aria-hidden="true" /> : value}
      </div>

      <p>{loading ? "Updating…" : description}</p>
    </div>
  );
}

export default SummaryCard;