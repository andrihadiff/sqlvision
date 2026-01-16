export default function ResultsTable({ columns, rows }) {
  if (!columns?.length) {
    return <div className="hint">Run a query to see results.</div>;
  }

  return (
    <div className="results-wrap">
      <table className="results-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
