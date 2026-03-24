export default function TopBar({
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
        <span className="btn ghost topbar-pill">SQLite</span>

        <button className="btn primary" onClick={onRun} disabled={runDisabled}>
          Run
        </button>

        <button className="btn" onClick={onShare}>
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
