import { useState } from "react"; 
import { EXAMPLE_QUERIES } from "../constants/examplequeries";

export default function ExamplePicker({ onPick }) {
  const [value, setValue] = useState("");

  function handleChange(e) {
    const id = e.target.value;
    onPick?.(id);

    setValue("");
  }

  return (
    <div className="example-picker">
      <span className="example-label">Examples:</span>

      <select className="example-select" value={value} onChange={handleChange}>
        <option value="" disabled>
          Choose
        </option>

        {EXAMPLE_QUERIES.map((q) => (
          <option key={q.id} value={q.id}>
            {q.label}
          </option>
        ))}
      </select>
    </div>
  );
}
