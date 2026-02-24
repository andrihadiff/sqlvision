import { useEffect, useState } from "react";
import ResultsTable from "./resultstable";
import SimpleBuilder from "./simplebuilder";
import SetupEditModal from "./setupeditmodal";
import TableList from "./tablelist";
import TableEditModal from "./tableeditmodal";
import { listTables } from "../logic/schema";

export default function OutputPanel({
  db,
  tab,
  setTab,
  planNodes,
  result,
  error,

  setupSql,
  setSetupSql,
  setupStatus,

  setupName,
  setSetupName,
  onSaveSetup,
  savedSetups,
  onApplySavedSetup,
  onDeleteSavedSetup,
  onDeleteTableSetup,

  onResetDb,
  dbReady,

  onCreateTableSetup,
}) {
  const advancedOpen = false;

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const editingSetup =
    savedSetups?.find((s) => String(s._id || s.id) === String(editingId)) || null;

  const [tables, setTables] = useState([]);
  const [tableEditOpen, setTableEditOpen] = useState(false);
  const [tableEditing, setTableEditing] = useState("");

  function refreshTables() {
    if (!db) {
      setTables([]);
      return;
    }
    setTables(listTables(db));
  }

  useEffect(() => {
    if (tab !== "schema") return;
    refreshTables();
  }, [tab, db]);

  function openEdit(id) {
    setEditingId(id);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingId(null);
  }

  async function handleDeleteFromModal(id) {
    const ok = await onDeleteSavedSetup(id);
    if (ok === false) return;
    closeEdit();
  }

  function handleApplyFromModal(id) {
    onApplySavedSetup(id);
    refreshTables();
  }

  function handleApplySavedSetup(id) {
    onApplySavedSetup(id);
    refreshTables();
  }

  function openTableEdit(name) {
    setTableEditing(name);
    setTableEditOpen(true);
  }

  function closeTableEdit() {
    setTableEditOpen(false);
    setTableEditing("");
  }

  async function onCreateTable(tableName, sql) {
    const res = await onCreateTableSetup(tableName, sql);
    refreshTables();
    return res;
  }

  return (
    <section className="panel output">
      <div className="tabs">
        {["results", "diagram", "schema"].map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "results"
              ? "Results"
              : t === "diagram"
              ? "Diagram"
              : "Schema"}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === "results" && (
          <>
            <h3 className="section-title">Results</h3>
            {error ? (
              <div className="error-box">{error}</div>
            ) : (
              <ResultsTable columns={result?.columns} rows={result?.rows} />
            )}
          </>
        )}

        {tab === "diagram" && (
          <div className="diagram">
            <h3 className="section-title">Logical plan (diagram)</h3>
            <div className="diagram-canvas">
              {(planNodes.length ? planNodes : ["Run to generate diagram"]).map((n, i) => (
                <div key={i} className="diagram-row">
                  <div className="node">{n}</div>
                  {i < planNodes.length - 1 && <div className="arrow" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "schema" && (
          <>
            <div className="schema-head">
              <h3 className="section-title" style={{ margin: 0 }}>
                Schema & Data
              </h3>

              <button
                className="btn"
                onClick={async () => {
                  await onResetDb();
                  refreshTables();
                }}
                disabled={!dbReady}
                title={!dbReady ? "Database not ready" : "Reset database to demo data"}
              >
                Reset DB
              </button>
            </div>

            <div className="hint" style={{ marginTop: 8 }}>
              Create tables with Simple mode, then edit rows in the popup editor.
            </div>

            <SimpleBuilder disabled={!dbReady} onCreate={onCreateTable} />

            <TableList tables={tables} onEdit={openTableEdit} />

            {advancedOpen && (
              <div className="setup-block">
                <div className="setup-head">
                  <div className="setup-title">Setup SQL</div>
                </div>

                <textarea
                  className="setup-input"
                  rows={8}
                  placeholder={
                    "CREATE TABLE t(id INTEGER);\nINSERT INTO t VALUES (1);\n\n-- then run SELECT queries in Results"
                  }
                  value={setupSql}
                  onChange={(e) => setSetupSql(e.target.value)}
                />

                <div className="setup-save-row">
                  <input
                    className="setup-name"
                    placeholder="Name this table (e.g., JOIN demo)"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                  />
                  <button
                    className="btn"
                    onClick={onSaveSetup}
                    disabled={!setupSql.trim()}
                    title={!setupSql.trim() ? "Write Setup SQL first" : "Save this setup"}
                  >
                    Save Table
                  </button>
                </div>

                {setupStatus && <div className="hint">{setupStatus}</div>}
              </div>
            )}

            {savedSetups?.length > 0 ? (
              <div className="setup-list" style={{ marginTop: 14 }}>
                <div className="hint" style={{ marginTop: 10 }}>
                  Saved Tables:
                </div>

                {savedSetups.map((s) => {
                  const id = s._id || s.id;
                  return (
                    <div className="setup-item" key={id}>
                      <div className="setup-item-left">
                        <div className="setup-item-title">{s.name}</div>
                        <div className="setup-item-meta">
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="setup-item-actions">
                        <button className="btn" onClick={() => handleApplySavedSetup(id)}>
                          Apply
                        </button>
                        <button className="btn" onClick={() => openEdit(id)}>
                          Edit
                        </button>
                        <button className="btn ghost" onClick={() => onDeleteSavedSetup(id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hint" style={{ marginTop: 14 }}>
                No saved setups yet.
              </div>
            )}
          </>
        )}
      </div>

      <SetupEditModal
        open={editOpen}
        setup={editingSetup}
        onClose={closeEdit}
        onApply={(id) => handleApplyFromModal(id)}
        onDelete={(id) => handleDeleteFromModal(id)}
      />

      <TableEditModal
        open={tableEditOpen}
        db={db}
        tableName={tableEditing}
        onClose={closeTableEdit}
        onChanged={refreshTables}
        onDeleteTableSetup={onDeleteTableSetup}
      />
    </section>
  );
}
