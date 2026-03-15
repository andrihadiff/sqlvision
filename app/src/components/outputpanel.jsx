import { useEffect, useRef, useState } from "react";
import ChallengePanel from "./challengepanel";
import ResultsTable from "./resultstable";
import SimpleBuilder from "./simplebuilder";
import TableList from "./tablelist";
import TableEditModal from "./tableeditmodal";
import { listTables } from "../logic/schema";
import { Download, RotateCcw, Upload } from "lucide-react";

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
  onOpenChallenge,
  onLoadChallenge,
  onExitChallenge,
  onCopyChallengeLink,
  onDeleteChallenge,
  onExportWorkspace,
  onImportWorkspace,
}) {
  const [tables, setTables] = useState([]);
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
    setTables(listTables(db));
  }

  const tableItems = tables.map((name) => {
    const match = (workspaceTables || []).find(
      (table) => String(table?.name || "").toLowerCase() === String(name).toLowerCase()
    );

    return {
      name,
      createdAt: match?.createdAt || null,
    };
  });

  useEffect(() => {
    if (tab !== "schema") return;
    refreshTables();
  }, [tab, db]);

  function openTableEdit(name) {
    setTableEditing(name);
    setTableEditOpen(true);
  }

  function closeTableEdit() {
    setTableEditOpen(false);
    setTableEditing("");
  }

  async function handleCreateTable(table) {
    const res = await onCreateTable(table);
    refreshTables();
    return res;
  }

  async function handlePersistWorkspace(successMessage, failureMessage) {
    const ok = await onPersistWorkspace(successMessage, failureMessage);
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

    await onImportWorkspace?.(file);
    input.value = "";
    refreshTables();
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

        {tab === "challenge" && (
          <ChallengePanel
            activeChallenge={activeChallenge}
            challengeStatus={challengeStatus}
            isSharedChallengeLink={isSharedChallengeLink}
            result={result}
            userChallenges={userChallenges}
            draft={challengeDraft}
            onCreateChallenge={onCreateChallenge}
            onOpenChallenge={onOpenChallenge}
            onLoadChallenge={onLoadChallenge}
            onExitChallenge={onExitChallenge}
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
            <div className="schema-header">
              <h3 className="schema-title">
                Schema & Data
              </h3>

              <div className="workspace-actions">
                <button
                  className="btn ghost"
                  onClick={onExportWorkspace}
                  disabled={!dbReady}
                  title={!dbReady ? "Database not ready" : "Export workspace as SQL"}
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  className="btn ghost"
                  onClick={() => importFileRef.current?.click()}
                  disabled={!dbReady}
                  title={!dbReady ? "Database not ready" : "Import workspace from SQL"}
                >
                  <Upload size={16} />
                  Import
                </button>
                <button
                  className="btn ghost danger"
                  onClick={async () => {
                    await onResetDb();
                    refreshTables();
                  }}
                  disabled={!dbReady}
                  title={!dbReady ? "Database not ready" : "Clear all tables"}
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

            {schemaStatus ? <div className="hint" style={{ marginTop: 8 }}>{schemaStatus}</div> : null}

            <SimpleBuilder disabled={!dbReady} onCreate={handleCreateTable} />

            <TableList tables={tableItems} onEdit={openTableEdit} />
          </>
        )}
      </div>

      <TableEditModal
        open={tableEditOpen}
        db={db}
        tableName={tableEditing}
        onClose={closeTableEdit}
        onChanged={refreshTables}
        onPersistWorkspace={handlePersistWorkspace}
      />
    </section>
  );
}
