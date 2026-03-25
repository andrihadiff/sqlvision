import initSqlJs from "sql.js";

let sqlJsPromise;

export const STARTER_DEMO_SQL = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO customers (id, name, city) VALUES
  (1, 'Alice Tan', 'London'),
  (2, 'Ben Carter', 'Birmingham'),
  (3, 'Chloe Lim', 'Manchester'),
  (4, 'Daniel Wong', 'Leeds'),
  (5, 'Emma Smith', 'Bristol'),
  (6, 'Faris Rahman', 'Glasgow');

INSERT INTO orders (id, customer_id, order_date, total_amount) VALUES
  (1, 1, '2026-03-01', 120.00),
  (2, 2, '2026-03-02', 75.50),
  (3, 3, '2026-03-03', 210.00),
  (4, 1, '2026-03-05', 45.99),
  (5, 4, '2026-03-06', 89.99),
  (6, 5, '2026-03-07', 150.00),
  (7, 6, '2026-03-08', 60.00),
  (8, 2, '2026-03-10', 135.49),
  (9, 3, '2026-03-11', 49.90),
  (10, 5, '2026-03-12', 300.00);

INSERT INTO order_items (id, order_id, product_name, quantity, price) VALUES
  (1, 1, 'Mechanical Keyboard', 1, 120.00),
  (2, 2, 'Wireless Mouse', 1, 25.50),
  (3, 2, 'USB-C Cable', 2, 25.00),
  (4, 3, 'Monitor', 1, 210.00),
  (5, 4, 'Laptop Stand', 1, 45.99),
  (6, 5, 'Webcam', 1, 89.99),
  (7, 6, 'Headphones', 1, 90.00),
  (8, 6, 'Mouse Pad', 2, 30.00),
  (9, 7, 'USB Hub', 1, 60.00),
  (10, 8, 'Keyboard', 1, 85.49),
  (11, 8, 'Desk Lamp', 1, 50.00),
  (12, 9, 'Notebook', 5, 9.98),
  (13, 10, 'Office Chair', 1, 220.00),
  (14, 10, 'Foot Rest', 1, 40.00),
  (15, 10, 'Cable Organizer', 4, 10.00);
`;

export const STARTER_DEMO_QUERY = "SELECT * FROM customers;";

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

export function seedStarterDemoWorkspace(db) {
  if (!db) return { ok: false, error: "Database not ready yet." };

  try {
    db.exec(STARTER_DEMO_SQL);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Failed to load starter demo data." };
  }
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
