import initSqlJs from "sql.js";

let sqlJsPromise;

async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}${file}`,
    });
  }
  return sqlJsPromise;
}

export async function createWorkspaceDb() {
  const SQL = await getSqlJs();
  return new SQL.Database();
}

export function run(db, sql) {
  try {
    const res = db.exec(sql);
    if (!res.length) return { columns: [], rows: [] };
    const { columns, values } = res[0];
    return { columns, rows: values };
  } catch (e) {
    return { error: e.message };
  }
}
