export default function HelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Help</h2>

        <h3>Running Queries</h3>
        <ul>
          <li>Write SQL in the editor and click <strong>Run</strong>.</li>
          <li><strong>Results</strong> shows output or SQL errors.</li>
          <li><strong>Breakdown</strong> shows simplified query steps.</li>
        </ul>

        <h3>Managing Data</h3>
        <ul>
          <li>Use <strong>Schema</strong> to create tables with <strong>Simple Table Builder</strong>.</li>
          <li>Open a table to edit data (insert/delete rows, delete table).</li>
          <li><strong>Reset</strong> clears the current database workspace.</li>
        </ul>

        <h3>Challenges &amp; Workspaces</h3>
        <ul>
          <li>Use <strong>Challenge</strong> to create and load SQL challenges.</li>
          <li>Save and reload challenges from your library.</li>
          <li><strong>Export</strong> downloads workspace as a <code>.sql</code> file.</li>
          <li><strong>Import</strong> loads a <code>.sql</code> file into a new workspace.</li>
        </ul>

        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
