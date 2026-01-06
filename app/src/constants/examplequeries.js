export const EXAMPLE_QUERIES = [
  {
    id: "basic",
    label: "Basic SELECT",
    sql: "SELECT name, age FROM students;"
  },
  {
    id: "where",
    label: "WHERE filter",
    sql: "SELECT name, age FROM students WHERE age > 20;"
  },
  {
    id: "join",
    label: "JOIN",
    sql: "SELECT e.name, d.name AS dept\nFROM emp e\nJOIN dept d ON e.dept_id = d.id;"
  },
  {
    id: "group",
    label: "GROUP BY",
    sql: "SELECT dept_id, COUNT(*) AS n\nFROM emp\nGROUP BY dept_id;"
  },
  {
    id: "full",
    label: "Full pipeline",
    sql: "SELECT d.name, COUNT(*) AS n\nFROM emp e\nJOIN dept d ON e.dept_id = d.id\nWHERE e.salary > 1000\nGROUP BY d.name\nORDER BY n DESC\nLIMIT 10;"
  }
];
