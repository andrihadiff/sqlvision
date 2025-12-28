export default function AboutModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>How SQLVision Works</h2>

        <ol>
          <li><strong>Query Input:</strong> Write a SQL query.</li>
          <li><strong>Logical Parsing:</strong> Identify SQL operations.</li>
          <li><strong>Execution Steps:</strong> Break query into stages.</li>
          <li><strong>Visual Plan:</strong> Display logical plan.</li>
          <li><strong>Result Preview:</strong> Show final output.</li>
        </ol>

        <p className="muted">
          This project focuses on the conceptual flow of SQL queries.
        </p>

        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
