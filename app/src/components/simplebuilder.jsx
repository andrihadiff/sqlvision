import { useMemo, useState } from "react";

function newCol() {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: "",
    type: "TEXT",
    primary: false,
  };
}

const TYPES = ["INTEGER", "TEXT", "REAL", "BLOB"];

export default function SimpleBuilder({ onCreate, disabled }) {
  const [tableName, setTableName] = useState("");
  const [cols, setCols] = useState([newCol()]);
  const [msg, setMsg] = useState("");

  const pkCount = useMemo(() => cols.filter((c) => c.primary).length, [cols]);

  function addCol() {
    setCols((prev) => [...prev, newCol()]);
  }

  function removeCol(id) {
    setCols((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCol(id, patch) {
    setCols((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function buildTable() {
    const t = tableName.trim();
    if (!t) return { error: "Table name is required." };

    const cleaned = cols
      .map((c) => ({
        ...c,
        name: c.name.trim(),
      }))
      .filter((c) => c.name);

    if (!cleaned.length) return { error: "Add at least 1 column." };

    const lines = cleaned.map((c) => {
      const pk = c.primary ? " PRIMARY KEY" : "";
      return `${c.name} ${c.type}${pk}`;
    });

    return {
      name: t,
      columns: cleaned.map((c) => ({
        name: c.name,
        type: c.type,
        primary: Boolean(c.primary),
      })),
      sql: `CREATE TABLE ${t} (\n  ${lines.join(",\n  ")}\n);`,
    };
  }

  async function handleCreate() {
    setMsg("");
    if (disabled) return;

    if (pkCount > 1) {
      setMsg("Only one PRIMARY KEY column is allowed in this simple builder.");
      return;
    }

    const built = buildTable();
    if (built.error) {
      setMsg(built.error);
      return;
    }

    try {
      const res = await onCreate(built);
      if (!res?.ok) {
        if (res?.outcome === "applied" || res?.outcome === "already") {
          setMsg("Table created locally, but Mongo save failed.");
        } else {
          setMsg("Create failed (see error).");
        }
        return;
      }

      if (res.outcome === "already") setMsg("Table already exists ✓");
      else setMsg("Table created and saved ✓");

      setTableName("");
      setCols([newCol()]);
    } catch (e) {
      setMsg(e?.message || "Create failed.");
    }
  }

  return (
    <div className="builder-block">
      <div className="builder-head">
        <div>
          <div className="builder-title">Simple Table Builder</div>
          
        </div>
      </div>

      <div className="builder-grid">
        <input
          className="builder-input"
          placeholder="Table name (e.g., orders)"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          disabled={disabled}
        />

        <div className="builder-cols">
          {cols.map((c, idx) => (
            <div key={c.id} className="builder-row">
              <input
                className="builder-input"
                placeholder={idx === 0 ? "Column name (e.g., id)" : "Column name"}
                value={c.name}
                onChange={(e) => updateCol(c.id, { name: e.target.value })}
                disabled={disabled}
              />

              <select
                className="builder-select"
                value={c.type}
                onChange={(e) => updateCol(c.id, { type: e.target.value })}
                disabled={disabled}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label className="builder-pk">
                <input
                  type="checkbox"
                  checked={c.primary}
                  onChange={(e) => updateCol(c.id, { primary: e.target.checked })}
                  disabled={disabled}
                />
                PK
              </label>

              <button
                className="btn ghost"
                onClick={() => removeCol(c.id)}
                disabled={disabled || cols.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="builder-actions">
          <button className="btn" onClick={addCol} disabled={disabled}>
            Add Column
          </button>
          <button className="btn primary" onClick={handleCreate} disabled={disabled}>
            Create Table
          </button>
        </div>

        {msg ? <div className="hint">{msg}</div> : null}
      </div>
    </div>
  );
}
