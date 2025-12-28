export default function PlaceholderTable() {
  return (
    <div className="placeholder-table">
      <div className="row header">
        <span className="cell" />
        <span className="cell" />
        <span className="cell" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div className="row" key={i}>
          <span className="cell" />
          <span className="cell" />
          <span className="cell" />
        </div>
      ))}
    </div>
  );
}
