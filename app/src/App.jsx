import { useState } from "react";
import "./App.css";

function PlaceholderTable() {
  return (
    <div className="placeholder-table">
      <div className="row header">
        <span className="cell" />
        <span className="cell" />
        <span className="cell" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div className="row" key={i}>
          <span className="cell" />
          <span className="cell" />
          <span className="cell" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("results");
  const [query, setQuery] = useState("");

  return (
    <div className="shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">SQLVision</div>
        <div className="top-actions">
          <button className="btn ghost">Docs</button>
          <button className="btn ghost">About</button>
          <button className="btn primary" disabled>Deploy</button>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="layout">
        {/* Left: editor */}
        <section className="panel editor">
          <div className="panel-head">
            <h2>Query</h2>
            <span className="badge">Design mode</span>
          </div>

          <textarea
            className="editor-input"
            rows={12}
            placeholder="Write SQL here…  e.g. SELECT name, age FROM students WHERE age > 20;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="toolbar">
            <button className="btn primary" disabled>Run</button>
            <button className="btn" disabled>Format</button>
            <button className="btn ghost" onClick={() => setQuery("")}>Clear</button>
          </div>

          <div className="hint">
            No database wired yet — we’re just building the UI skeleton.
          </div>
        </section>

        {/* Right: tabs / output */}
        <section className="panel output">
          <div className="tabs">
            {["results", "steps", "diagram"].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "results" ? "Results" : t === "steps" ? "Steps" : "Diagram"}
              </button>
            ))}
          </div>

          <div className="tab-body">
            {tab === "results" && (
              <>
                <h3 className="section-title">Result preview</h3>
                <PlaceholderTable />
              </>
            )}
            {tab === "steps" && (
              <div className="steps">
                <h3 className="section-title">Planned execution steps</h3>
                <ol>
                  <li>Scan table <code>students</code></li>
                  <li>Filter rows where <code>age &gt; 20</code></li>
                  <li>Project columns <code>name, age</code></li>
                  <li>Order / Group (if present)</li>
                </ol>
              </div>
            )}
            {tab === "diagram" && (
              <div className="diagram">
                <h3 className="section-title">Logical plan (diagram)</h3>
                <div className="diagram-canvas">
                  <div className="node">SCAN students</div>
                  <div className="arrow" />
                  <div className="node">FILTER age &gt; 20</div>
                  <div className="arrow" />
                  <div className="node">PROJECT name, age</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} SQLVision · UI skeleton</span>
      </footer>
    </div>
  );
}
