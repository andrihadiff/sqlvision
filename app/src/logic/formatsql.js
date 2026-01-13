const KEYWORDS = [
  "select",
  "from",
  "where",
  "join",
  "inner join",
  "left join",
  "right join",
  "full join",
  "group by",
  "order by",
  "having",
  "limit",
  "offset",
  "union",
  "union all",
  "distinct",
  "on",
  "and",
  "or",
  "as"
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uppercaseKeywords(sql) {
  let out = sql;

  const sorted = [...KEYWORDS].sort((a, b) => b.length - a.length);

  for (const kw of sorted) {
    const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "gi");
    out = out.replace(re, kw.toUpperCase());
  }
  return out;
}

function normalizeWhitespace(sql) {
  return sql
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addNewlines(sql) {
  const clauses = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "HAVING",
    "ORDER BY",
    "LIMIT",
    "OFFSET",
    "UNION",
    "UNION ALL"
  ];

  let out = sql;

  for (const c of clauses) {
    const re = new RegExp(`\\s*\\b${escapeRegex(c)}\\b\\s*`, "g");
    out = out.replace(re, `\n${c} `);
  }

  out = out
    .replace(/\s+\b(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN)\b\s+/g, "\n$1 ")
    .replace(/\s+\bON\b\s+/g, "\nON ");

  return out.trim().replace(/^\n+/, "");
}

export function formatSql(sql) {
  if (!sql || !sql.trim()) return sql;

  const cleaned = normalizeWhitespace(sql);
  const upper = uppercaseKeywords(cleaned);
  const lined = addNewlines(upper);

  return normalizeWhitespace(lined);
}
