import initSqlJs from "sql.js";

// Loads the WASM from a CDN; optional: host locally later
const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.wasm";

export async function createDemoDb() {
  const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
  const db = new SQL.Database();

  // demo schema + data
  db.run(`
    CREATE TABLE students (id INTEGER, name TEXT, age INTEGER);
    INSERT INTO students VALUES (1,'Alice',21), (2,'Bob',23), (3,'Cara',20);
  `);

  return db;
}

export function run(db, sql) {
  try {
    const res = db.exec(sql);        // [{columns:[], values:[[]]}] or []
    if (!res.length) return { columns: [], rows: [] };
    const { columns, values } = res[0];
    return { columns, rows: values };
  } catch (e) {
    return { error: e.message };
  }
}
