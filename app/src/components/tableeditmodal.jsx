import { useEffect, useMemo, useState } from "react";
import {
  getPrimaryKeyColumn,
  getTableColumns,
  getTableRows,
  insertRow,
  deleteRowByPk,
  deleteRowByRowid,
  updateRowByPk,
  updateRowByRowid,
  dropTable,
} from "../logic/schema";

export default function TableEditModal({
  open,
  db,
  tableName,
  onClose,
  onChanged,
  onPersistWorkspace,
}) {
  const [cols, setCols] = useState([]);
  const [rowsData, setRowsData] = useState({ columns: [], rows: [] });
  const [values, setValues] = useState({});
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editValues, setEditValues] = useState({});
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
    setEditRowIndex(null);
    setEditValues({});
    refresh();
  }, [open, db, tableName]);

  if (!open || !tableName) return null;

  function setVal(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function setEditVal(name, v) {
    setEditValues((prev) => ({ ...prev, [name]: v }));
  }

  async function persistChanges(successMessage, failureMessage) {
    const ok = await onPersistWorkspace?.(successMessage, failureMessage);
    if (ok === false) {
      setMsg(failureMessage);
      return false;
    }
    setMsg(successMessage);
    return true;
  }

  async function onInsert() {
    setMsg("");
    const res = insertRow(db, tableName, cols, values);
    if (!res.ok) {
      setMsg(res.error || "Insert failed.");
      return;
    }
    setValues({});
    refresh();
    onChanged?.();
    await persistChanges("Row inserted ✓", "Row inserted locally, but Mongo save failed ✗");
  }

  async function onDeleteRow(row, rowIndex) {
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

    refresh();
    onChanged?.();
    await persistChanges("Row deleted ✓", "Row deleted locally, but Mongo save failed ✗");
  }

  function onStartEditRow(row, rowIndex) {
    if (editRowIndex !== null && editRowIndex !== rowIndex) return;

    const next = {};
    rowsData.columns.forEach((columnName, index) => {
      const value = row[index];
      next[columnName] = value === null || value === undefined ? "" : String(value);
    });

    setEditValues(next);
    setEditRowIndex(rowIndex);
    setMsg("");
  }

  function onCancelEditRow() {
    setEditRowIndex(null);
    setEditValues({});
    setMsg("");
  }

  async function onSaveEditRow(row, rowIndex) {
    setMsg("");
    let res;

    if (pkName) {
      const idx = rowsData.columns.indexOf(pkName);
      const pkVal = idx >= 0 ? row[idx] : null;
      res = updateRowByPk(db, tableName, cols, pkName, pkVal, editValues);
    } else {
      const rowid =
        Array.isArray(rowsData.rowids) && rowIndex >= 0 ? rowsData.rowids[rowIndex] : undefined;
      res = updateRowByRowid(db, tableName, cols, rowid, editValues);
    }

    if (!res.ok) {
      setMsg(res.error || "Update failed.");
      return;
    }

    setEditRowIndex(null);
    setEditValues({});
    refresh();
    onChanged?.();
    await persistChanges("Row updated ✓", "Row updated locally, but Mongo save failed ✗");
  }

  async function onDeleteTable() {
    setMsg("");
    const res = dropTable(db, tableName);
    if (!res.ok) {
      setMsg(res.error || "Delete table failed.");
      return;
    }

    onChanged?.();
    const ok = await onPersistWorkspace?.(
      "Table deleted ✓",
      "Table deleted locally, but Mongo save failed ✗"
    );
    if (ok === false) {
      onClose?.();
      return;
    }

    onClose?.();
  }

  const canDeleteRow = Boolean(pkName || (Array.isArray(rowsData.rowids) && rowsData.rowids.length));
  const canEditRow = canDeleteRow;

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
          Primary key: {pkName ? pkName : "None (using rowid fallback for row actions)"}
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
                      {r.map((v, j) => {
                        const columnName = rowsData.columns[j];
                        const isEditing = editRowIndex === i;
                        const isPkColumn = Boolean(pkName && columnName === pkName);
                        if (!isEditing) {
                          return <td key={j}>{v === null || v === undefined ? "" : String(v)}</td>;
                        }

                        return (
                          <td key={j}>
                            <input
                              className="builder-input"
                              value={editValues[columnName] ?? ""}
                              onChange={(e) => setEditVal(columnName, e.target.value)}
                              readOnly={isPkColumn}
                              disabled={isPkColumn}
                            />
                          </td>
                        );
                      })}
                      <td>
                        {editRowIndex === i ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn" onClick={() => onSaveEditRow(r, i)}>
                              Save
                            </button>
                            <button className="btn ghost" onClick={onCancelEditRow}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn ghost"
                              onClick={() => onStartEditRow(r, i)}
                              disabled={!canEditRow || editRowIndex !== null}
                              title={
                                !canEditRow
                                  ? "Edit not available for this table"
                                  : editRowIndex !== null
                                  ? "Finish current row edit first"
                                  : "Edit row"
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="btn ghost"
                              onClick={() => onDeleteRow(r, i)}
                              disabled={!canDeleteRow || editRowIndex !== null}
                              title={
                                !canDeleteRow
                                  ? "Delete not available for this table"
                                  : editRowIndex !== null
                                  ? "Finish current row edit first"
                                  : "Delete row"
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
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
