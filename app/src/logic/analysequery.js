export function analyseQuery(q) {
  const s = q.trim().toLowerCase();

  if (!s) {
    return {
      steps: ["Enter a query to generate execution steps."],
      nodes: ["NO QUERY"],
    };
  }

  const hasWhere = /\bwhere\b/.test(s);
  const hasJoin = /\bjoin\b/.test(s);
  const hasGroup = /\bgroup\s+by\b/.test(s);
  const hasOrder = /\border\s+by\b/.test(s);
  const hasLimit = /\blimit\b/.test(s);

  const steps = [];
  const nodes = [];

  steps.push("Scan base table(s)");
  nodes.push("SCAN");

  if (hasJoin) {
    steps.push("Join tables");
    nodes.push("JOIN");
  }

  if (hasWhere) {
    steps.push("Filter rows (WHERE)");
    nodes.push("FILTER");
  }

  steps.push("Project selected columns (SELECT)");
  nodes.push("PROJECT");

  if (hasGroup) {
    steps.push("Aggregate groups (GROUP BY)");
    nodes.push("AGGREGATE");
  }

  if (hasOrder) {
    steps.push("Sort results (ORDER BY)");
    nodes.push("SORT");
  }

  if (hasLimit) {
    steps.push("Limit output rows (LIMIT)");
    nodes.push("LIMIT");
  }

  return { steps, nodes };
}
