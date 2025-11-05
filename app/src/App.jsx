import { useState } from "react";
import "./App.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  const handleRunQuery = () => {
    // Placeholder for now — simulate some fake data
    setResult([
      { id: 1, name: "Alice", age: 21 },
      { id: 2, name: "Bob", age: 23 },
    ]);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>SQLVision</h1>
        <p>Visualize and understand SQL queries step by step</p>
      </header>

      {/* Query Input Area */}
      <section className="query-section">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your SQL query here..."
          rows={6}
        />
        <button onClick={handleRunQuery}>Run Query</button>
      </section>

      {/* Result / Visualization Area */}
      <section className="result-section">
        {result ? (
          <table>
            <thead>
              <tr>
                {Object.keys(result[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row) => (
                <tr key={row.id}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="placeholder">Query results will appear here...</p>
        )}
      </section>
    </div>
  );
}
