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
  const pk = cols.find((c) => Number(c.pk) === 1 || c.primary);
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

export function snapshotTable(db, tableName) {
  const columns = getTableColumns(db, tableName);
  if (!columns.length) return null;
  const createSql = getCreateTableSql(db, tableName);

  const normalizedColumns = columns.map((column) => ({
    name: column.name,
    type: String(column.type || "TEXT").trim().toUpperCase() || "TEXT",
    primary: Number(column.pk) === 1,
    notNull: Boolean(column.notnull),
    defaultValue:
      column.dflt_value === undefined || column.dflt_value === null
        ? null
        : String(column.dflt_value),
  }));

  const rowsData = getTableRows(db, tableName, 100000);
  const rows = (rowsData.rows || []).map((row) => {
    const next = {};
    rowsData.columns.forEach((columnName, index) => {
      next[columnName] = row[index] ?? null;
    });
    return next;
  });

  return {
    name: tableName,
    createSql,
    columns: normalizedColumns,
    rows,
  };
}

export function snapshotDb(db) {
  return listTables(db)
    .map((tableName) => snapshotTable(db, tableName))
    .filter(Boolean);
}

export function snapshotToSql(tables) {
  const items = Array.isArray(tables) ? tables : [];
  const lines = ["BEGIN TRANSACTION;"];

  for (const table of items) {
    const tableName = String(table?.name || "").trim();
    if (!tableName) continue;

    const createSql = String(table?.createSql || "").trim();
    if (createSql) {
      lines.push(ensureSqlEndsWithSemicolon(createSql));
    } else {
      const fallbackCreate = buildCreateSqlFromSnapshot(tableName, table?.columns);
      if (fallbackCreate) lines.push(fallbackCreate);
    }

    const columns = Array.isArray(table?.columns)
      ? table.columns
          .map((column) => String(column?.name || "").trim())
          .filter(Boolean)
      : [];
    const rows = Array.isArray(table?.rows) ? table.rows : [];

    if (!columns.length || !rows.length) continue;

    const colSql = columns.map((name) => safeIdent(name)).join(", ");
    for (const row of rows) {
      const values = columns.map((name) => {
        const value = row && Object.prototype.hasOwnProperty.call(row, name) ? row[name] : null;
        return toSqlLiteral(value);
      });
      lines.push(`INSERT INTO ${safeIdent(tableName)} (${colSql}) VALUES (${values.join(", ")});`);
    }
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

export function replaceDbContents(db, tables) {
  if (!db) return { ok: false, error: "DB not ready." };

  try {
    const existing = listTables(db);
    for (const tableName of existing) {
      db.run(`DROP TABLE ${safeIdent(tableName)};`);
    }

    for (const table of Array.isArray(tables) ? tables : []) {
      createTableFromSnapshot(db, table);
      insertRowsFromSnapshot(db, table);
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Failed to rebuild workspace." };
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

function createTableFromSnapshot(db, table) {
  const tableName = String(table?.name || "").trim();
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  if (!tableName || !columns.length) return;

  const createSql = String(table?.createSql || "").trim();
  if (createSql) {
    db.run(createSql);
    return;
  }

  const defs = columns.map((column) => {
    const parts = [safeIdent(column.name), String(column.type || "TEXT").trim().toUpperCase() || "TEXT"];
    if (column.primary) parts.push("PRIMARY KEY");
    if (column.notNull) parts.push("NOT NULL");
    if (column.defaultValue !== undefined && column.defaultValue !== null && String(column.defaultValue) !== "") {
      parts.push(`DEFAULT ${String(column.defaultValue)}`);
    }
    return parts.join(" ");
  });

  db.run(`CREATE TABLE ${safeIdent(tableName)} (${defs.join(", ")});`);
}

function insertRowsFromSnapshot(db, table) {
  const tableName = String(table?.name || "").trim();
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!tableName || !columns.length || !rows.length) return;

  const columnNames = columns.map((column) => column.name);
  const colSql = columnNames.map((name) => safeIdent(name)).join(", ");
  const placeholders = columnNames.map(() => "?").join(", ");
  const sql = `INSERT INTO ${safeIdent(tableName)} (${colSql}) VALUES (${placeholders});`;

  for (const row of rows) {
    const params = columnNames.map((name, index) => {
      const raw = row && Object.prototype.hasOwnProperty.call(row, name) ? row[name] : null;
      return coerceValue(raw, columns[index]?.type);
    });
    db.run(sql, params);
  }
}

function safeIdent(name) {
  const s = String(name).replaceAll('"', '""');
  return `"${s}"`;
}

function getCreateTableSql(db, tableName) {
  try {
    const safeName = String(tableName).replaceAll("'", "''");
    const res = db.exec(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${safeName}' LIMIT 1;`
    );
    return res?.[0]?.values?.[0]?.[0] ? String(res[0].values[0][0]) : "";
  } catch {
    return "";
  }
}

function coerceValue(raw, type) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;

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

function ensureSqlEndsWithSemicolon(sql) {
  const trimmed = String(sql || "").trim().replace(/;+\s*$/, "");
  return `${trimmed};`;
}

function buildCreateSqlFromSnapshot(tableName, columns) {
  const defs = (Array.isArray(columns) ? columns : [])
    .map((column) => {
      const name = String(column?.name || "").trim();
      if (!name) return "";
      const parts = [safeIdent(name), String(column?.type || "TEXT").trim().toUpperCase() || "TEXT"];
      if (column?.primary) parts.push("PRIMARY KEY");
      if (column?.notNull) parts.push("NOT NULL");
      if (
        column?.defaultValue !== undefined &&
        column?.defaultValue !== null &&
        String(column.defaultValue).trim() !== ""
      ) {
        parts.push(`DEFAULT ${String(column.defaultValue)}`);
      }
      return parts.join(" ");
    })
    .filter(Boolean);

  if (!defs.length) return "";
  return `CREATE TABLE ${safeIdent(tableName)} (${defs.join(", ")});`;
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (value instanceof Uint8Array) {
    return `X'${toHex(value)}'`;
  }

  if (value instanceof ArrayBuffer) {
    return `X'${toHex(new Uint8Array(value))}'`;
  }

  if (typeof value === "object") {
    try {
      return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
    } catch {
      return `'${String(value).replaceAll("'", "''")}'`;
    }
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function toHex(bytes) {
  return Array.from(bytes || [])
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
