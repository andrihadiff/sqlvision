export default function TopBar({ onOpenHelp, onOpenAbout }) {
  return (
    <header className="topbar">
      <div className="brand">SQLVision</div>
      <div className="top-actions">
        <button className="btn ghost" onClick={onOpenHelp}>
          Help
        </button>
        <button className="btn ghost" onClick={onOpenAbout}>
          About
        </button>
        <button className="btn primary" disabled>
          Deploy
        </button>
      </div>
    </header>
  );
}
