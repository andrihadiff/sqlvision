import { useEffect, useRef, useState } from "react";
import "./App.css";

import AboutModal from "./components/about";
import HelpModal from "./components/help";

import TopBar from "./components/topbar";
import QueryPanel from "./components/querypanel";
import OutputPanel from "./components/outputpanel";

import { formatSql } from "./logic/formatsql";
import { createWorkspaceDb, run } from "./logic/db";
import { replaceDbContents, snapshotDb, snapshotToSql } from "./logic/schema";
import { apiDelete, apiGet, apiPost } from "./logic/api";
import { generateQueryBreakdown } from "./logic/stepper";

const CLIENT_ID_KEY = "sqlvision:client_id";
const SHARE_QUERY_PARAM = "share";
const CHALLENGE_QUERY_PARAM = "challenge";

function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id =
      (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function getUrlParam(name) {
  try {
    return new URLSearchParams(globalThis.location?.search || "").get(name) || "";
  } catch {
    return "";
  }
}

function stripLeadingComments(sql) {
  let text = String(sql || "").trimStart();

  while (text.startsWith("--") || text.startsWith("/*")) {
    if (text.startsWith("--")) {
      const next = text.indexOf("\n");
      text = next >= 0 ? text.slice(next + 1).trimStart() : "";
      continue;
    }

    const end = text.indexOf("*/");
    text = end >= 0 ? text.slice(end + 2).trimStart() : "";
  }

  return text;
}

function isLikelyMutatingSql(sql) {
  const cleaned = stripLeadingComments(sql).toUpperCase();
  if (!cleaned) return false;

  return !/^(SELECT|WITH|PRAGMA|EXPLAIN)\b/.test(cleaned);
}

function buildChallengeUrl(shareKey) {
  return `${window.location.origin}${window.location.pathname}?${CHALLENGE_QUERY_PARAM}=${encodeURIComponent(shareKey)}`;
}

function clearChallengeParamFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(CHALLENGE_QUERY_PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  } catch {
    // Ignore URL rewrite errors.
  }
}

function downloadTextFile(filename, text) {
  const blob = new Blob([String(text || "")], { type: "text/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [db, setDb] = useState(null);
  const [runStatus, setRunStatus] = useState("");
  const [tab, setTab] = useState("results");
  const [query, setQuery] = useState("");
  const [workspaceTables, setWorkspaceTables] = useState([]);
  const [schemaStatus, setSchemaStatus] = useState("");
  const [challengeStatus, setChallengeStatus] = useState("");
  const [result, setResult] = useState({ columns: [], rows: [] });
  const [breakdownSteps, setBreakdownSteps] = useState([]);
  const [error, setError] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dbStatus, setDbStatus] = useState("loading");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [userChallenges, setUserChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [isSharedChallengeMode, setIsSharedChallengeMode] = useState(() =>
    Boolean(getUrlParam(CHALLENGE_QUERY_PARAM))
  );

  const [clientId] = useState(() => getClientId());
  const [shareKey] = useState(() => getUrlParam(SHARE_QUERY_PARAM));
  const [challengeKey] = useState(() => getUrlParam(CHALLENGE_QUERY_PARAM));
  const restoredDbsRef = useRef(new WeakSet());

  useEffect(() => {
    let alive = true;

    async function loadWorkspace() {
      try {
        if (shareKey) {
          const data = await apiGet(`/share/${encodeURIComponent(shareKey)}`);
          if (!alive) return;

          setWorkspaceTables(Array.isArray(data?.tables) ? data.tables : []);
          setQuery(String(data?.query || ""));
          setWorkspaceLoaded(true);
          return;
        }

        const data = await apiGet(`/tables?clientId=${encodeURIComponent(clientId)}`);
        if (!alive) return;

        setWorkspaceTables(Array.isArray(data) ? data : []);
        setWorkspaceLoaded(true);
      } catch (e) {
        if (!alive) return;
        setWorkspaceTables([]);
        setWorkspaceLoaded(true);
        setError(e?.message || "Failed to load workspace tables.");
      }
    }

    loadWorkspace();

    return () => {
      alive = false;
    };
  }, [clientId, shareKey]);

  useEffect(() => {
    let alive = true;

    async function loadChallenges() {
      const minePromise = apiGet(`/challenges?clientId=${encodeURIComponent(clientId)}`);
      const sharedPromise = challengeKey
        ? apiGet(`/challenges/share/${encodeURIComponent(challengeKey)}`)
        : Promise.resolve(null);

      const [mineRes, sharedRes] = await Promise.allSettled([minePromise, sharedPromise]);
      if (!alive) return;

      if (mineRes.status === "fulfilled") {
        setUserChallenges(Array.isArray(mineRes.value) ? mineRes.value : []);
      } else {
        setUserChallenges([]);
      }

      if (sharedRes.status === "fulfilled" && sharedRes.value) {
        setActiveChallenge(sharedRes.value);
        setIsSharedChallengeMode(true);
        setTab("challenge");
      } else if (challengeKey) {
        setIsSharedChallengeMode(false);
        setError(
          sharedRes.status === "rejected"
            ? sharedRes.reason?.message || "Failed to load challenge."
            : "Failed to load challenge."
        );
        setTab("challenge");
      } else {
        setIsSharedChallengeMode(false);
      }
    }

    loadChallenges();

    return () => {
      alive = false;
    };
  }, [clientId, challengeKey]);

  useEffect(() => {
    let alive = true;

    setDbStatus("loading");
    setRunStatus("Loading database...");

    (async () => {
      try {
        const nextDb = await createWorkspaceDb();
        if (!alive) return;

        setDb(nextDb);
        setDbStatus("ready");
        setRunStatus("");
      } catch (e) {
        if (!alive) return;

        setDbStatus("error");
        setError(e?.message || "Failed to load database.");
        setRunStatus("Database failed to load.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!db || !workspaceLoaded) return;
    if (restoredDbsRef.current.has(db)) return;

    const restored = replaceDbContents(db, workspaceTables);
    if (!restored.ok) {
      setError(restored.error || "Failed to rebuild workspace.");
      return;
    }

    restoredDbsRef.current.add(db);
  }, [db, workspaceLoaded, workspaceTables]);

  function handleClearAll() {
    setQuery("");
    setRunStatus("");
    setTab("results");
    setResult({ columns: [], rows: [] });
    setBreakdownSteps([]);
    setError("");
    setSchemaStatus("");
    setChallengeStatus("");
  }

  function handleFormat() {
    setQuery((q) => formatSql(q));
  }

  async function syncWorkspace(currentDb = db) {
    if (!currentDb) {
      return { ok: false, error: "Database not ready yet." };
    }

    const tables = snapshotDb(currentDb);

    try {
      const docs = await apiPost("/tables/sync", { clientId, tables });
      setWorkspaceTables(Array.isArray(docs) ? docs : []);
      return { ok: true, tables: docs };
    } catch (e) {
      return { ok: false, error: e?.message || "Failed to save tables." };
    }
  }

  async function replaceWorkspaceWithTables(tables, nextQuery = "") {
    const normalizedTables = Array.isArray(tables) ? tables : [];

    setError("");
    setSchemaStatus("");
    setRunStatus("Loading challenge...");
    setDbStatus("loading");

    try {
      const fresh = await createWorkspaceDb();
      const restored = replaceDbContents(fresh, normalizedTables);
      if (!restored.ok) {
        throw new Error(restored.error || "Failed to load challenge workspace.");
      }

      setWorkspaceTables(normalizedTables);
      setDb(fresh);
      setDbStatus("ready");
      setQuery(String(nextQuery || ""));
      setResult({ columns: [], rows: [] });
      setSchemaStatus("");
      setTab("challenge");

      const synced = await syncWorkspace(fresh);
      if (!synced.ok) {
        setError(synced.error || "Challenge loaded locally, but workspace save failed.");
        setChallengeStatus("Challenge loaded locally, but workspace save failed ✗");
        return false;
      }

      setChallengeStatus("Challenge loaded ✓");
      return true;
    } catch (e) {
      setDbStatus("error");
      setError(e?.message || "Failed to load challenge.");
      setChallengeStatus("Challenge load failed ✗");
      return false;
    } finally {
      setRunStatus("");
    }
  }

  function applySqlLocally(sql) {
    setError("");

    if (!db) {
      setError("Database not ready yet.");
      setTab("results");
      return "failed";
    }

    if (!String(sql || "").trim()) return "failed";

    try {
      db.run(sql);
      return "applied";
    } catch (e) {
      const msg = e?.message || "";

      if (/already exists/i.test(msg)) {
        return "already";
      }

      setError(msg);
      setTab("results");
      return "failed";
    }
  }

  async function handleRun() {
    setError("");
    setBreakdownSteps(generateQueryBreakdown(query));

    if (!db) {
      setError("Database not ready yet.");
      setTab("results");
      return;
    }

    let nextRunStatus = "";
    setRunStatus("Running query...");

    try {
      const execRes = run(db, query);

      if (execRes?.error) {
        setError(execRes.error);
        setResult({ columns: [], rows: [] });
        setTab("results");
        return;
      }

      setResult(execRes);
      setTab("results");

      if (isLikelyMutatingSql(query)) {
        const synced = await syncWorkspace(db);
        if (!synced.ok) {
          nextRunStatus = "Query ran, but saving tables failed.";
          setSchemaStatus("Workspace changed locally, but Mongo save failed ✗");
        } else {
          setSchemaStatus("Workspace saved ✓");
        }
      }
    } catch (e) {
      setError(e?.message || "Run failed.");
      setTab("results");
    } finally {
      setRunStatus(nextRunStatus);
    }
  }

  async function handleExportWorkspace() {
    setError("");
    setSchemaStatus("");

    if (!db) {
      setError("Database not ready yet.");
      setSchemaStatus("Workspace export failed ✗");
      return false;
    }

    try {
      const sqlText = snapshotToSql(snapshotDb(db));
      downloadTextFile("sqlvision-workspace.sql", sqlText);
      setSchemaStatus("Workspace exported ✓");
      return true;
    } catch (e) {
      setError(e?.message || "Failed to export workspace.");
      setSchemaStatus("Workspace export failed ✗");
      return false;
    }
  }

  async function handleImportWorkspace(file) {
    if (!file) return false;

    const confirmed = window.confirm(
      "Importing a workspace will replace your current workspace. Continue?"
    );
    if (!confirmed) return false;

    setError("");
    setSchemaStatus("");
    setRunStatus("Importing workspace...");
    setDbStatus("loading");

    try {
      const sqlText = String(await file.text() || "");
      if (!sqlText.trim()) {
        throw new Error("Import file is empty.");
      }

      const fresh = await createWorkspaceDb();
      fresh.exec(sqlText);

      const synced = await syncWorkspace(fresh);
      if (!synced.ok) {
        throw new Error(synced.error || "Imported locally, but workspace save failed.");
      }

      restoredDbsRef.current.add(fresh);
      setDb(fresh);
      setDbStatus("ready");
      setTab("schema");
      setQuery("");
      setResult({ columns: [], rows: [] });
      setBreakdownSteps([]);
      setSchemaStatus("Workspace imported and saved ✓");
      setChallengeStatus("");
      return true;
    } catch (e) {
      setDbStatus(db ? "ready" : "error");
      setError(e?.message || "Failed to import workspace.");
      setSchemaStatus("Workspace import failed ✗");
      return false;
    } finally {
      setRunStatus("");
    }
  }

  async function handleCreateTable(table) {
    setError("");
    setSchemaStatus("");

    const outcome = applySqlLocally(table?.sql || "");
    if (outcome === "failed") return { ok: false, outcome };

    const synced = await syncWorkspace(db);
    if (!synced.ok) {
      setError(synced.error || "Failed to save table.");
      setSchemaStatus("Table created locally, but Mongo save failed ✗");
      return { ok: false, outcome };
    }

    setSchemaStatus(outcome === "already" ? "Table already exists ✓" : "Table created and saved ✓");
    return { ok: true, outcome };
  }

  async function handlePersistWorkspace(successMessage, failureMessage) {
    setError("");

    const synced = await syncWorkspace(db);
    if (!synced.ok) {
      setError(synced.error || failureMessage);
      setSchemaStatus(failureMessage);
      return false;
    }

    setSchemaStatus(successMessage);
    return true;
  }

  async function handleCreateChallenge(draft) {
    setError("");
    setChallengeStatus("");

    const title = String(draft?.title || "").trim();
    const prompt = String(draft?.prompt || "").trim();
    const starterQuery = String(draft?.starterQuery || "");
    const expectedResult = {
      columns: Array.isArray(draft?.expectedResult?.columns) ? draft.expectedResult.columns : [],
      rows: Array.isArray(draft?.expectedResult?.rows) ? draft.expectedResult.rows : [],
    };
    const tables = db ? snapshotDb(db) : workspaceTables;

    if (!title) {
      setChallengeStatus("Challenge title is required.");
      return null;
    }

    if (!prompt) {
      setChallengeStatus("Challenge prompt is required.");
      return null;
    }

    if (!tables.length) {
      setChallengeStatus("Create at least one table before publishing a challenge.");
      return null;
    }

    if (!expectedResult.columns.length) {
      setChallengeStatus("Capture the expected output from Results before publishing.");
      return null;
    }

    try {
      const doc = await apiPost("/challenges", {
        clientId,
        title,
        prompt,
        starterQuery,
        tables,
        expectedResult,
      });

      setUserChallenges((prev) => [doc, ...prev.filter((item) => String(item._id) !== String(doc._id))]);
      setActiveChallenge(doc);
      setIsSharedChallengeMode(false);
      setChallengeStatus("Challenge created ✓");
      setTab("challenge");
      return doc;
    } catch (e) {
      setError(e?.message || "Failed to create challenge.");
      setChallengeStatus("Challenge create failed ✗");
      return null;
    }
  }

  function handleOpenChallenge(challenge) {
    setActiveChallenge(challenge || null);
    setIsSharedChallengeMode(false);
    setChallengeStatus("");
    setTab("challenge");
  }

  async function handleLoadChallenge(challenge) {
    if (!challenge) return false;
    const ok = window.confirm(
      "Loading this challenge will replace your current workspace. Continue?"
    );
    if (!ok) return false;
    setActiveChallenge(challenge);
    return replaceWorkspaceWithTables(challenge.tables, challenge.starterQuery || "");
  }

  function handleExitChallenge() {
    setActiveChallenge(null);
    setIsSharedChallengeMode(false);
    setChallengeStatus("Exited challenge mode.");
    setTab("challenge");
    clearChallengeParamFromUrl();
  }

  async function handleCopyChallengeLink(challenge) {
    const share = String(challenge?.shareKey || "").trim();
    if (!share) {
      setChallengeStatus("Challenge link is not available.");
      return;
    }

    const url = buildChallengeUrl(share);

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Ignore clipboard failures and still show the URL below.
      }
    }

    window.prompt("Challenge link", url);
    setChallengeStatus("Challenge link ready ✓");
  }

  async function handleDeleteChallenge(challenge) {
    const id = String(challenge?._id || challenge?.id || "").trim();
    if (!id) return;

    try {
      await apiDelete(`/challenges/${encodeURIComponent(id)}?clientId=${encodeURIComponent(clientId)}`);
      setUserChallenges((prev) => prev.filter((item) => String(item._id || item.id) !== id));
      if (String(activeChallenge?._id || activeChallenge?.id || "") === id) {
        setActiveChallenge(null);
        setIsSharedChallengeMode(false);
      }
      setChallengeStatus("Challenge deleted ✓");
    } catch (e) {
      setError(e?.message || "Failed to delete challenge.");
      setChallengeStatus("Challenge delete failed ✗");
    }
  }

  async function handleShare() {
    setError("");

    try {
      const tables = db ? snapshotDb(db) : workspaceTables;
      const res = await apiPost("/share", {
        query: String(query || ""),
        tables,
      });

      const key = String(res?.key || "").trim();
      if (!key) throw new Error("Share key was not returned.");

      const url = `${window.location.origin}${window.location.pathname}?${SHARE_QUERY_PARAM}=${encodeURIComponent(key)}`;

      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Ignore clipboard failures and still show the share URL below.
        }
      }

      window.prompt("Share this link", url);
    } catch (e) {
      setError(e?.message || "Failed to create share link.");
    }
  }

  async function handleResetDb() {
    setError("");
    setSchemaStatus("");
    setChallengeStatus("");
    setRunStatus("Resetting database...");
    setDbStatus("loading");

    try {
      const fresh = await createWorkspaceDb();
      setWorkspaceTables([]);
      setDb(fresh);
      setDbStatus("ready");
      setResult({ columns: [], rows: [] });
      setTab("results");

      const synced = await apiPost("/tables/sync", { clientId, tables: [] });
      setWorkspaceTables(Array.isArray(synced) ? synced : []);
      setSchemaStatus("Database reset ✓");
    } catch (e) {
      setDbStatus("error");
      setError(e?.message || "Failed to reset database.");
      setSchemaStatus("Database reset failed ✗");
    } finally {
      setRunStatus("");
    }
  }

  return (
    <div className="shell">
      <TopBar
        onRun={handleRun}
        runDisabled={!query.trim() || !db}
        onShare={handleShare}
        onOpenHelp={() => setShowHelp(true)}
        onOpenAbout={() => setShowAbout(true)}
      />

      <main className="layout">
        <QueryPanel
          query={query}
          setQuery={setQuery}
          runStatus={runStatus}
          onFormat={handleFormat}
          onClear={handleClearAll}
          dbReady={!!db}
          dbStatus={dbStatus}
        />

        <OutputPanel
          db={db}
          tab={tab}
          setTab={setTab}
          result={result}
          breakdownSteps={breakdownSteps}
          error={error}
          workspaceTables={workspaceTables}
          schemaStatus={schemaStatus}
          challengeStatus={challengeStatus}
          isSharedChallengeLink={isSharedChallengeMode}
          userChallenges={userChallenges}
          activeChallenge={activeChallenge}
          onResetDb={handleResetDb}
          dbReady={!!db}
          onCreateTable={handleCreateTable}
          onPersistWorkspace={handlePersistWorkspace}
          onCreateChallenge={handleCreateChallenge}
          onOpenChallenge={handleOpenChallenge}
          onLoadChallenge={handleLoadChallenge}
          onExitChallenge={handleExitChallenge}
          onCopyChallengeLink={handleCopyChallengeLink}
          onDeleteChallenge={handleDeleteChallenge}
          onExportWorkspace={handleExportWorkspace}
          onImportWorkspace={handleImportWorkspace}
        />
      </main>

      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <footer className="footer">
        © 2026 SQLVision · Built by Andri Hadiff Bin Mahadi ·
        <a
          href="https://git.cs.bham.ac.uk/projects-2025-26/axb1968"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source
        </a>
      </footer>
    </div>
  );
}
