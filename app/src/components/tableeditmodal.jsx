import { useEffect, useMemo, useState } from "react";
import {
  getPrimaryKeyColumn,
  getTableColumns,
  getTableRows,
  insertRow,
  deleteRowByPk,
  deleteRowByRowid,
  dropTable,
} from "../logic/schema";

export default function TableEditModal({
  open,
  db,
  tableName,
  onClose,
  onChanged,
  onDeleteTableSetup,
}) {
  const [cols, setCols] = useState([]);
  const [rowsData, setRowsData] = useState({ columns: [], rows: [] });
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState("");

  const pkName = useMemo(() => getPrimaryKeyColumn(cols), [cols]);

  function refresh() {
    if (!db || !tableName) return;
    const c = getTableColumns(db, tableName);
    setCols(c);
    const r = getTableRows(db, tableName, 200);
    setRowsData(r);
  }

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setValues({});
    refresh();
  }, [open, db, tableName]);

  if (!open || !tableName) return null;

  function setVal(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function onInsert() {
    setMsg("");
    const res = insertRow(db, tableName, cols, values);
    if (!res.ok) {
      setMsg(res.error || "Insert failed.");
      return;
    }
    setMsg("Row inserted ✓");
    setValues({});
    refresh();
    onChanged?.();
  }

  function onDeleteRow(row, rowIndex) {
    setMsg("");
    let res;

    if (pkName) {
      const idx = rowsData.columns.indexOf(pkName);
      const pkVal = idx >= 0 ? row[idx] : null;
      res = deleteRowByPk(db, tableName, pkName, pkVal);
    } else {
      const rowid =
        Array.isArray(rowsData.rowids) && rowIndex >= 0 ? rowsData.rowids[rowIndex] : undefined;
      res = deleteRowByRowid(db, tableName, rowid);
    }

    if (!res.ok) {
      setMsg(res.error || "Delete failed.");
      return;
    }
    setMsg("Row deleted ✓");
    refresh();
    onChanged?.();
  }

  async function onDeleteTable() {
    setMsg("");
    const res = dropTable(db, tableName);
    if (!res.ok) {
      setMsg(res.error || "Delete table failed.");
      return;
    }
    await onDeleteTableSetup?.(tableName);
    onChanged?.();
    onClose?.();
  }

  const canDeleteRow = Boolean(pkName || (Array.isArray(rowsData.rowids) && rowsData.rowids.length));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{tableName}</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="hint" style={{ marginTop: 8 }}>
          Primary key: {pkName ? pkName : "None (using rowid fallback for delete)"}
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            Insert row
          </div>

          <div className="results-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.name}>
                      {c.name} <span style={{ opacity: 0.6, fontWeight: 500 }}>{c.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {cols.map((c) => (
                    <td key={c.name}>
                      <input
                        className="builder-input"
                        value={values[c.name] ?? ""}
                        onChange={(e) => setVal(c.name, e.target.value)}
                        placeholder={c.pk ? "PK" : ""}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button className="btn primary" onClick={onInsert}>
              Insert
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            Rows (first 200)
          </div>

          <div className="results-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  {rowsData.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rowsData.rows?.length ? (
                  rowsData.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((v, j) => (
                        <td key={j}>{v === null || v === undefined ? "" : String(v)}</td>
                      ))}
                      <td>
                        <button
                          className="btn ghost"
                          onClick={() => onDeleteRow(r, i)}
                          disabled={!canDeleteRow}
                          title={!canDeleteRow ? "Delete not available for this table" : "Delete row"}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={rowsData.columns.length + 1} style={{ opacity: 0.75 }}>
                      No rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
          <button className="btn ghost" onClick={onDeleteTable}>
            Delete Table
          </button>
          {msg ? <div className="hint" style={{ alignSelf: "center" }}>{msg}</div> : <div />}
        </div>
      </div>
    </div>
  );
}
