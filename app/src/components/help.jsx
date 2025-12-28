export default function HelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Help</h2>

        <h3>How to use</h3>
        <ol>
          <li>Write a SQL query in the editor.</li>
          <li>Click <strong>Run</strong> to analyse it.</li>
          <li>Use <strong>Results</strong>, <strong>Steps</strong>, and <strong>Diagram</strong> to explore execution.</li>
        </ol>

        <h3>Supported (prototype)</h3>
        <ul>
          <li>SELECT / FROM</li>
          <li>WHERE</li>
          <li>ORDER BY</li>
          <li>Basic GROUP BY</li>
        </ul>

        <h3>Examples</h3>
        <pre className="codeblock">{`SELECT name, age
        FROM students
        WHERE age > 20;`}</pre>

        <p className="muted">
          This is an early prototype: the focus is the learning flow and visual explanation.
        </p>

        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
