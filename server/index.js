import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import WorkspaceTable from "./models/table.js";
import Share from "./models/share.js";
import Challenge from "./models/challenge.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/tables", async (req, res) => {
  const clientId = String(req.query.clientId || "").trim();
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const tables = await WorkspaceTable.find({ clientId }).sort({ name: 1 }).lean();
  res.json(tables);
});

app.post("/api/tables/sync", async (req, res) => {
  const clientId = String(req.body?.clientId || "").trim();
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const tables = normalizeTables(req.body?.tables);
  const names = tables.map((table) => table.name);

  await WorkspaceTable.deleteMany({
    clientId,
    ...(names.length ? { name: { $nin: names } } : {}),
  });

  if (!tables.length) {
    return res.json([]);
  }

  await Promise.all(
    tables.map((table) =>
      WorkspaceTable.findOneAndUpdate(
        { clientId, name: table.name },
        {
          $set: {
            createSql: table.createSql,
            columns: table.columns,
            rows: table.rows,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      )
    )
  );

  const docs = await WorkspaceTable.find({ clientId }).sort({ name: 1 }).lean();
  res.json(docs);
});

app.get("/api/challenges", async (req, res) => {
  const clientId = String(req.query.clientId || "").trim();
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const docs = await Challenge.find({ clientId }).sort({ createdAt: -1 }).lean();
  res.json(docs);
});

app.post("/api/challenges", async (req, res) => {
  const clientId = String(req.body?.clientId || "").trim();
  const title = String(req.body?.title || "").trim();
  const prompt = String(req.body?.prompt || "").trim();
  const starterQuery = String(req.body?.starterQuery || "");
  const tables = normalizeTables(req.body?.tables);
  const expectedResult = normalizeExpectedResult(req.body?.expectedResult);

  if (!clientId) return res.status(400).json({ error: "clientId required" });
  if (!title) return res.status(400).json({ error: "title required" });
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  if (!tables.length) return res.status(400).json({ error: "Challenge needs at least one table." });
  if (!expectedResult.columns.length) {
    return res.status(400).json({ error: "Capture an expected output before creating the challenge." });
  }

  const doc = await Challenge.create({
    clientId,
    title,
    prompt,
    starterQuery,
    shareKey: await generateChallengeKey(),
    tables,
    expectedResult,
  });

  res.json(doc);
});

app.get("/api/challenges/share/:shareKey", async (req, res) => {
  const shareKey = String(req.params.shareKey || "").trim();
  if (!shareKey) return res.status(400).json({ error: "shareKey required" });

  const doc = await Challenge.findOne({ shareKey }).lean();
  if (!doc) return res.status(404).json({ error: "Challenge not found" });

  res.json(doc);
});

app.delete("/api/challenges/:id", async (req, res) => {
  const clientId = String(req.query.clientId || "").trim();
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "id required" });

  const deleted = await Challenge.findOneAndDelete({ _id: id, clientId });
  if (!deleted) return res.status(404).json({ error: "Challenge not found" });

  res.json({ ok: true });
});

app.post("/api/share", async (req, res) => {
  const query = String(req.body?.query || "");
  const tables = normalizeTables(req.body?.tables);

  const payload = { query, tables };
  const raw = JSON.stringify(payload);
  const key = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 20);

  await Share.findOneAndUpdate(
    { key },
    { key, ...payload },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.json({ key });
});

app.get("/api/share/:key", async (req, res) => {
  const key = String(req.params.key || "").trim();
  if (!key) return res.status(400).json({ error: "key required" });

  const doc = await Share.findOne({ key }).lean();
  if (!doc) return res.status(404).json({ error: "Share not found" });

  res.json({
    key: doc.key,
    query: doc.query || "",
    tables: Array.isArray(doc.tables) ? doc.tables : [],
    updatedAt: doc.updatedAt,
  });
});

function normalizeTables(input) {
  const seen = new Set();
  const tablesIn = Array.isArray(input) ? input : [];

  return tablesIn
    .map((table) => normalizeTable(table))
    .filter((table) => {
      if (!table) return false;
      const key = table.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeTable(table) {
  const name = String(table?.name || "").trim();
  if (!name) return null;

  const columnsIn = Array.isArray(table?.columns) ? table.columns : [];
  const rowsIn = Array.isArray(table?.rows) ? table.rows : [];

  const seen = new Set();
  const columns = columnsIn
    .map((column) => ({
      name: String(column?.name || "").trim(),
      type: String(column?.type || "TEXT").trim().toUpperCase() || "TEXT",
      primary: Boolean(column?.primary),
      notNull: Boolean(column?.notNull),
      defaultValue:
        column?.defaultValue === undefined || column?.defaultValue === null
          ? null
          : String(column.defaultValue),
    }))
    .filter((column) => {
      if (!column.name) return false;
      const key = column.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!columns.length) return null;

  const columnNames = columns.map((column) => column.name);
  const createSql = String(table?.createSql || "").trim();
  const rows = rowsIn.map((row) => {
    const next = {};
    for (const name of columnNames) {
      const value = row && Object.prototype.hasOwnProperty.call(row, name) ? row[name] : null;
      next[name] = value === undefined ? null : value;
    }
    return next;
  });

  return { name, createSql, columns, rows };
}

function normalizeExpectedResult(input) {
  const columnsIn = Array.isArray(input?.columns) ? input.columns : [];
  const rowsIn = Array.isArray(input?.rows) ? input.rows : [];

  return {
    columns: columnsIn.map((column) => String(column || "")),
    rows: rowsIn.map((row) => (Array.isArray(row) ? row : [])),
  };
}

async function generateChallengeKey() {
  while (true) {
    const key = crypto.randomBytes(8).toString("hex");
    const exists = await Challenge.exists({ shareKey: key });
    if (!exists) return key;
  }
}

const clientDistPath = path.resolve(__dirname, "./public");

console.log("Serving frontend from:", clientDistPath);

app.use(express.static(clientDistPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
