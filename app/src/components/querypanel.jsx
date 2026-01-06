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
}) {
  const maxIdx = Math.min(steps.length, planNodes.length) - 1;

  return (
    <section className="panel editor">
      <div className="panel-head">
        <h2>Query</h2>
        <span className="badge">Design mode</span>
      </div>

      <ExamplePicker onPick={(id) => onLoadExample?.(id)} />

      <textarea
        className="editor-input"
        rows={12}
        placeholder="Write SQL here…  e.g. SELECT name, age FROM students WHERE age > 20;"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="toolbar">
        <button
          className="btn primary"
          onClick={onRun}
          disabled={runDisabled}
          title={runDisabled ? "Enter a query to run" : "Run query"}
        >
          Run
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

        <button className="btn" disabled>
          Format
        </button>
        <button className="btn ghost" onClick={() => setQuery("")}>
          Clear
        </button>
      </div>

      {runStatus && <div className="hint">{runStatus}</div>}

      <div className="hint">
        No database wired yet — Just building the UI skeleton before the real business happens.
      </div>
    </section>
  );
}
