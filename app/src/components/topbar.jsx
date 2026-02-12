export default function TopBar({
  dialect,
  onChangeDialect,
  onRun,
  runDisabled,
  onShare,
  onOpenHelp,
  onOpenAbout,
}) {
  return (
    <header className="topbar">
      <div className="brand">SQLVision</div>

      <div className="top-actions">
        <select
          className="dialect-select"
          value={dialect}
          onChange={(e) => onChangeDialect(e.target.value)}
          title="SQL Dialect"
        >
          <option value="sqlite">SQLite</option>
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
        </select>

        <button className="btn primary" onClick={onRun} disabled={runDisabled}>
          Run
        </button>

        <button className="btn" onClick={onShare} title="Share this snippet">
          Share
        </button>

        <button className="btn ghost" onClick={onOpenHelp}>
          Help
        </button>
        <button className="btn ghost" onClick={onOpenAbout}>
          About
        </button>
      </div>
    </header>
  );
}
