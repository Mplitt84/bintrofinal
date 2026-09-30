/**
 * Bulk import from an uploaded inventory spreadsheet (CSV), or a PDF / photo of
 * a stock list, vendor invoice or receipt. Parses the file into line items,
 * matches them to existing products, and applies stock counts and price updates.
 * Server-only.
 */
import { applyMovement, findAllProducts, insertProduct, updateProductFields, type Product } from "./inventory.server.js";
import {
  CSV_FIELDS,
  extractImportDocument,
  mapCsvColumns,
  type CsvField,
  type CsvMapping,
  type ExtractedLine,
} from "./product-lookup.server.js";
import { MAX_IMPORT_LINES, type ImportLine, type ImportMode, type ImportSummary, type ParsedImport } from "../lib/bulk-import.js";

/** RFC 4180-ish CSV parser: quoted fields, escaped quotes, CRLF, and comma / semicolon / tab delimiters. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const HEADER_HINTS: Record<CsvField, RegExp> = {
  barcode: /barcode|upc|ean|gtin|isbn|sku|item.?(code|no|number|#)|plu/i,
  name: /name|product|description|item|title/i,
  brand: /brand|manufacturer|mfr|author|make/i,
  size: /size|volume|format/i,
  category: /categor|department|dept|type|group/i,
  vendor: /vendor|supplier|distributor/i,
  qty: /qty|quantity|on.?hand|count|stock|units|received|ordered|shipped/i,
  unit_cost: /cost|wholesale|unit.?price|net/i,
  retail_price: /retail|msrp|sell|sale.?price|^price$/i,
};

/** Fallback when AI isn't available: match header names by keyword. */
function guessMapping(header: string[]): CsvMapping {
  const used = new Set<number>();
  const columns = {} as Record<CsvField, number>;
  for (const f of CSV_FIELDS) {
    const idx = header.findIndex((h, i) => !used.has(i) && HEADER_HINTS[f].test(h));
    columns[f] = idx;
    if (idx >= 0) used.add(idx);
  }
  const receipt = columns.qty >= 0 && /received|ordered|shipped|invoice/i.test(header[columns.qty] ?? "");
  return { headerRow: 0, docType: receipt ? "receipt" : "inventory", columns };
}

function moneyToCents(value: string) {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100), 100_000_00) : 0;
}

function toQty(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1_000_000) : null;
}

type RawLine = ExtractedLine & { vendor: string };

async function readCsv(
  text: string,
): Promise<{ ok: true; mode: ImportMode; raw: RawLine[] } | { ok: false; message: string }> {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, message: "That file is empty." };
  const sample = rows.slice(0, 12);
  const ai = await mapCsvColumns(sample);
  const mapping =
    ai.ok && (ai.mapping.columns.name >= 0 || ai.mapping.columns.barcode >= 0) ? ai.mapping : guessMapping(rows[0]);
  const { columns } = mapping;
  if (columns.name < 0 && columns.barcode < 0) {
    return { ok: false, message: "Couldn't find a product name or barcode column. Add a header row like Name, Barcode, Qty, Cost." };
  }
  const cell = (row: string[], f: CsvField) => (columns[f] >= 0 ? (row[columns[f]] ?? "").trim() : "");
  const raw = rows
    .slice(mapping.headerRow + 1)
    .map((row) => ({
      barcode: cell(row, "barcode").slice(0, 60),
      name: cell(row, "name").slice(0, 160),
      brand: cell(row, "brand").slice(0, 160),
      size: cell(row, "size").slice(0, 40),
      category: cell(row, "category").slice(0, 60),
      vendor: cell(row, "vendor").slice(0, 120),
      qty: toQty(cell(row, "qty")),
      unitCostCents: moneyToCents(cell(row, "unit_cost")),
      retailPriceCents: moneyToCents(cell(row, "retail_price")),
    }))
    // Skip totals / blank rows.
    .filter((l) => (l.name || l.barcode) && !/^(sub)?total|^tax$|^shipping/i.test(l.name));
  return { ok: true, mode: mapping.docType, raw };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter(Boolean));
const digits = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

/** Name overlap needed for a fuzzy match. Price lists accept looser matches since they never touch stock. */
const MATCH_SCORE = 0.75;
const PRICE_MATCH_SCORE = 0.6;

/** Barcode first (ignoring leading zeros), then brand + name, then close token overlap on the name. */
function findMatch(line: RawLine, all: Product[], minScore = MATCH_SCORE): Product | null {
  const code = line.barcode.trim();
  if (code) {
    const d = digits(code);
    const hit = all.find((p) => p.barcode === code || (d.length >= 6 && digits(p.barcode) === d));
    if (hit) return hit;
  }
  if (!line.name) return null;
  const full = norm(`${line.brand} ${line.name}`);
  const exact = all.find(
    (p) =>
      norm(`${p.brand} ${p.name}`) === full ||
      (norm(p.name) === norm(line.name) && (!line.brand || !p.brand || norm(p.brand) === norm(line.brand))),
  );
  if (exact) return exact;
  const want = tokens(`${line.brand} ${line.name} ${line.size}`);
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of all) {
    const have = tokens(`${p.brand} ${p.name} ${p.size}`);
    const shared = [...want].filter((t) => have.has(t)).length;
    const score = shared / Math.max(want.size, have.size, 1);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= minScore ? best : null;
}

/** A file with prices but no quantities on any line is a price list. */
function detectMode(raw: RawLine[], docType: ImportMode): ImportMode {
  const hasPrices = raw.some((l) => l.unitCostCents || l.retailPriceCents);
  return hasPrices && raw.every((l) => l.qty === null) ? "prices" : docType;
}

function toImportLines(raw: RawLine[], all: Product[], mode: ImportMode): ImportLine[] {
  return raw.slice(0, MAX_IMPORT_LINES).map((l, key) => {
    const match = findMatch(l, all, mode === "prices" ? PRICE_MATCH_SCORE : MATCH_SCORE);
    return {
      key,
      // A price list never adds products, so unmatched lines start unticked.
      include: mode !== "prices" || Boolean(match),
      productId: match?.id ?? null,
      barcode: l.barcode || match?.barcode || "",
      name: l.name || match?.name || "",
      brand: l.brand || match?.brand || "",
      size: l.size || match?.size || "",
      category: l.category || match?.category || "",
      vendor: l.vendor || match?.vendor || "",
      qty: l.qty,
      unitCostCents: l.unitCostCents || match?.unitCostCents || 0,
      retailPriceCents: l.retailPriceCents || match?.retailPriceCents || 0,
      costSource: l.unitCostCents ? "document" : match?.unitCostCents ? "current" : "none",
      retailSource: l.retailPriceCents ? "document" : match?.retailPriceCents ? "current" : "none",
    };
  });
}

export async function parseImportFile(
  file: { kind: "csv"; text: string } | { kind: "document"; data: string; mediaType: string },
  business: { itemNoun: string; categories: string[] },
): Promise<ParsedImport> {
  const all = await findAllProducts();
  if (file.kind === "csv") {
    const r = await readCsv(file.text);
    if (!r.ok) return r;
    if (r.raw.length === 0) return { ok: false, message: "No product rows found under the header." };
    const mode = detectMode(r.raw, r.mode);
    return { ok: true, mode, vendor: "", date: "", lines: toImportLines(r.raw, all, mode) };
  }
  const r = await extractImportDocument(file, business);
  if (!r.ok) return r;
  const raw = r.lines.map((l) => ({ ...l, vendor: r.docType === "receipt" ? r.vendor : "" }));
  const mode = detectMode(raw, r.docType);
  return { ok: true, mode, vendor: r.vendor, date: r.date, lines: toImportLines(raw, all, mode) };
}

function makeSku(taken: Set<string>) {
  let code = "";
  do {
    code = `BT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}

/**
 * Applies reviewed lines: updates prices and blank details on matched products,
 * creates the new ones, then sets counts (inventory) or adds received units
 * (receipt) through the movement log so every change shows in Activity and can
 * be traced back to the upload. A price list only updates prices on products
 * that already exist: unmatched lines are skipped and stock is left alone.
 */
export async function applyImportLines(params: {
  mode: ImportMode;
  staffName: string;
  source: string;
  lines: Omit<ImportLine, "key" | "include" | "costSource" | "retailSource">[];
}): Promise<ImportSummary> {
  const all = await findAllProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  const taken = new Set(all.map((p) => p.barcode));
  const note = `Import: ${params.source}`.slice(0, 200);
  const summary: ImportSummary = { created: 0, updated: 0, priced: 0, units: 0 };

  for (const line of params.lines) {
    let product = line.productId ? byId.get(line.productId) : undefined;

    if (product) {
      const changes: Parameters<typeof updateProductFields>[1] = {};
      if (line.unitCostCents > 0 && line.unitCostCents !== product.unitCostCents) changes.unitCostCents = line.unitCostCents;
      if (line.retailPriceCents > 0 && line.retailPriceCents !== product.retailPriceCents) changes.retailPriceCents = line.retailPriceCents;
      if (changes.unitCostCents || changes.retailPriceCents) summary.priced++;
      for (const k of ["brand", "size", "category", "vendor"] as const) {
        if (!product[k] && line[k].trim()) changes[k] = line[k].trim();
      }
      if (Object.keys(changes).length) product = (await updateProductFields(product.id, changes)) ?? product;
      summary.updated++;
    } else {
      if (params.mode === "prices" || !line.name.trim()) continue;
      let barcode = line.barcode.trim();
      if (!barcode || taken.has(barcode)) barcode = makeSku(taken);
      taken.add(barcode);
      product = await insertProduct({
        barcode,
        name: line.name.trim(),
        brand: line.brand.trim(),
        size: line.size.trim(),
        category: line.category.trim(),
        vendor: line.vendor.trim(),
        unitCostCents: line.unitCostCents,
        retailPriceCents: line.retailPriceCents,
      });
      byId.set(product.id, product);
      summary.created++;
      if (line.unitCostCents || line.retailPriceCents) summary.priced++;
    }

    if (params.mode === "prices" || line.qty === null) continue;
    const delta = params.mode === "receipt" ? line.qty : line.qty - product.qty;
    if (delta === 0) continue;
    const { product: after } = await applyMovement({
      productId: product.id,
      type: params.mode === "receipt" ? "receive" : "adjust",
      delta,
      staffName: params.staffName,
      note,
    });
    if (after) byId.set(after.id, after);
    summary.units += Math.abs(delta);
  }
  return summary;
}
