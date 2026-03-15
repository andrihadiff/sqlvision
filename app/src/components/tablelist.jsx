export default function TableList({ tables, onEdit }) {
  if (!tables?.length) {
    return <div className="hint" style={{ marginTop: 10 }}>No tables yet. Create one above.</div>;
  }

  return (
    <div className="setup-list" style={{ marginTop: 10 }}>
      <div className="hint">Tables in this workspace:</div>

      {tables.map((table) => (
        <div className="setup-item" key={table.name}>
          <div className="setup-item-left">
            <div className="setup-item-title">{table.name}</div>
            <div className="setup-item-meta">{formatCreatedAt(table.createdAt)}</div>
          </div>

          <div className="setup-item-actions">
            <button className="btn ghost" onClick={() => onEdit(table.name)}>Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCreatedAt(value) {
  if (!value) return "Created just now";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Created just now";
    return date.toLocaleString();
  } catch {
    return "Created just now";
  }
}
