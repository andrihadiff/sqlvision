export const STEP_INFO = {
  SCAN: {
    title: "Scan",
    body:
      "Reads rows from the source table(s). This produces the initial stream of rows that later operations will filter or reshape.",
    tip:
      "SQL is written starting with SELECT, but execution typically begins from FROM."
  },
  JOIN: {
    title: "Join",
    body:
      "Combines rows from two tables using a join condition. Output size depends on how many rows match.",
    tip:
      "JOIN conditions affect both correctness and performance."
  },
  FILTER: {
    title: "Filter (WHERE)",
    body:
      "Keeps only rows that satisfy the WHERE condition. This usually reduces the number of rows passed to later steps.",
    tip:
      "Filtering affects rows, not columns."
  },
  PROJECT: {
    title: "Project (SELECT columns)",
    body:
      "Selects which columns to output. This changes the shape (columns) of the data, typically without changing row count.",
    tip:
      "Projection affects columns, not rows."
  },
  AGGREGATE: {
    title: "Aggregate (GROUP BY)",
    body:
      "Groups rows and computes aggregates like COUNT, SUM, AVG. This often reduces many rows into fewer grouped rows.",
    tip:
      "After GROUP BY, you typically keep grouped columns + aggregates."
  },
  SORT: {
    title: "Sort (ORDER BY)",
    body:
      "Orders the output rows based on one or more columns. Sorting can be expensive for large datasets.",
    tip:
      "ORDER BY happens late because you sort the final result."
  },
  LIMIT: {
    title: "Limit",
    body:
      "Restricts the number of rows returned. Often used with ORDER BY to return the top N rows.",
    tip:
      "LIMIT without ORDER BY can return arbitrary rows."
  },
  "NO QUERY": {
    title: "No query",
    body: "Enter a query and click Run to generate an execution plan.",
    tip: ""
  }
};
