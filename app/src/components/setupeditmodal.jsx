export default function SetupEditModal({ open, setup, onClose, onApply, onDelete }) {
  if (!open || !setup) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{setup.name}</h3>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="hint" style={{ marginTop: 8 }}>
          Created: {new Date(setup.createdAt).toLocaleString()}
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            SQL
          </div>
          <textarea className="setup-input" value={setup.sql || ""} readOnly rows={10} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn" onClick={() => onApply(setup._id || setup.id)}>
            Apply
          </button>
          <button className="btn ghost" onClick={() => onDelete(setup._id || setup.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}