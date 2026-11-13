function SummaryCard({
  icon,
  label,
  value,
  description,
  accent = "green",
}) {
  return (
    <div className={`summary-card summary-card-${accent}`}>
      <div className="summary-card-top">
        <div className="summary-card-icon">{icon}</div>
        <span>{label}</span>
      </div>

      <div className="summary-card-value">{value}</div>

      <p>{description}</p>
    </div>
  );
}

export default SummaryCard;