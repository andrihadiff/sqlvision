export default function AboutModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>About SQLVision</h2>

        <p>
          SQLVision is an interactive SQL learning and experimentation environment designed for
          hands-on practice. It provides a safe sandbox for writing, testing, and understanding SQL
          without setting up a local database server.
        </p>

        <p>
          Queries run locally in the browser using SQLite through sql.js. Workspace state, challenge
          definitions, and shared snapshots are persisted through the backend API. Each browser
          session is identified with a generated client ID, so users can keep their own data without
          creating an account.
        </p>

        <p>
          The platform also supports challenge creation and sharing. The Breakdown tab provides a
          simplified logical explanation of the most recent query for learning support. It is an
          educational aid and not a true database execution plan.
        </p>

        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
