import ExamplePicker from "./examplepicker";

export default function QueryPanel({
  query,
  setQuery,
  onRun,
  runDisabled,
  runStatus,
  steps,
  planNodes,
  activeStep,
  onBack,
  onNext,
  onReset,
  onLoadExample,
  onFormat,
  onClear,

  setupSql,
  setSetupSql,
  onApplySetup,
  setupDisabled,
  setupStatus,

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
        DB: {dbStatus === "ready" ? "Ready ✓" : dbStatus === "error" ? "Error ✗" : "Loading…"}
      </div>

      <ExamplePicker onPick={onLoadExample} />

      <textarea
        className="editor-input"
        rows={12}
        placeholder="Write a SELECT query here, or pick an example."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="toolbar">
        <button
          className="btn primary"
          onClick={onRun}
          disabled={runDisabled}
          title={!dbReady ? "Loading database..." : runDisabled ? "Enter a SELECT query to run" : "Run query"}
        >
          {!dbReady ? "Loading..." : "Run"}
        </button>


        {steps.length > 0 && (
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

      <div className="setup-block">
        <div className="setup-head">
          <div className="setup-title">Setup SQL</div>
          <button
            className="btn"
            onClick={onApplySetup}
            disabled={setupDisabled}
            title={setupDisabled ? "Enter setup SQL (CREATE/INSERT) to apply" : "Apply setup SQL"}
          >
            Apply Setup
          </button>
        </div>

        

        <textarea
          className="setup-input"
          rows={6}
          placeholder={"Optional: CREATE TABLE / INSERT INTO ...\nExample:\nCREATE TABLE t(id INTEGER);\nINSERT INTO t VALUES (1);"}
          value={setupSql}
          onChange={(e) => setSetupSql(e.target.value)}
        />

        <div className="hint">
          Use Setup SQL for CREATE/INSERT. Use Run for SELECT queries you want to visualize.
        </div>
      </div>

      {runStatus && <div className="hint">{runStatus}</div>}
      {setupStatus && <div className="hint">{setupStatus}</div>}
    </section>
  );
}
