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
  renameTable,
} from "../logic/schema";
import { Pencil, X } from "lucide-react";

export default function TableEditModal({
  open,
  db,
  tableName,
  onClose,
  onChanged,
  onRenamed,
  onPersistWorkspace,
}) {
  const [currentTableName, setCurrentTableName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [cols, setCols] = useState([]);
  const [rowsData, setRowsData] = useState({ columns: [], rows: [] });
  const [values, setValues] = useState({});
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [mode, setMode] = useState("view");
  const [msg, setMsg] = useState("");

  const pkName = useMemo(() => getPrimaryKeyColumn(cols), [cols]);

  function refresh(targetName = currentTableName) {
    if (!db || !targetName) return;
    const c = getTableColumns(db, targetName);
    setCols(c);
    const r = getTableRows(db, targetName, 200);
    setRowsData(r);
  }

  useEffect(() => {
    if (!open) return;
    const nextName = String(tableName || "");
    setCurrentTableName(nextName);
    setRenameValue(nextName);
    setMode("view");
    setMsg("");
    setValues({});
    setEditRowIndex(null);
    setEditValues({});
    refresh(nextName);
  }, [open, db, tableName]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !currentTableName) return null;

  const isEditMode = mode === "edit";

  function setVal(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function setEditVal(name, v) {
    setEditValues((prev) => ({ ...prev, [name]: v }));
  }

  async function persistChanges(successMessage, failureMessage) {
    const ok = await onPersistWorkspace?.(successMessage, failureMessage, {
      silentSchemaStatus: true,
    });
    if (ok === false) {
      setMsg(failureMessage);
      return false;
    }
    setMsg(successMessage);
    return true;
  }

  async function onInsert() {
    setMsg("");
    const res = insertRow(db, currentTableName, cols, values);
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
      res = deleteRowByPk(db, currentTableName, pkName, pkVal);
    } else {
      const rowid =
        Array.isArray(rowsData.rowids) && rowIndex >= 0 ? rowsData.rowids[rowIndex] : undefined;
      res = deleteRowByRowid(db, currentTableName, rowid);
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

  function onToggleMode() {
    if (isEditMode) {
      setEditRowIndex(null);
      setEditValues({});
      setMode("view");
      return;
    }
    setRenameValue(currentTableName);
    setMode("edit");
  }

  async function onSaveRename() {
    const nextName = String(renameValue || "").trim();
    if (!nextName) {
      setMsg("Table name cannot be empty.");
      return;
    }

    const res = renameTable(db, currentTableName, nextName);
    if (!res.ok) {
      setMsg(res.error || "Rename failed.");
      return;
    }

    if (res.unchanged) {
      setRenameValue(nextName);
      return;
    }

    const previousName = currentTableName;
    setCurrentTableName(nextName);
    setRenameValue(nextName);
    setEditRowIndex(null);
    setEditValues({});
    setValues({});
    refresh(nextName);
    onChanged?.();
    onRenamed?.(previousName, nextName);
    await persistChanges("Table renamed ✓", "Table renamed locally, but Mongo save failed ✗");
  }

  async function onSaveEditRow(row, rowIndex) {
    setMsg("");
    let res;

    if (pkName) {
      const idx = rowsData.columns.indexOf(pkName);
      const pkVal = idx >= 0 ? row[idx] : null;
      res = updateRowByPk(db, currentTableName, cols, pkName, pkVal, editValues);
    } else {
      const rowid =
        Array.isArray(rowsData.rowids) && rowIndex >= 0 ? rowsData.rowids[rowIndex] : undefined;
      res = updateRowByRowid(db, currentTableName, cols, rowid, editValues);
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
    const res = dropTable(db, currentTableName);
    if (!res.ok) {
      setMsg(res.error || "Delete table failed.");
      return;
    }

    onChanged?.();
    const ok = await onPersistWorkspace?.(
      "Table deleted ✓",
      "Table deleted locally, but Mongo save failed ✗",
      { silentSchemaStatus: true }
    );
    if (ok === false) {
      onClose?.();
      return;
    }

    onClose?.();
  }

  const canDeleteRow = Boolean(pkName || (Array.isArray(rowsData.rowids) && rowsData.rowids.length));
  const canEditRow = canDeleteRow;
  const normalizedRename = String(renameValue || "").trim();
  const canSaveRename = Boolean(
    isEditMode && normalizedRename && normalizedRename.toLowerCase() !== currentTableName.toLowerCase()
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal table-modal" onClick={(e) => e.stopPropagation()}>
        <div className="table-modal-header">
          <button type="button" className="modal-close-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>

          <div className="table-modal-header-row">
            {isEditMode ? (
              <div className="table-title-edit-row">
                <div className="table-title-edit-wrap">
                  <Pencil size={14} className="table-title-icon" />
                  <input
                    className="table-title-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSaveRename();
                      }
                    }}
                    placeholder="Table name"
                    aria-label="Table name"
                  />
                </div>
                <button className="btn" onClick={onSaveRename} disabled={!canSaveRename}>
                  Save Name
                </button>
              </div>
            ) : (
              <h3 className="table-title-view">{currentTableName}</h3>
            )}
          </div>

          <div className="hint table-modal-meta">
            Primary key: {pkName ? pkName : "None (using rowid fallback for row actions)"}
          </div>
        </div>

        <div className="table-modal-body">
          <div className="table-modal-action-row">
            <button type="button" className="btn" onClick={onToggleMode}>
              {isEditMode ? "View" : "Edit"}
            </button>
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
                    {isEditMode ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rowsData.rows?.length ? (
                    rowsData.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => {
                          const columnName = rowsData.columns[j];
                          const isEditing = isEditMode && editRowIndex === i;
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
                        {isEditMode ? (
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
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn ghost"
                                  onClick={() => onDeleteRow(r, i)}
                                  disabled={!canDeleteRow || editRowIndex !== null}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={Math.max(1, rowsData.columns.length + (isEditMode ? 1 : 0))}
                        style={{ opacity: 0.75 }}
                      >
                        No rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isEditMode ? (
            <div className="table-modal-footer">
              <div className="table-modal-footer-divider" />

              <div className="table-modal-insert-block">
                <div className="hint table-insert-title">Insert Row</div>

                <div className="table-insert-scroll">
                  <div className="table-insert-grid">
                    {cols.map((c) => (
                      <label key={c.name} className="table-insert-field">
                        <span className="table-insert-label">
                          {c.name}
                          <span className="table-insert-type">{c.type}</span>
                        </span>
                        <input
                          className="builder-input"
                          value={values[c.name] ?? ""}
                          onChange={(e) => setVal(c.name, e.target.value)}
                          placeholder={c.pk ? "PK" : ""}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="table-modal-footer-bottom">
                <button className="btn ghost" onClick={onDeleteTable}>
                  Delete Table
                </button>
                <div className="table-modal-footer-right-actions">
                  <button className="btn primary" onClick={onInsert}>
                    Insert
                  </button>
                </div>
              </div>

              {msg ? <div className="hint table-modal-footer-message">{msg}</div> : null}
            </div>
          ) : msg ? (
            <div className="hint" style={{ marginTop: 12 }}>{msg}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
