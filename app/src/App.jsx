import { useState } from "react";
import "./App.css";

import AboutModal from "./components/about";
import HelpModal from "./components/help";

import TopBar from "./components/topbar";
import QueryPanel from "./components/querypanel";
import OutputPanel from "./components/outputpanel";

import { analyseQuery } from "./logic/analysequery";

import { EXAMPLE_QUERIES } from "./constants/examplequeries";

export default function App() {
  const [runStatus, setRunStatus] = useState("");
  const [steps, setSteps] = useState([]);
  const [planNodes, setPlanNodes] = useState([]);

  const [tab, setTab] = useState("results");
  const [query, setQuery] = useState("");

  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [activeStep, setActiveStep] = useState(-1);

  function handleRun() {
    setRunStatus("Analysing query...");
    const { steps: newSteps, nodes } = analyseQuery(query);

    setSteps(newSteps);
    setPlanNodes(nodes);

    setActiveStep(0);
    setTab("steps");

    setTimeout(() => setRunStatus(""), 800);
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
}

  return (
    <div className="shell">
      <TopBar onOpenHelp={() => setShowHelp(true)} onOpenAbout={() => setShowAbout(true)} />

      <main className="layout">
        <QueryPanel
          query={query}
          setQuery={setQuery}
          onRun={handleRun}
          runDisabled={!query.trim()}
          runStatus={runStatus}
          steps={steps}
          planNodes={planNodes}
          activeStep={activeStep}
          onBack={stepBack}
          onNext={stepNext}
          onReset={stepReset}
          onLoadExample={loadExample}
        />

        <OutputPanel 
          tab={tab} 
          setTab={setTab} 
          steps={steps} 
          planNodes={planNodes} 
          activeStep={activeStep} />
      </main>

      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <footer className="footer">
        <span>© {new Date().getFullYear()} SQLVision · UI skeleton</span>
      </footer>
    </div>
  );
}
