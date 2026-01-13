import StepDetails from "./stepdetails";
import PlaceholderTable from "./placeholdertable";

export default function OutputPanel({ tab, setTab, steps, planNodes, activeStep }) {

    const activeNode = activeStep >= 0 ? planNodes[activeStep] : null;

  return (
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
        <StepDetails node={activeNode} />
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
              {(steps.length ? steps : ["Run a query to generate steps."]).map((st, idx) => (
                <li key={idx} className={idx === activeStep ? "active-step" : ""}>
                  {st}
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === "diagram" && (
          <div className="diagram">
            <h3 className="section-title">Logical plan (diagram)</h3>
            <div className="diagram-canvas">
              {(planNodes.length ? planNodes : ["Run to generate diagram"]).map((n, i) => (
                <div key={i} className="diagram-row">
                  <div className={`node ${i === activeStep ? "active-node" : ""}`}>{n}</div>
                  {i < (planNodes.length ? planNodes.length : 1) - 1 && <div className="arrow" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
