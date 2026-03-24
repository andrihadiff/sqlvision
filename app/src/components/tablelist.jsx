export default function TableList({ tables, onOpen }) {
  if (!tables?.length) {
    return <div className="hint" style={{ marginTop: 10 }}>No tables yet. Click Add Table + to create one.</div>;
  }

  return (
    <div className="table-browser-grid">
      {tables.map((table) => (
        <div
          key={table.name}
          className="table-preview-card"
          onClick={() => onOpen?.(table.name)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen?.(table.name);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="table-preview-head">
            <div className="table-preview-name">{table.name}</div>
            <div className="table-preview-meta">
              <div className="table-preview-time">{formatCreatedAt(table.createdAt)}</div>
              <div className="table-preview-stats">
              </div>
            </div>
          </div>

          {table.previewColumns?.length ? (
            <div className="table-preview-wrap">
              <div className="table-preview-scroll">
                <table className="table-preview-table">
                  <thead>
                    <tr>
                      {table.previewColumns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.previewRows?.length ? (
                      table.previewRows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((value, columnIndex) => (
                            <td key={`${rowIndex}-${columnIndex}`}>{formatCell(value)}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={table.previewColumns.length}>No rows yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-preview-more">{buildPreviewStatus(table)}</div>
            </div>
          ) : (
            <div className="hint" style={{ marginTop: 8 }}>No columns detected.</div>
          )}
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

function formatRowCount(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "unknown";
  return String(value);
}

function buildPreviewStatus(table) {
  const rowsShown = Array.isArray(table?.previewRows) ? table.previewRows.length : 0;
  const previewColumns = Array.isArray(table?.previewColumns) ? table.previewColumns.length : 0;
  const totalColumns = Number.isFinite(table?.columnCount)
    ? Math.max(0, Number(table.columnCount))
    : previewColumns;
  const hasTotalRows = Number.isFinite(table?.rowCount);
  const totalRows = hasTotalRows ? Math.max(0, Number(table.rowCount)) : null;

  const rowPart = hasTotalRows
    ? `${rowsShown} of ${totalRows} rows`
    : `${rowsShown} rows shown`;

  return `${rowPart} · ${totalColumns} columns`;
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "∅";
  const text = String(value);
  return text.length > 26 ? `${text.slice(0, 23)}...` : text;
}
