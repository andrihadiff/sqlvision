const FALLBACK = ["No execution breakdown available."];

export function generateQueryBreakdown(sql) {
  try {
    const statement = getLastStatement(sql);
    if (!statement) return FALLBACK;

    const upper = statement.toUpperCase();
    if (/^(WITH|SELECT)\b/.test(upper)) return buildSelectBreakdown(statement);
    if (/^INSERT\b/.test(upper)) return buildInsertBreakdown(statement);
    if (/^UPDATE\b/.test(upper)) return buildUpdateBreakdown(statement);
    if (/^DELETE\b/.test(upper)) return buildDeleteBreakdown(statement);
    if (/^CREATE\s+TABLE\b/.test(upper)) return buildCreateTableBreakdown(statement);
    if (/^DROP\s+TABLE\b/.test(upper)) return buildDropTableBreakdown(statement);

    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function buildSelectBreakdown(statement) {
  const steps = [];
  const compact = toCompactSql(statement);
  const selectStart = Math.max(indexOfMainSelect(compact), 0);
  const selectCols = readSelectColumns(compact, selectStart);
  const from = readClause(compact, "FROM", ["WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT"], selectStart);
  const joins = readJoins(from);
  const where = readClause(compact, "WHERE", ["GROUP BY", "HAVING", "ORDER BY", "LIMIT"], selectStart);
  const groupBy = readClause(compact, "GROUP BY", ["HAVING", "ORDER BY", "LIMIT"], selectStart);
  const having = readClause(compact, "HAVING", ["ORDER BY", "LIMIT"], selectStart);
  const orderBy = readClause(compact, "ORDER BY", ["LIMIT"], selectStart);
  const limit = readClause(compact, "LIMIT", [], selectStart);

  if (from) {
    const firstSource = splitTopLevel(from, ",")[0];
    const sourceName = cleanSourceName(firstSource);
    if (sourceName) steps.push(`Read table: ${sourceName}`);
  }

  for (const join of joins) {
    const joinLabel = join.type ? `${join.type} join` : "Join";
    steps.push(`${joinLabel} with table: ${join.source}`);
  }

  if (where) {
    steps.push(`Filter rows where ${truncate(where)}`);
  }

  if (groupBy) {
    steps.push(`Group rows by ${truncate(groupBy)}`);
  }

  const aggregates = readAggregateFunctions(selectCols);
  for (const agg of aggregates) {
    steps.push(`Calculate ${agg} for each group`);
  }

  if (having) {
    steps.push(`Filter groups where ${truncate(having)}`);
  }

  if (orderBy) {
    steps.push(`Sort rows by ${truncate(orderBy)}`);
  }

  if (limit) {
    const match = limit.match(/^(\d+)/);
    if (match) {
      steps.push(`Return first ${match[1]} rows`);
    } else {
      steps.push(`Apply row limit: ${truncate(limit)}`);
    }
  } else {
    const selection = normalizeSelectColumns(selectCols);
    if (selection === "*") {
      steps.push("Return all selected columns");
    } else if (selection) {
      steps.push(`Return selected columns: ${truncate(selection)}`);
    } else {
      steps.push("Return selected rows");
    }
  }

  return steps.length ? steps : FALLBACK;
}

function buildInsertBreakdown(statement) {
  const compact = toCompactSql(statement);
  const steps = [];
  const insertMatch = compact.match(
    /^INSERT\s+(?:OR\s+\w+\s+)?INTO\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(]+))(?:\s*\(([^)]+)\))?/i
  );

  const table = cleanSourceName(insertMatch?.[1] || "");
  if (!table) return FALLBACK;

  steps.push(`Insert rows into table: ${table}`);

  const columns = String(insertMatch?.[2] || "").trim();
  if (columns) {
    steps.push(`Target columns: ${truncate(columns)}`);
  }

  if (/\bVALUES\b/i.test(compact)) {
    steps.push("Add provided row values");
  } else if (/\bSELECT\b/i.test(compact)) {
    steps.push("Insert rows returned by a SELECT query");
  } else {
    steps.push("Insert rows using the provided statement");
  }

  return steps;
}

function buildUpdateBreakdown(statement) {
  const compact = toCompactSql(statement);
  const steps = [];
  const tableMatch = compact.match(/^UPDATE\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s]+))/i);
  const table = cleanSourceName(tableMatch?.[1] || "");
  if (!table) return FALLBACK;

  steps.push(`Update table: ${table}`);

  const setClause = readClause(compact, "SET", ["WHERE", "ORDER BY", "LIMIT"]);
  if (setClause) {
    steps.push(`Set values: ${truncate(setClause)}`);
  }

  const where = readClause(compact, "WHERE", ["ORDER BY", "LIMIT"]);
  if (where) {
    steps.push(`Filter rows where ${truncate(where)}`);
  } else {
    steps.push("Apply updates to all rows");
  }

  return steps;
}

function buildDeleteBreakdown(statement) {
  const compact = toCompactSql(statement);
  const steps = [];
  const deleteMatch = compact.match(/^DELETE\s+FROM\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s]+))/i);
  const table = cleanSourceName(deleteMatch?.[1] || "");
  if (!table) return FALLBACK;

  steps.push(`Delete rows from table: ${table}`);

  const where = readClause(compact, "WHERE", ["ORDER BY", "LIMIT"]);
  if (where) {
    steps.push(`Filter rows where ${truncate(where)}`);
  } else {
    steps.push("Delete all rows in the table");
  }

  return steps;
}

function buildCreateTableBreakdown(statement) {
  const compact = toCompactSql(statement);
  const match = compact.match(
    /^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(]+))/i
  );
  const table = cleanSourceName(match?.[1] || "");
  if (!table) return FALLBACK;

  const steps = [`Create table: ${table}`];
  const defMatch = compact.match(/\(([\s\S]+)\)$/);
  if (defMatch?.[1]) {
    steps.push(`Define columns and constraints: ${truncate(defMatch[1])}`);
  }
  return steps;
}

function buildDropTableBreakdown(statement) {
  const compact = toCompactSql(statement);
  const match = compact.match(
    /^DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s;]+))/i
  );
  const table = cleanSourceName(match?.[1] || "");
  if (!table) return FALLBACK;
  return [`Drop table: ${table}`];
}

function getLastStatement(sql) {
  const statements = splitStatements(sql);
  return statements.length ? statements[statements.length - 1] : "";
}

function splitStatements(sql) {
  const text = String(sql || "");
  const out = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && next === "-") {
        current += ch + next;
        i += 1;
        inLineComment = true;
        continue;
      }
      if (ch === "/" && next === "*") {
        current += ch + next;
        i += 1;
        inBlockComment = true;
        continue;
      }
    }

    if (ch === "'" && !inDouble && !inBacktick) {
      current += ch;
      if (inSingle && next === "'") {
        current += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (ch === '"' && !inSingle && !inBacktick) {
      current += ch;
      if (inDouble && next === '"') {
        current += next;
        i += 1;
      } else {
        inDouble = !inDouble;
      }
      continue;
    }

    if (ch === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }

    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      const part = current.trim();
      if (part) out.push(part);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

function readClause(sql, startKeyword, endKeywords, fromStart = 0) {
  const start = indexOfKeyword(sql, startKeyword, fromStart);
  if (start < 0) return "";

  let end = sql.length;
  const from = start + startKeyword.length;
  for (const endKeyword of endKeywords) {
    const idx = indexOfKeyword(sql, endKeyword, from);
    if (idx >= 0 && idx < end) {
      end = idx;
    }
  }

  return sql.slice(from, end).trim();
}

function readSelectColumns(sql, selectIdx) {
  const start = typeof selectIdx === "number" ? selectIdx : indexOfMainSelect(sql);
  if (start < 0) return "";
  const fromIdx = indexOfKeyword(sql, "FROM", start + "SELECT".length);
  const end = fromIdx >= 0 ? fromIdx : sql.length;
  return sql.slice(start + "SELECT".length, end).trim();
}

function indexOfMainSelect(sql) {
  const upper = sql.toUpperCase();
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < upper.length; i += 1) {
    const ch = upper[i];
    const next = upper[i + 1];

    if (ch === "'" && !inDouble && !inBacktick) {
      if (inSingle && next === "'") {
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      if (inDouble && next === '"') {
        i += 1;
      } else {
        inDouble = !inDouble;
      }
      continue;
    }
    if (ch === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      continue;
    }
    if (inSingle || inDouble || inBacktick) continue;

    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      continue;
    }

    if (depth === 0 && upper.startsWith("SELECT", i) && isWordBoundary(upper, i, i + 6)) {
      return i;
    }
  }
  return -1;
}

function readJoins(fromClause) {
  const parts = splitTopLevel(fromClause, " ");
  const joins = [];

  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    const tokenUpper = token.toUpperCase();
    const next = parts[i + 1] || "";
    const nextUpper = next.toUpperCase();

    let type = "";
    let sourceIndex = -1;

    if (tokenUpper === "JOIN") {
      sourceIndex = i + 1;
    } else if (["INNER", "LEFT", "RIGHT", "FULL", "CROSS"].includes(tokenUpper) && nextUpper === "JOIN") {
      type = tokenUpper;
      sourceIndex = i + 2;
    } else if (
      ["LEFT", "RIGHT", "FULL"].includes(tokenUpper) &&
      nextUpper === "OUTER" &&
      (parts[i + 2] || "").toUpperCase() === "JOIN"
    ) {
      type = `${tokenUpper} OUTER`;
      sourceIndex = i + 3;
    }

    if (sourceIndex >= 0 && parts[sourceIndex]) {
      const source = cleanSourceName(parts[sourceIndex]);
      if (source) joins.push({ type, source });
    }
  }

  return joins;
}

function readAggregateFunctions(selectCols) {
  if (!selectCols) return [];
  const seen = new Set();
  const out = [];
  const regex = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(([^)]*)\)/gi;
  let match = regex.exec(selectCols);

  while (match) {
    const fn = match[1].toUpperCase();
    const arg = (match[2] || "").trim() || "*";
    const label = `${fn}(${arg})`;
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
    match = regex.exec(selectCols);
  }

  return out;
}

function normalizeSelectColumns(value) {
  return String(value || "")
    .replace(/^DISTINCT\s+/i, "")
    .trim();
}

function toCompactSql(value) {
  return String(value || "")
    .replace(/;\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTopLevel(input, delimiter) {
  const text = String(input || "");
  const out = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "'" && !inDouble && !inBacktick) {
      current += ch;
      if (inSingle && next === "'") {
        current += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      current += ch;
      if (inDouble && next === '"') {
        current += next;
        i += 1;
      } else {
        inDouble = !inDouble;
      }
      continue;
    }
    if (ch === "`" && !inSingle && !inDouble) {
      current += ch;
      inBacktick = !inBacktick;
      continue;
    }
    if (inSingle || inDouble || inBacktick) {
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      current += ch;
      continue;
    }

    if (depth === 0 && delimiter === "," && ch === ",") {
      const part = current.trim();
      if (part) out.push(part);
      current = "";
      continue;
    }

    if (depth === 0 && delimiter === " " && /\s/.test(ch)) {
      const part = current.trim();
      if (part) out.push(part);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

function cleanSourceName(name) {
  let s = String(name || "").trim();
  if (!s) return "";
  s = s.replace(/[;,]$/g, "").trim();
  s = s.replace(/^["`[]/, "").replace(/["`\]]$/, "");
  return s;
}

function indexOfKeyword(sql, keyword, start = 0) {
  const upper = sql.toUpperCase();
  const key = String(keyword || "").toUpperCase();
  if (!key) return -1;

  let idx = upper.indexOf(key, Math.max(0, start));
  while (idx >= 0) {
    if (isWordBoundary(upper, idx, idx + key.length)) {
      return idx;
    }
    idx = upper.indexOf(key, idx + 1);
  }
  return -1;
}

function isWordBoundary(text, start, end) {
  const before = start > 0 ? text[start - 1] : " ";
  const after = end < text.length ? text[end] : " ";
  const isWord = (ch) => /[A-Z0-9_]/.test(ch);
  return !isWord(before) && !isWord(after);
}

function truncate(value, max = 140) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}
