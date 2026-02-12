import StepDetails from "./stepdetails";
import ResultsTable from "./resultstable";

export default function OutputPanel({
  tab,
  setTab,
  steps,
  planNodes,
  activeStep,
  result,
  error,

  setupSql,
  setSetupSql,
  onApplySetup,
  setupDisabled,
  setupStatus,

  setupName,
  setSetupName,
  onSaveSetup,
  savedSetups,
  onApplySavedSetup,
  onDeleteSavedSetup,

  onResetDb,
  dbReady,
}) {
  const activeNode = activeStep >= 0 ? planNodes[activeStep] : null;

  return (
    <section className="panel output">
      <div className="tabs">
        {["results", "steps", "diagram", "schema"].map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "results"
              ? "Results"
              : t === "steps"
              ? "Steps"
              : t === "diagram"
              ? "Diagram"
              : "Schema"}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === "results" && (
          <>
            <h3 className="section-title">Results</h3>
            {error ? (
              <div className="error-box">{error}</div>
            ) : (
              <ResultsTable columns={result?.columns} rows={result?.rows} />
            )}
          </>
        )}

        {tab === "steps" && (
          <>
            <h3 className="section-title">Planned execution steps</h3>
            <ol className="steps-list">
              {(steps.length ? steps : ["Run a query to generate steps."]).map(
                (st, idx) => (
                  <li
                    key={idx}
                    className={idx === activeStep ? "active-step" : ""}
                  >
                    {st}
                  </li>
                )
              )}
            </ol>

            <StepDetails node={activeNode} />
          </>
        )}

        {tab === "diagram" && (
          <div className="diagram">
            <h3 className="section-title">Logical plan (diagram)</h3>
            <div className="diagram-canvas">
              {(planNodes.length ? planNodes : ["Run to generate diagram"]).map(
                (n, i) => (
                  <div key={i} className="diagram-row">
                    <div className={`node ${i === activeStep ? "active-node" : ""}`}>
                      {n}
                    </div>
                    {i < (planNodes.length ? planNodes.length : 1) - 1 && (
                      <div className="arrow" />
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {tab === "schema" && (
          <>
            <div className="schema-head">
              <h3 className="section-title" style={{ margin: 0 }}>
                Schema & Data
              </h3>

              <button
                className="btn"
                onClick={onResetDb}
                disabled={!dbReady}
                title={!dbReady ? "Database not ready" : "Reset database to demo data"}
              >
                Reset DB
              </button>
            </div>

            <div className="hint" style={{ marginTop: 8 }}>
              Use Setup SQL to create tables and insert rows. Next, go back to
              Results and run your queries.
            </div>

            <div className="setup-block" style={{ borderTop: "none", paddingTop: 0 }}>
              <div className="setup-head">
                <div className="setup-title">Setup SQL</div>
                <button
                  className="btn"
                  onClick={onApplySetup}
                  disabled={setupDisabled}
                  title={
                    setupDisabled
                      ? "Enter setup SQL (CREATE/INSERT) to apply"
                      : "Apply setup SQL"
                  }
                >
                  Apply Setup
                </button>
              </div>

              <textarea
                className="setup-input"
                rows={8}
                placeholder={
                  "CREATE TABLE t(id INTEGER);\nINSERT INTO t VALUES (1);\n\n-- then run SELECT queries in Results"
                }
                value={setupSql}
                onChange={(e) => setSetupSql(e.target.value)}
              />

              <div className="setup-save-row">
                <input
                  className="setup-name"
                  placeholder="Name this setup (e.g., JOIN demo)"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                />
                <button
                  className="btn"
                  onClick={onSaveSetup}
                  disabled={!setupSql.trim()}
                  title={!setupSql.trim() ? "Write Setup SQL first" : "Save this setup"}
                >
                  Save Setup
                </button>
              </div>

              {savedSetups?.length > 0 && (
                <div className="setup-list">
                  <div className="hint" style={{ marginTop: 10 }}>
                    Saved setups:
                  </div>

                  {savedSetups.map((s) => (
                    <div className="setup-item" key={s.id}>
                      <div className="setup-item-left">
                        <div className="setup-item-title">{s.name}</div>
                        <div className="setup-item-meta">
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="setup-item-actions">
                        <button className="btn" onClick={() => onApplySavedSetup(s.id)}>
                          Apply
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => onDeleteSavedSetup(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {setupStatus && <div className="hint">{setupStatus}</div>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
