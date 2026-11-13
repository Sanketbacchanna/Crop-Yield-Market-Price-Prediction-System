export default function HistoryTable({
  title,
  description,
  eyebrow,
  headers,
  rows,
  loading,
  error,
  emptyMessage,
  onRefresh,
  refreshPlacement = "footer",
  children,
}) {
  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {onRefresh && refreshPlacement === "header" && (
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh history"}
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
          {onRefresh && (
            <button type="button" onClick={onRefresh}>
              Try again
            </button>
          )}
        </div>
      )}

      {loading && rows.length === 0 && <p>Loading...</p>}
      {!loading && !error && rows.length === 0 && <p>{emptyMessage}</p>}

      {rows.length > 0 && !error && (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}

      {onRefresh && refreshPlacement === "footer" && (
        <button
          type="button"
          className="predict-button history-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh history"}
        </button>
      )}
    </section>
  );
}
