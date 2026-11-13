import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every query against a business's data must say which business it is for.
 *
 * The runtime guard in `db/tenancy-guard.ts` catches a missed filter when the query
 * runs — but only if someone opens that screen. This reads the source instead, so a
 * query nobody exercised in testing is caught too.
 *
 * It exists because a one-line search was used to check the first tenancy sweep.
 * Most queries here are written across several lines, so it missed sixteen of them,
 * and the screens behind them (count approval, Ask Bintro, Smart par, the activity
 * feed) were dead until someone loaded them. This test reads each query whole.
 */

const ROOTS = ["src/server", "netlify/functions"];

/** Starts a query, in any of the shapes drizzle allows (`db.select`, `db\n  .select`). */
const QUERY = /\bdb\s*\.\s*(?:select|insert|update|delete)\b/g;

/**
 * Says which business it is for: `mine(table)` in the where clause, `owned()` or an
 * explicit `businessId` in the values, or one of the deliberate cross-business
 * lookups (`signInLookup` is a SQL comment carrying the marker — see auth.server.ts).
 */
const SCOPED = /\bmine\s*\(|\bowned\s*\(\)|businessId|business_id|cross-business|signInLookup/;

/** Tables every business shares, so they carry no business_id of their own. */
const SHARED = /\b(?:businesses|appSessions|app_sessions)\b/;

function serverFiles() {
  const found: string[] = [];
  for (const root of ROOTS) {
    for (const name of readdirSync(root)) {
      if (!/\.(ts|mts)$/.test(name) || name.includes(".test.")) continue;
      found.push(join(root, name));
    }
  }
  return found.sort();
}

/**
 * Where the statement starting at `from` ends: the first `;` outside any brackets,
 * string or comment. Brackets matter because a chain can carry a whole callback
 * (`.values(lines.map((l) => { … }))`) with semicolons of its own inside it.
 */
function statementEnd(source: string, from: number) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    const two = source.slice(i, i + 2);
    if (two === "//") {
      i = source.indexOf("\n", i);
      if (i === -1) return source.length;
      continue;
    }
    if (two === "/*") {
      const close = source.indexOf("*/", i + 2);
      i = close === -1 ? source.length : close + 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < source.length; i++) {
        if (source[i] === "\\") i++;
        else if (source[i] === c) break;
      }
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === ";" && depth <= 0) return i;
  }
  return source.length;
}

/**
 * Each query in the file, as the text a reader would have to check: the chain
 * itself, any comment lines directly above it, and — when the chain is held in a
 * variable and filtered further down (`const q = db.select(…)` … `q.where(mine(x))`)
 * — the lines that use that variable.
 */
function queries(source: string) {
  const lines = source.split("\n");
  return [...source.matchAll(QUERY)].map((m) => {
    const start = m.index;
    const chain = source.slice(start, statementEnd(source, start));
    const line = source.slice(0, start).split("\n").length;

    let first = line - 1; // 0-based index of the line the query starts on
    while (first > 0 && /^\s*(?:\/\/|\/\*|\*)/.test(lines[first - 1])) first -= 1;
    const comment = lines.slice(first, line - 1).join("\n");

    const held = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(source.slice(0, start).trimEnd());
    const later = held
      ? lines.filter((l) => new RegExp(`\\b${held[1]}\\b`).test(l) && l.includes(".where(")).join("\n")
      : "";

    return { line, text: [comment, chain, later].join("\n") };
  });
}

describe("every query says which business it is for", () => {
  const files = serverFiles();

  it("finds the server files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(file, "utf8");
    const missing = queries(source)
      .filter((q) => !SCOPED.test(q.text) && !SHARED.test(q.text))
      .map((q) => `${file}:${q.line}`);
    expect(
      missing,
      "add mine(table) to the where clause, owned() to the insert, or a /* cross-business: why */ comment — see src/server/tenant.ts",
    ).toEqual([]);
  });
});
