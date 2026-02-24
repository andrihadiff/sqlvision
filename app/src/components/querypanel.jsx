
export default function QueryPanel({
  query,
  setQuery,
  runStatus,
  onFormat,
  onClear,
  dbReady,
  dbStatus,
}) {
  return (
    <section className="panel editor">
      <div className="panel-head">
        <h2>Query</h2>
        <span className="badge">Design mode</span>
      </div>

      <div className="hint">
        DB:{" "}
        {dbStatus === "ready"
          ? "Ready ✓"
          : dbStatus === "error"
          ? "Error ✗"
          : "Loading…"}
      </div>

      <textarea
        className="editor-input"
        rows={14}
        placeholder="Write a query here (SELECT/INSERT/UPDATE/DELETE/DDL)."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="toolbar">
        <button
          className="btn"
          onClick={onFormat}
          disabled={!query.trim()}
          title={!query.trim() ? "Enter a query to format" : "Format query"}
        >
          Format
        </button>

        <button className="btn ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      {runStatus && <div className="hint">{runStatus}</div>}
      {!dbReady && <div className="hint">Loading database...</div>}
    </section>
  );
}
