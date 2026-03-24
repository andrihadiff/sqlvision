import { useEffect, useRef, useState } from "react";
import ChallengePanel from "./challengepanel";
import ResultsTable from "./resultstable";
import SimpleBuilder from "./simplebuilder";
import TableList from "./tablelist";
import TableEditModal from "./tableeditmodal";
import { getTableColumns, getTableRowCount, getTableRows, listTables } from "../logic/schema";
import { Download, RotateCcw, Upload } from "lucide-react";

const PREVIEW_ROW_LIMIT = 3;
const PREVIEW_COLUMN_LIMIT = 4;

export default function OutputPanel({
  db,
  tab,
  setTab,
  result,
  breakdownSteps,
  error,
  workspaceTables,
  schemaStatus,
  challengeStatus,
  isSharedChallengeLink,
  userChallenges,
  activeChallenge,
  onResetDb,
  dbReady,
  onCreateTable,
  onPersistWorkspace,
  onCreateChallenge,
  onLoadChallenge,
  onExitChallenge,
  onReturnToWorkspace,
  onCopyChallengeLink,
  onDeleteChallenge,
  onExportWorkspace,
  onImportWorkspace,
}) {
  const [tables, setTables] = useState([]);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [workspaceActionsOpen, setWorkspaceActionsOpen] = useState(false);
  const [tableEditOpen, setTableEditOpen] = useState(false);
  const [tableEditing, setTableEditing] = useState("");
  const importFileRef = useRef(null);
  const [challengeDraft, setChallengeDraft] = useState({
    title: "",
    prompt: "",
    starterQuery: "",
    expectedResult: { columns: [], rows: [] },
    draftStatus: "",
  });

  function refreshTables() {
    if (!db) {
      setTables([]);
      return;
    }
    const next = listTables(db).map((name) => {
      const columns = getTableColumns(db, name);
      const rowCount = getTableRowCount(db, name);
      const rowsData = getTableRows(db, name, PREVIEW_ROW_LIMIT);

      const previewColumns = (rowsData.columns || []).slice(0, PREVIEW_COLUMN_LIMIT);
      const previewRows = (rowsData.rows || [])
        .slice(0, PREVIEW_ROW_LIMIT)
        .map((row) => row.slice(0, PREVIEW_COLUMN_LIMIT));

      const match = (workspaceTables || []).find(
        (table) => String(table?.name || "").toLowerCase() === String(name).toLowerCase()
      );

      return {
        name,
        createdAt: match?.createdAt || null,
        columnCount: columns.length,
        rowCount,
        previewColumns,
        previewRows,
        hasMoreColumns: (rowsData.columns || []).length > PREVIEW_COLUMN_LIMIT,
        hasMoreRows: typeof rowCount === "number" ? rowCount > previewRows.length : false,
      };
    });

    setTables(next);
  }

  useEffect(() => {
    if (tab !== "schema") return;
    refreshTables();
  }, [tab, db, workspaceTables]);

  useEffect(() => {
    if (tab === "schema") return;
    setAddTableOpen(false);
    setWorkspaceActionsOpen(false);
  }, [tab]);

  function openTableEdit(name) {
    setTableEditing(name);
    setTableEditOpen(true);
  }

  function closeTableEdit() {
    setTableEditOpen(false);
    setTableEditing("");
  }

  function handleTableRenamed(previousName, nextName) {
    setTableEditing((current) =>
      String(current || "").toLowerCase() === String(previousName || "").toLowerCase()
        ? String(nextName || "")
        : current
    );
    refreshTables();
  }

  async function handleCreateTable(table) {
    const res = await onCreateTable(table);
    refreshTables();
    if (res?.ok) setAddTableOpen(false);
    return res;
  }

  async function handlePersistWorkspace(successMessage, failureMessage, options) {
    const ok = await onPersistWorkspace(successMessage, failureMessage, options);
    refreshTables();
    return ok;
  }

  function updateChallengeDraft(patch) {
    setChallengeDraft((prev) => ({ ...prev, ...(patch || {}) }));
  }

  function resetChallengeDraft() {
    setChallengeDraft({
      title: "",
      prompt: "",
      starterQuery: "",
      expectedResult: { columns: [], rows: [] },
      draftStatus: "",
    });
  }

  async function handleImportFileChange(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;

    const ok = await onImportWorkspace?.(file);
    input.value = "";
    refreshTables();
    if (ok) setWorkspaceActionsOpen(false);
  }

  return (
    <section className="panel output">
      <div className="tabs">
        {["results", "breakdown", "challenge", "schema"].map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "results"
              ? "Results"
              : t === "breakdown"
              ? "Breakdown"
              : t === "challenge"
              ? "Challenge"
              : "Data"}
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

        {tab === "challenge" && (
          <ChallengePanel
            activeChallenge={activeChallenge}
            challengeStatus={challengeStatus}
            isSharedChallengeLink={isSharedChallengeLink}
            result={result}
            userChallenges={userChallenges}
            draft={challengeDraft}
            onCreateChallenge={onCreateChallenge}
            onLoadChallenge={onLoadChallenge}
            onExitChallenge={onExitChallenge}
            onReturnToWorkspace={onReturnToWorkspace}
            onCopyChallengeLink={onCopyChallengeLink}
            onDeleteChallenge={onDeleteChallenge}
            onUpdateDraft={updateChallengeDraft}
            onResetDraft={resetChallengeDraft}
          />
        )}

        {tab === "breakdown" && (
          <>
            <h3 className="section-title">Execution Breakdown</h3>
            {Array.isArray(breakdownSteps) && breakdownSteps.length ? (
              <ol className="breakdown-list">
                {breakdownSteps.map((step, index) => (
                  <li key={`${index}-${step}`} className="breakdown-item">
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="hint">Run a query to see execution breakdown.</div>
            )}
          </>
        )}

        {tab === "schema" && (
          <>
            <div className="data-toolbar">
              <h3 className="schema-title">Data</h3>

              <div className="data-toolbar-actions">
                <button
                  className="btn primary"
                  onClick={() => setAddTableOpen(true)}
                  disabled={!dbReady}
                >
                  Add Table +
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setWorkspaceActionsOpen(true)}
                  disabled={!dbReady}
                >
                  Workspace Actions
                </button>
              </div>
            </div>

            {schemaStatus ? <div className="hint" style={{ marginTop: 8 }}>{schemaStatus}</div> : null}

            <TableList tables={tables} onOpen={openTableEdit} />
          </>
        )}
      </div>

      {addTableOpen ? (
        <div className="modal-backdrop" onClick={() => setAddTableOpen(false)}>
          <div className="modal modal-wide modal-animate-panel" onClick={(e) => e.stopPropagation()}>
            <div className="data-modal-head">
              <h3 style={{ margin: 0 }}>Add Table</h3>
              <button className="btn ghost" onClick={() => setAddTableOpen(false)}>
                Close
              </button>
            </div>
            <SimpleBuilder disabled={!dbReady} onCreate={handleCreateTable} />
          </div>
        </div>
      ) : null}

      {workspaceActionsOpen ? (
        <div className="modal-backdrop" onClick={() => setWorkspaceActionsOpen(false)}>
          <div className="modal modal-small modal-animate-panel" onClick={(e) => e.stopPropagation()}>
            <div className="data-modal-head">
              <h3 style={{ margin: 0 }}>Workspace Actions</h3>
              <button className="btn ghost" onClick={() => setWorkspaceActionsOpen(false)}>
                Close
              </button>
            </div>

            <div className="workspace-actions-modal">
              <button
                className="btn ghost"
                onClick={onExportWorkspace}
                disabled={!dbReady}
              >
                <Download size={16} />
                Export
              </button>
              <button
                className="btn ghost"
                onClick={() => importFileRef.current?.click()}
                disabled={!dbReady}
              >
                <Upload size={16} />
                Import
              </button>
              <button
                className="btn ghost danger"
                onClick={async () => {
                  await onResetDb();
                  refreshTables();
                  setWorkspaceActionsOpen(false);
                }}
                disabled={!dbReady}
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".sql,text/sql,application/sql"
                style={{ display: "none" }}
                onChange={handleImportFileChange}
              />
            </div>
          </div>
        </div>
      ) : null}

      <TableEditModal
        open={tableEditOpen}
        db={db}
        tableName={tableEditing}
        onClose={closeTableEdit}
        onChanged={refreshTables}
        onRenamed={handleTableRenamed}
        onPersistWorkspace={handlePersistWorkspace}
      />
    </section>
  );
}
