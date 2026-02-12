
export default function QueryPanel({
  tab,
  query,
  setQuery,
  runStatus,
  steps,
  planNodes,
  activeStep,
  onBack,
  onNext,
  onReset,
  onFormat,
  onClear,
  dbReady,
  dbStatus,
}) {
  const maxIdx = Math.min(steps.length, planNodes.length) - 1;

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
        {/* Removed Run button here (Run lives in the TopBar now) */}

        {tab === "steps" && steps.length > 0 && (
          <div className="step-controls">
            <button className="btn" onClick={onBack} disabled={activeStep <= 0}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={onNext}
              disabled={activeStep >= maxIdx}
            >
              Next
            </button>
            <button className="btn ghost" onClick={onReset}>
              Reset
            </button>

            <span className="step-counter">
              Step {activeStep + 1} / {maxIdx + 1}
            </span>
          </div>
        )}

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
