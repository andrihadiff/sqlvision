export default function TableList({ tables, onEdit }) {
  if (!tables?.length) {
    return <div className="hint" style={{ marginTop: 10 }}>No tables yet. Create one above.</div>;
  }

  return (
    <div className="setup-list" style={{ marginTop: 10 }}>
      <div className="hint">Tables in this database:</div>

      {tables.map((name) => (
        <div className="setup-item" key={name}>
          <div className="setup-item-left">
            <div className="setup-item-title">{name}</div>
            <div className="setup-item-meta">SQLite table</div>
          </div>

          <div className="setup-item-actions">
            <button className="btn ghost" onClick={() => onEdit(name)}>Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}
