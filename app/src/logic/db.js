import initSqlJs from "sql.js";

export async function createDemoDb() {
  const SQL = await initSqlJs({
    locateFile: (file) => `${import.meta.env.BASE_URL}${file}`,
  });

  const db = new SQL.Database();

  db.run(`
    CREATE TABLE students (id INTEGER, name TEXT, age INTEGER);
    INSERT INTO students VALUES
      (1,'Alice',21),
      (2,'Bob',23),
      (3,'Cara',20);

    CREATE TABLE dept (id INTEGER, name TEXT);
    INSERT INTO dept VALUES
      (1,'HR'),
      (2,'Sales'),
      (3,'IT');

    CREATE TABLE emp (id INTEGER, name TEXT, dept_id INTEGER, salary INTEGER);
    INSERT INTO emp VALUES
      (1,'Ava',2,1200),
      (2,'Ben',1,900),
      (3,'Cara',3,1500),
      (4,'Dion',2,1100),
      (5,'Eve',3,800),
      (6,'Finn',1,1300),
      (7,'Gina',2,2000);
  `);

  return db;
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
