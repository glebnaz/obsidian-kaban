/**
 * Query splitting utility for Dataview queries.
 *
 * Splits a query like `FROM "Tasks" WHERE status != "archive"`
 * into source and WHERE parts. WHERE evaluation is delegated to Dataview's api.evaluate().
 */

/**
 * Split a query string like `FROM "Tasks" WHERE status != "archive"`
 * into { source: '"Tasks"', where: 'status != "archive"' }.
 */
export function splitQuery(query: string): { source: string; where: string } {
  // Remove leading FROM
  let rest = query.replace(/^\s*FROM\s+/i, "").trim();

  // Find WHERE boundary (not inside quotes)
  const whereIdx = findWhereIndex(rest);
  if (whereIdx === -1) {
    return { source: rest, where: "" };
  }

  const source = rest.slice(0, whereIdx).trim();
  const where = rest.slice(whereIdx + 5).trim(); // +5 for "WHERE"
  return { source, where };
}

function findWhereIndex(str: string): number {
  let inQuote: string | null = null;
  const upper = str.toUpperCase();

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === inQuote && str[i - 1] !== "\\") inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    // Check for WHERE keyword (preceded by space or start, followed by space)
    if (
      upper.slice(i, i + 5) === "WHERE" &&
      (i === 0 || /\s/.test(str[i - 1])) &&
      (i + 5 >= str.length || /\s/.test(str[i + 5]))
    ) {
      return i;
    }
  }
  return -1;
}
