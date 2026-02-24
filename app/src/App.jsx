import { useEffect, useRef, useState } from "react";
import "./App.css";

import AboutModal from "./components/about";
import HelpModal from "./components/help";

import TopBar from "./components/topbar";
import QueryPanel from "./components/querypanel";
import OutputPanel from "./components/outputpanel";

import { analyseQuery } from "./logic/analysequery";
import { formatSql } from "./logic/formatsql";
import { createDemoDb, run } from "./logic/db";

import { apiGet, apiPost, apiDelete } from "./logic/api";

const CLIENT_ID_KEY = "sqlvision:client_id";
const SHARE_QUERY_PARAM = "share";

const SQLITE_STARTER_QUERY = `SELECT name, age
FROM students
WHERE age >= 21
ORDER BY age DESC;`;

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

export default function App() {
  const [db, setDb] = useState(null);

  const [runStatus, setRunStatus] = useState("");
  const [planNodes, setPlanNodes] = useState([]);

  const [tab, setTab] = useState("results");
  const [query, setQuery] = useState("");

  const [setupSql, setSetupSql] = useState("");
  const [setupStatus, setSetupStatus] = useState("");
  const [setupName, setSetupName] = useState("");

  const [savedSetups, setSavedSetups] = useState([]);

  const [result, setResult] = useState({ columns: [], rows: [] });
  const [error, setError] = useState("");

  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [dbStatus, setDbStatus] = useState("loading");

  const clientId = getClientId();
  const [shareKey] = useState(() => {
    try {
      return new URLSearchParams(globalThis.location?.search || "").get(SHARE_QUERY_PARAM) || "";
    } catch {
      return "";
    }
  });
  const restoredDbsRef = useRef(new WeakSet());

  useEffect(() => {
    setQuery((q) => (q.trim() ? q : SQLITE_STARTER_QUERY));
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadClientSetups() {
      try {
        const data = await apiGet(`/setups?clientId=${encodeURIComponent(clientId)}`);
        if (!alive) return;
        setSavedSetups(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setSavedSetups([]);
      }
    }

    (async () => {
      if (shareKey) {
        try {
          const data = await apiGet(`/share/${encodeURIComponent(shareKey)}`);
          if (!alive) return;

          const when = data?.updatedAt || Date.now();
          const sharedSetups = Array.isArray(data?.setups)
            ? data.setups.map((s, i) => ({
                id: `share_${shareKey}_${i}`,
                name: String(s?.name || `Shared setup ${i + 1}`),
                sql: String(s?.sql || ""),
                createdAt: when,
              }))
            : [];

          setSavedSetups(sharedSetups);

          const sharedQuery = String(data?.query || "").trim();
          if (sharedQuery) setQuery(sharedQuery);
          return;
        } catch (e) {
          if (!alive) return;
          setError(e?.message || "Failed to load shared link.");
        }
      }

      await loadClientSetups();
    })();

    return () => {
      alive = false;
    };
  }, [clientId, shareKey]);

  useEffect(() => {
    let alive = true;

    setDbStatus("loading");
    setRunStatus("Loading database...");

    (async () => {
      try {
        const demo = await createDemoDb();
        if (!alive) return;

        setDb(demo);
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
    if (!db || !savedSetups.length) return;
    if (restoredDbsRef.current.has(db)) return;

    const ordered = shareKey ? savedSetups : [...savedSetups].reverse();

    for (const item of ordered) {
      const sql = String(item?.sql || "").trim();
      if (!sql) continue;
      try {
        db.run(sql);
      } catch (e) {
        const msg = e?.message || "";
        if (!/already exists/i.test(msg)) {
          console.warn("Skipped setup restore:", msg);
        }
      }
    }

    restoredDbsRef.current.add(db);
  }, [db, savedSetups, shareKey]);

  function handleClearAll() {
    setQuery("");
    setSetupSql("");
    setSetupName("");
    setPlanNodes([]);
    setRunStatus("");
    setTab("results");
    setResult({ columns: [], rows: [] });
    setError("");
    setSetupStatus("");
  }

  function handleFormat() {
    setQuery((q) => formatSql(q));
  }

  function handleRun() {
    setError("");

    if (!db) {
      setError("Database not ready yet.");
      setTab("results");
      return;
    }

    setRunStatus("Running query...");

    try {
      const execRes = run(db, query);

      if (execRes?.error) {
        setError(execRes.error);
        setResult({ columns: [], rows: [] });
        setPlanNodes([]);
        setTab("results");
        return;
      }

      setResult(execRes);
      const { nodes } = analyseQuery(query);
      setPlanNodes(Array.isArray(nodes) ? nodes : []);
      setTab("results");
    } catch (e) {
      setError(e?.message || "Run failed.");
      setTab("results");
    } finally {
      setRunStatus("");
    }
  }

  function applySetupSql(sql) {
    setError("");
    setSetupStatus("");

    if (!db) {
      setError("Database not ready yet.");
      setTab("results");
      return "failed";
    }

    if (!sql.trim()) return "failed";

    try {
      db.run(sql);
      setSetupStatus("Setup applied ✓");
      return "applied";
    } catch (e) {
      const msg = e?.message || "";

      if (/already exists/i.test(msg)) {
        setSetupStatus("Setup already applied ✓");
        return "already";
      }

      setError(msg);
      setSetupStatus("Setup failed ✗");
      setTab("results");
      return "failed";
    }
  }

  async function handleSaveSetup() {
    setSetupStatus("");
    setError("");

    const sql = setupSql.trim();
    if (!sql) {
      setSetupStatus("Nothing to save (Setup SQL is empty).");
      return;
    }

    const name = setupName.trim() || "Untitled setup";

    try {
      const doc = await apiPost("/setups", { clientId, name, sql });
      setSavedSetups((prev) => [doc, ...prev]);
      setSetupStatus("Saved setup ✓");
      setSetupName("");
    } catch (e) {
      setSetupStatus("Save failed ✗");
      setError(e?.message || "Save failed.");
    }
  }

  function handleApplySavedSetup(id) {
    const item = savedSetups.find((x) => String(x._id || x.id) === String(id));
    if (!item) return;

    setSetupSql(item.sql);
    applySetupSql(item.sql);
  }

  async function handleDeleteSavedSetup(id) {
    const sid = String(id);
    if (sid.startsWith("share_")) {
      setSavedSetups((prev) => prev.filter((x) => String(x._id || x.id) !== sid));
      return true;
    }

    try {
      await apiDelete(`/setups/${encodeURIComponent(sid)}?clientId=${encodeURIComponent(clientId)}`);
      setSavedSetups((prev) => prev.filter((x) => String(x._id || x.id) !== sid));
      return true;
    } catch (e) {
      setError(e?.message || "Delete failed.");
      return false;
    }
  }

  async function handleDeleteTableSetup(tableName) {
    const t = String(tableName || "").trim().toLowerCase();
    if (!t) return;

    const matches = savedSetups.filter(
      (x) => String(x?.name || "").trim().toLowerCase() === t
    );
    if (!matches.length) return;

    const failed = [];

    for (const item of matches) {
      const sid = String(item?._id || item?.id || "");
      if (!sid || sid.startsWith("share_")) continue;

      try {
        await apiDelete(`/setups/${encodeURIComponent(sid)}?clientId=${encodeURIComponent(clientId)}`);
      } catch {
        failed.push(sid);
      }
    }

    setSavedSetups((prev) =>
      prev.filter((x) => String(x?.name || "").trim().toLowerCase() !== t)
    );

    if (failed.length) {
      setError("Deleted table locally, but failed to delete some saved setup entries.");
    }
  }

  async function handleCreateTableSetup(tableName, sql) {
    setError("");
    setSetupStatus("");

    const outcome = applySetupSql(sql);
    if (outcome === "failed") return { ok: false, outcome };

    try {
      const name = String(tableName || "").trim() || "Untitled";
      const doc = await apiPost("/setups", { clientId, name, sql });
      setSavedSetups((prev) => [doc, ...prev]);
      setSetupStatus(outcome === "already" ? "Setup already applied ✓" : "Saved setup ✓");
      return { ok: true, outcome };
    } catch (e) {
      setSetupStatus("Save failed ✗");
      setError(e?.message || "Failed to save setup to server.");
      return { ok: false, outcome };
    }
  }

  async function handleShare() {
    setError("");
    try {
      const setups = (savedSetups || [])
        .map((s) => ({
          name: String(s?.name || "Untitled setup"),
          sql: String(s?.sql || "").trim(),
        }))
        .filter((s) => s.sql);

      const res = await apiPost("/share", {
        query: String(query || ""),
        setups,
      });

      const key = String(res?.key || "").trim();
      if (!key) throw new Error("Share key was not returned.");

      const url = `${window.location.origin}${window.location.pathname}?${SHARE_QUERY_PARAM}=${encodeURIComponent(key)}`;

      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      }

      window.prompt("Share this link", url);
    } catch (e) {
      setError(e?.message || "Failed to create share link.");
    }
  }

  async function handleResetDb() {
    setError("");
    setSetupStatus("");
    setRunStatus("Resetting database...");
    setDbStatus("loading");

    try {
      const fresh = await createDemoDb();
      setDb(fresh);
      setDbStatus("ready");

      setResult({ columns: [], rows: [] });
      setPlanNodes([]);
      setTab("results");

      setSetupStatus("Database reset ✓");
    } catch (e) {
      setDbStatus("error");
      setError(e?.message || "Failed to reset database.");
      setSetupStatus("Database reset failed ✗");
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
          planNodes={planNodes}
          result={result}
          error={error}
          setupSql={setupSql}
          setSetupSql={setSetupSql}
          setupStatus={setupStatus}
          setupName={setupName}
          setSetupName={setSetupName}
          onSaveSetup={handleSaveSetup}
          savedSetups={savedSetups}
          onApplySavedSetup={handleApplySavedSetup}
          onDeleteSavedSetup={handleDeleteSavedSetup}
          onDeleteTableSetup={handleDeleteTableSetup}
          onResetDb={handleResetDb}
          dbReady={!!db}
          onCreateTableSetup={handleCreateTableSetup}
        />
      </main>

      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      <footer className="footer">
        <span>© {new Date().getFullYear()} SQLVision · UI skeleton</span>
      </footer>
    </div>
  );
}
