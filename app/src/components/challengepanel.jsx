import { useEffect, useState } from "react";
import ResultsTable from "./resultstable";

export default function ChallengePanel({
  activeChallenge,
  challengeStatus,
  isSharedChallengeLink,
  result,
  userChallenges,
  draft,
  onCreateChallenge,
  onOpenChallenge,
  onLoadChallenge,
  onExitChallenge,
  onCopyChallengeLink,
  onDeleteChallenge,
  onUpdateDraft,
  onResetDraft,
}) {
  const title = draft?.title || "";
  const prompt = draft?.prompt || "";
  const starterQuery = draft?.starterQuery || "";
  const expectedResult = draft?.expectedResult || { columns: [], rows: [] };
  const draftStatus = draft?.draftStatus || "";
  const [answerCheck, setAnswerCheck] = useState(null);
  const [showExpected, setShowExpected] = useState(false);

  function updateDraft(patch) {
    if (typeof onUpdateDraft === "function") {
      onUpdateDraft(patch);
    }
  }

  useEffect(() => {
    setAnswerCheck(null);
    setShowExpected(false);
  }, [activeChallenge?._id, activeChallenge?.shareKey]);

  function captureExpectedOutput() {
    const columns = Array.isArray(result?.columns) ? result.columns : [];
    const rows = Array.isArray(result?.rows) ? result.rows : [];

    if (!columns.length) {
      updateDraft({
        draftStatus: "Run the correct query first, then capture the current Results as expected output.",
      });
      return;
    }

    updateDraft({
      expectedResult: {
        columns: [...columns],
        rows: rows.map((row) => (Array.isArray(row) ? [...row] : [])),
      },
      draftStatus: `Expected output captured (${columns.length} columns, ${rows.length} rows) ✓`,
    });
  }

  async function handleCreateChallenge() {
    const payload = {
      title,
      prompt,
      starterQuery,
      expectedResult,
    };

    const created = await onCreateChallenge(payload);
    if (!created) return;

    if (typeof onResetDraft === "function") {
      onResetDraft();
    }
  }

  const expectedSummary = expectedResult.columns.length
    ? `${expectedResult.columns.length} columns, ${expectedResult.rows.length} rows captured`
    : "No expected output captured yet.";
  const activeExpectedSummary = activeChallenge?.expectedResult?.columns?.length
    ? `${activeChallenge.expectedResult.columns.length} columns, ${activeChallenge.expectedResult.rows?.length || 0} rows expected`
    : "No expected output stored for this challenge.";
  const canCheckAnswer = Boolean(activeChallenge?.expectedResult?.columns?.length);
  const canRevealAnswer = Boolean(answerCheck && !answerCheck.ok && canCheckAnswer);

  function checkAnswer() {
    if (!canCheckAnswer) {
      setAnswerCheck({
        ok: false,
        text: "This challenge does not have expected output stored, so it cannot be auto-checked.",
      });
      setShowExpected(false);
      return;
    }

    const actual = {
      columns: Array.isArray(result?.columns) ? result.columns : [],
      rows: Array.isArray(result?.rows) ? result.rows : [],
    };

    if (!actual.columns.length) {
      setAnswerCheck({
        ok: false,
        text: "Run your query first, then click Check My Answer.",
      });
      setShowExpected(false);
      return;
    }

    const expected = {
      columns: activeChallenge.expectedResult.columns || [],
      rows: activeChallenge.expectedResult.rows || [],
    };

    const compared = compareResults(actual, expected);
    setAnswerCheck({
      ok: compared.ok,
      text: compared.message,
    });

    if (compared.ok) setShowExpected(false);
  }

  return (
    <div className="challenge-layout">
      {challengeStatus ? (
        <div className="challenge-status">{challengeStatus}</div>
      ) : null}

      {activeChallenge ? (
        <div className="challenge-card">
          <div className="challenge-card-head">
            <div>
              <div className="challenge-kicker">
                {isSharedChallengeLink ? "Shared Challenge" : "Active Challenge"}
              </div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>{activeChallenge.title}</h3>
              <div className="hint">Challenge prompt</div>
            </div>
            <div className="challenge-card-actions">
              <button className="btn ghost" onClick={onExitChallenge} title="Exit challenge mode">
                Exit Challenge
              </button>
              <button className="btn" onClick={() => onCopyChallengeLink(activeChallenge)}>
                Copy Link
              </button>
              <button className="btn primary" onClick={() => onLoadChallenge(activeChallenge)}>
                Load Into Workspace
              </button>
            </div>
          </div>

          <div className="challenge-prompt">{activeChallenge.prompt}</div>

          {activeChallenge.starterQuery ? (
            <div className="challenge-detail-block">
              <div className="hint" style={{ marginBottom: 6 }}>Starter query</div>
              <textarea className="challenge-textarea" readOnly rows={4} value={activeChallenge.starterQuery} />
            </div>
          ) : null}

          <div className="challenge-detail-block">
            <div className="hint">Expected output: {activeExpectedSummary}</div>
          </div>

          <div className="challenge-warning">
            Loading this challenge will replace your current workspace.
          </div>

          <div className="challenge-detail-block">
            <div className="challenge-check-head">
              <div className="hint">Answer check</div>
              <div className="challenge-card-actions">
                <button className="btn" onClick={checkAnswer}>
                  Check My Answer
                </button>
                {canRevealAnswer ? (
                  <button className="btn ghost" onClick={() => setShowExpected((s) => !s)}>
                    {showExpected ? "Hide Expected Output" : "Reveal Expected Output"}
                  </button>
                ) : null}
              </div>
            </div>

            {answerCheck ? (
              <div className={`challenge-check ${answerCheck.ok ? "ok" : "bad"}`}>
                {answerCheck.text}
              </div>
            ) : (
              <div className="hint">Run your SQL in the editor, then click Check My Answer.</div>
            )}
          </div>

          {showExpected && canCheckAnswer ? (
            <div className="challenge-detail-block">
              <div className="hint" style={{ marginBottom: 6 }}>Expected output</div>
              <ResultsTable
                columns={activeChallenge.expectedResult.columns || []}
                rows={activeChallenge.expectedResult.rows || []}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="challenge-card">
          <div className="challenge-kicker">
            {isSharedChallengeLink ? "Shared Challenge" : "Challenge"}
          </div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            {isSharedChallengeLink ? "Challenge not available" : "Create a challenge from your workspace"}
          </h3>
          <div className="hint">
            {isSharedChallengeLink
              ? "This shared challenge could not be loaded."
              : "Publish the current workspace as a challenge and send it with a unique link."}
          </div>
        </div>
      )}

      {!isSharedChallengeLink ? (
        <div className="challenge-card">
          <div className="challenge-kicker">Creator Tools</div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Create New Challenge</h3>
          <div className="hint">Build tables in Schema, run the correct query, capture the expected output, then publish.</div>

          <div className="challenge-form">
            <input
              className="builder-input"
              placeholder="Challenge title"
              value={title}
              onChange={(e) => updateDraft({ title: e.target.value })}
            />

            <textarea
              className="challenge-textarea"
              rows={5}
              placeholder="Challenge description."
              value={prompt}
              onChange={(e) => updateDraft({ prompt: e.target.value })}
            />

            <textarea
              className="challenge-textarea"
              rows={4}
              placeholder="Optional starter query"
              value={starterQuery}
              onChange={(e) => updateDraft({ starterQuery: e.target.value })}
            />

            <div className="challenge-expected-row">
              <div className="hint">Expected output: {expectedSummary}</div>
              <div className="challenge-expected-action">
                <button className="btn challenge-form-btn" onClick={captureExpectedOutput}>
                  Use Current Results as Expected Output
                </button>
              </div>
            </div>

            {draftStatus ? <div className="hint">{draftStatus}</div> : null}

            <button className="btn primary challenge-form-btn" onClick={handleCreateChallenge}>
              Create From Current Workspace
            </button>
          </div>
        </div>
      ) : null}

      {!isSharedChallengeLink ? (
        <div className="challenge-card">
          <div className="challenge-kicker">Creator Tools</div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>My Challenge Library</h3>
          {userChallenges?.length ? (
            <div className="setup-list" style={{ marginTop: 10 }}>
              {userChallenges.map((challenge) => (
                <div className="setup-item" key={challenge._id || challenge.id || challenge.shareKey}>
                  <div className="setup-item-left">
                    <div className="setup-item-title">{challenge.title}</div>
                    <div className="setup-item-meta">{formatCreatedAt(challenge.createdAt)}</div>
                  </div>

                  <div className="setup-item-actions">
                    <button className="btn ghost" onClick={() => onOpenChallenge(challenge)}>
                      Open
                    </button>
                    <button className="btn ghost" onClick={() => onCopyChallengeLink(challenge)}>
                      Copy Link
                    </button>
                    <button className="btn" onClick={() => onLoadChallenge(challenge)}>
                      Load
                    </button>
                    <button className="btn ghost" onClick={() => onDeleteChallenge(challenge)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hint">No challenges created yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatCreatedAt(value) {
  if (!value) return "Created just now";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Created just now";
    return date.toLocaleString();
  } catch {
    return "Created just now";
  }
}

function compareResults(actual, expected) {
  const actualColumns = Array.isArray(actual?.columns) ? actual.columns.map((c) => String(c || "")) : [];
  const expectedColumns = Array.isArray(expected?.columns) ? expected.columns.map((c) => String(c || "")) : [];

  if (actualColumns.length !== expectedColumns.length) {
    return {
      ok: false,
      message: `Column count mismatch. Expected ${expectedColumns.length}, got ${actualColumns.length}.`,
    };
  }

  for (let i = 0; i < expectedColumns.length; i += 1) {
    if (actualColumns[i] !== expectedColumns[i]) {
      return {
        ok: false,
        message: `Column mismatch at position ${i + 1}. Expected "${expectedColumns[i]}", got "${actualColumns[i]}".`,
      };
    }
  }

  const actualRows = Array.isArray(actual?.rows) ? actual.rows : [];
  const expectedRows = Array.isArray(expected?.rows) ? expected.rows : [];

  if (actualRows.length !== expectedRows.length) {
    return {
      ok: false,
      message: `Row count mismatch. Expected ${expectedRows.length}, got ${actualRows.length}.`,
    };
  }

  const width = expectedColumns.length;
  const normExpected = expectedRows.map((row) => normalizeRow(row, width)).sort();
  const normActual = actualRows.map((row) => normalizeRow(row, width)).sort();

  for (let i = 0; i < normExpected.length; i += 1) {
    if (normExpected[i] !== normActual[i]) {
      return {
        ok: false,
        message: "Rows do not match the expected output.",
      };
    }
  }

  return {
    ok: true,
    message: "Correct answer ✓",
  };
}

function normalizeRow(row, width) {
  const cells = Array.isArray(row) ? row : [];
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const value = i < cells.length ? cells[i] : null;
    out.push(normalizeValue(value));
  }
  return JSON.stringify(out);
}

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    return value;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value);
}
