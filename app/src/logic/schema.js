export function listTables(db) {
  if (!db) return [];
  try {
    const res = db.exec(`
      SELECT name
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);
    if (!res.length) return [];
    return res[0].values.map((v) => v[0]);
  } catch {
    return [];
  }
}

export function getTableColumns(db, tableName) {
  if (!db || !tableName) return [];
  try {
    const res = db.exec(`PRAGMA table_info(${safeIdent(tableName)});`);
    if (!res.length) return [];
    return res[0].values.map((row) => ({
      cid: row[0],
      name: row[1],
      type: row[2],
      notnull: row[3],
      dflt_value: row[4],
      pk: row[5],
    }));
  } catch {
    return [];
  }
}

export function getPrimaryKeyColumn(cols) {
  if (!cols?.length) return null;
  const pk = cols.find((c) => Number(c.pk) === 1);
  return pk ? pk.name : null;
}

export function getTableRows(db, tableName, limit = 200) {
  if (!db || !tableName) return { columns: [], rows: [] };
  try {
    const rowidRes = db.exec(
      `SELECT rowid AS "__rowid__", * FROM ${safeIdent(tableName)} LIMIT ${Number(limit) || 200};`
    );
    if (!rowidRes.length) return { columns: [], rows: [], rowids: [] };

    const rowids = rowidRes[0].values.map((v) => v[0]);
    const rows = rowidRes[0].values.map((v) => v.slice(1));
    const columns = rowidRes[0].columns.slice(1);

    return { columns, rows, rowids };
  } catch (e) {
    try {
      const fallback = db.exec(
        `SELECT * FROM ${safeIdent(tableName)} LIMIT ${Number(limit) || 200};`
      );
      if (!fallback.length) return { columns: [], rows: [], rowids: [] };
      return { columns: fallback[0].columns, rows: fallback[0].values, rowids: [] };
    } catch (inner) {
      return {
        columns: [],
        rows: [],
        rowids: [],
        error: inner?.message || e?.message || "Failed to read table.",
      };
    }
  }
}

export function insertRow(db, tableName, cols, valuesByName) {
  if (!db || !tableName) return { ok: false, error: "DB not ready." };
  const columns = (cols || []).map((c) => c.name);
  if (!columns.length) return { ok: false, error: "No columns." };

  const insertCols = [];
  const params = [];

  for (const c of cols) {
    const name = c.name;
    const raw = valuesByName?.[name];

    if (raw === undefined) continue;

    insertCols.push(name);
    params.push(coerceValue(raw, c.type));
  }

  if (!insertCols.length) {
    return { ok: false, error: "Fill at least one value." };
  }

  const colSql = insertCols.map((n) => safeIdent(n)).join(", ");
  const placeholders = insertCols.map(() => "?").join(", ");
  const sql = `INSERT INTO ${safeIdent(tableName)} (${colSql}) VALUES (${placeholders});`;

  try {
    db.run(sql, params);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Insert failed." };
  }
}

export function deleteRowByPk(db, tableName, pkName, pkValue) {
  if (!db || !tableName) return { ok: false, error: "DB not ready." };
  if (!pkName) return { ok: false, error: "No primary key found." };

  try {
    db.run(
      `DELETE FROM ${safeIdent(tableName)} WHERE ${safeIdent(pkName)} = ?;`,
      [pkValue]
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Delete failed." };
  }
}

export function deleteRowByRowid(db, tableName, rowid) {
  if (!db || !tableName) return { ok: false, error: "DB not ready." };
  if (rowid === undefined || rowid === null) return { ok: false, error: "Row ID missing." };

  try {
    db.run(`DELETE FROM ${safeIdent(tableName)} WHERE rowid = ?;`, [rowid]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Delete failed." };
  }
}

export function dropTable(db, tableName) {
  if (!db || !tableName) return { ok: false, error: "DB not ready." };
  try {
    db.run(`DROP TABLE ${safeIdent(tableName)};`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Drop failed." };
  }
}

function safeIdent(name) {
  const s = String(name).replaceAll('"', '""');
  return `"${s}"`;
}

function coerceValue(raw, type) {
  if (raw === null) return null;
  const s = String(raw);

  if (s.trim() === "") return null;

  const t = String(type || "").toUpperCase();

  if (t.includes("INT")) {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : s;
  }

  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB")) {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : s;
  }

  return s;
}
