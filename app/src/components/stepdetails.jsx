import { STEP_INFO } from "../constants/stepinfo";

export default function StepDetails({ node }) {
  if (!node) return null;

  const info =
    STEP_INFO[node] ||
    {
      title: node,
      body: "No explanation available for this step yet.",
      tip: ""
    };

  return (
    <div className="step-details">
      <div className="step-details-head">
        <h3 className="section-title">Step Details</h3>
        <span className="step-tag">{info.title}</span>
      </div>

      <p className="step-body">{info.body}</p>
      {info.tip && <p className="step-tip">Tip: {info.tip}</p>}
    </div>
  );
}
