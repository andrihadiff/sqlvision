export function analyseQuery(q) {
  const s = q.trim().toLowerCase();

  if (!s) {
    return { nodes: [] };
  }

  const looksLikeSql =
    /\bselect\b/.test(s) ||
    /\binsert\b/.test(s) ||
    /\bupdate\b/.test(s) ||
    /\bdelete\b/.test(s) ||
    /\bcreate\b/.test(s) ||
    /\bdrop\b/.test(s);

  if (!looksLikeSql) {
    return { nodes: ["INVALID"] };
  }

  const hasWhere = /\bwhere\b/.test(s);
  const hasJoin = /\bjoin\b/.test(s);
  const hasGroup = /\bgroup\s+by\b/.test(s);
  const hasOrder = /\border\s+by\b/.test(s);
  const hasLimit = /\blimit\b/.test(s);

  const nodes = [];

  nodes.push("SCAN");

  if (hasJoin) {
    nodes.push("JOIN");
  }

  if (hasWhere) {
    nodes.push("FILTER");
  }

  nodes.push("PROJECT");

  if (hasGroup) {
    nodes.push("AGGREGATE");
  }

  if (hasOrder) {
    nodes.push("SORT");
  }

  if (hasLimit) {
    nodes.push("LIMIT");
  }

  return { nodes };
}
