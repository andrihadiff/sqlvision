import { useEffect, useState } from "react";
import "./App.css";

import AboutModal from "./components/about";
import HelpModal from "./components/help";

import TopBar from "./components/topbar";
import QueryPanel from "./components/querypanel";
import OutputPanel from "./components/outputpanel";

import { analyseQuery } from "./logic/analysequery";
import { EXAMPLE_QUERIES } from "./constants/examplequeries";
import { formatSql } from "./logic/formatsql";

import { createDemoDb, run } from "./logic/db";

export default function App() {
  const [db, setDb] = useState(null);

  const [runStatus, setRunStatus] = useState("");
  const [steps, setSteps] = useState([]);
  const [planNodes, setPlanNodes] = useState([]);

  const [tab, setTab] = useState("results");
  const [query, setQuery] = useState("");

  const [setupSql, setSetupSql] = useState("");
  const [setupStatus, setSetupStatus] = useState("");

  const [result, setResult] = useState({ columns: [], rows: [] });
  const [error, setError] = useState("");

  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [activeStep, setActiveStep] = useState(-1);

  const [dbStatus, setDbStatus] = useState("loading"); 

  useEffect(() => {
  let alive = true;

  setDbStatus("loading");
  setRunStatus("Loading database...");

  (async () => {
    try {
      const demo = await createDemoDb();
      if (!alive) return;

      setDb(demo);
      setDbStatus("ready");
      setRunStatus("");
    } catch (e) {
      if (!alive) return;

      setDbStatus("error");
      setError(e?.message || "Failed to load database.");
      setRunStatus("Database failed to load.");
    }
  })();

  return () => {
    alive = false;
  };
}, []);


  function handleClearAll() {
    setQuery("");
    setSetupSql("");
    setSteps([]);
    setPlanNodes([]);
    setActiveStep(-1);
    setRunStatus("");
    setTab("results");
    setResult({ columns: [], rows: [] });
    setError("");
    setSetupStatus("");
  }

  function handleFormat() {
    setQuery((q) => formatSql(q));
  }

  function handleRun() {
  setError("");

  if (!db) {
    setError("Database not ready yet.");
    setTab("results");
    return;
  }

  setRunStatus("Running query...");

  try {
    const execRes = run(db, query);

    if (execRes?.error) {
      setError(execRes.error);
      setResult({ columns: [], rows: [] });
      setSteps([]);
      setPlanNodes([]);
      setActiveStep(-1);
      setTab("results");
      return;
    }

    setResult(execRes);

    setRunStatus("Analysing query...");
    const { steps: newSteps, nodes } = analyseQuery(query);

    setSteps(newSteps);
    setPlanNodes(nodes);

    setActiveStep(0);
    setTab("steps");
  } catch (e) {
    setError(e?.message || "Run failed.");
    setTab("results");
  } finally {
    setRunStatus("");
  }
}

 function handleApplySetup() {
  setError("");
  setSetupStatus("");

  if (!db) {
    setError("Database not ready yet.");
    setTab("results");
    return;
  }

  if (!setupSql.trim()) return;

  try {
    db.run(setupSql); 
    setSetupStatus("Setup applied ✓");
  } catch (e) {
    setError(e?.message || "Setup failed.");
    setSetupStatus("Setup failed ✗");
    setTab("results");
  }
}

  function canStep() {
    return steps.length > 0 && planNodes.length > 0 && activeStep >= 0;
  }

  function stepBack() {
    if (!canStep()) return;
    setActiveStep((s) => Math.max(0, s - 1));
  }

  function stepNext() {
    if (!canStep()) return;
    const maxIdx = Math.min(steps.length, planNodes.length) - 1;
    setActiveStep((s) => Math.min(maxIdx, s + 1));
  }

  function stepReset() {
    if (!canStep()) return;
    setActiveStep(0);
  }

  function loadExample(exampleId) {
    const item = EXAMPLE_QUERIES.find((x) => x.id === exampleId);
    if (!item) return;

    setQuery(item.sql);
    setTab("results");
    setSteps([]);
    setPlanNodes([]);
    setActiveStep(-1);
    setRunStatus("");
    setResult({ columns: [], rows: [] });
    setError("");
  }

  console.log("DB ready?", !!db);

  return (
    <div className="shell">
      <TopBar
        onOpenHelp={() => setShowHelp(true)}
        onOpenAbout={() => setShowAbout(true)}
      />

      <main className="layout">
        <QueryPanel
          query={query}
          setQuery={setQuery}
          onRun={handleRun}
          runDisabled={!query.trim() || !db}
          runStatus={runStatus}
          steps={steps}
          planNodes={planNodes}
          activeStep={activeStep}
          onBack={stepBack}
          onNext={stepNext}
          onReset={stepReset}
          onLoadExample={loadExample}
          onFormat={handleFormat}
          onClear={handleClearAll}
          setupSql={setupSql}
          setSetupSql={setSetupSql}
          onApplySetup={handleApplySetup}
          setupDisabled={!setupSql.trim() || !db}
          setupStatus={setupStatus}
          dbReady={!!db}
          dbStatus={dbStatus}

        />

        <OutputPanel
          tab={tab}
          setTab={setTab}
          steps={steps}
          planNodes={planNodes}
          activeStep={activeStep}
          result={result}
          error={error}
          dbReady={!!db}
        />
      </main>

      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <footer className="footer">
        <span>© {new Date().getFullYear()} SQLVision · UI skeleton</span>
      </footer>
    </div>
  );
}
