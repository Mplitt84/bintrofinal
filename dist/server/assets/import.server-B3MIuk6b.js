import { f as findAllProducts, j as updateProductFields, i as insertProduct, h as applyMovement, p as flushSquareSoon, t as countMovementsWithNote } from "./inventory.server-FPvzQkco.js";
import { d as extractImportDocument, m as mapCsvColumns, C as CSV_FIELDS } from "./product-lookup.server-C6LGgHTN.js";
import { M as MAX_IMPORT_LINES, s as salesReportNote } from "./bulk-import-Bd6tmV71.js";
function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delimiter = [",", ";", "	"].reduce(
    (best, d) => firstLine.split(d).length > firstLine.split(best).length ? d : best
  );
  const rows = [];
  let row = [];
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
const HEADER_HINTS = {
  barcode: /barcode|upc|ean|gtin|isbn|sku|item.?(code|no|number|#)|plu/i,
  name: /name|product|description|item|title/i,
  brand: /brand|manufacturer|mfr|author|make/i,
  size: /size|volume|format/i,
  category: /categor|department|dept|type|group/i,
  vendor: /vendor|supplier|distributor/i,
  qty: /qty|quantity|on.?hand|count|stock|units|received|ordered|shipped/i,
  unit_cost: /cost|wholesale|unit.?price|net/i,
  retail_price: /retail|msrp|sell|sale.?price|^price$/i
};
function guessMapping(header) {
  const used = /* @__PURE__ */ new Set();
  const columns = {};
  for (const f of CSV_FIELDS) {
    const idx = header.findIndex((h, i) => !used.has(i) && HEADER_HINTS[f].test(h));
    columns[f] = idx;
    if (idx >= 0) used.add(idx);
  }
  const receipt = columns.qty >= 0 && /received|ordered|shipped|invoice/i.test(header[columns.qty] ?? "");
  return { headerRow: 0, docType: receipt ? "receipt" : "inventory", columns };
}
function moneyToCents(value) {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100), 1e7) : 0;
}
function toQty(value) {
  if (!value.trim()) return null;
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1e6) : null;
}
async function readCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, message: "That file is empty." };
  const sample = rows.slice(0, 12);
  const ai = await mapCsvColumns(sample);
  const mapping = ai.ok && (ai.mapping.columns.name >= 0 || ai.mapping.columns.barcode >= 0) ? ai.mapping : guessMapping(rows[0]);
  const { columns } = mapping;
  if (columns.name < 0 && columns.barcode < 0) {
    return { ok: false, message: "Couldn't find a product name or barcode column. Add a header row like Name, Barcode, Qty, Cost." };
  }
  const cell = (row, f) => columns[f] >= 0 ? (row[columns[f]] ?? "").trim() : "";
  const raw = rows.slice(mapping.headerRow + 1).map((row) => ({
    barcode: cell(row, "barcode").slice(0, 60),
    name: cell(row, "name").slice(0, 160),
    brand: cell(row, "brand").slice(0, 160),
    size: cell(row, "size").slice(0, 40),
    category: cell(row, "category").slice(0, 60),
    vendor: cell(row, "vendor").slice(0, 120),
    qty: toQty(cell(row, "qty")),
    unitCostCents: moneyToCents(cell(row, "unit_cost")),
    retailPriceCents: moneyToCents(cell(row, "retail_price"))
  })).filter((l) => (l.name || l.barcode) && !/^(sub)?total|^tax$|^shipping/i.test(l.name));
  return { ok: true, mode: mapping.docType, raw };
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (s) => new Set(norm(s).split(" ").filter(Boolean));
const digits = (s) => s.replace(/\D/g, "").replace(/^0+/, "");
const MATCH_SCORE = 0.75;
const PRICE_MATCH_SCORE = 0.6;
function findMatch(line, all, minScore = MATCH_SCORE) {
  const code = line.barcode.trim();
  if (code) {
    const d = digits(code);
    const hit = all.find(
      (p) => p.barcode === code || p.extraBarcodes.includes(code) || d.length >= 6 && [p.barcode, ...p.extraBarcodes].some((b) => digits(b) === d)
    );
    if (hit) return hit;
  }
  if (!line.name) return null;
  const full = norm(`${line.brand} ${line.name}`);
  const exact = all.find(
    (p) => norm(`${p.brand} ${p.name}`) === full || norm(p.name) === norm(line.name) && (!line.brand || !p.brand || norm(p.brand) === norm(line.brand))
  );
  if (exact) return exact;
  const want = tokens(`${line.brand} ${line.name} ${line.size}`);
  let best = null;
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
function detectMode(raw, docType) {
  const hasPrices = raw.some((l) => l.unitCostCents || l.retailPriceCents);
  return hasPrices && raw.every((l) => l.qty === null) ? "prices" : docType;
}
function toImportLines(raw, all, mode) {
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
      retailSource: l.retailPriceCents ? "document" : match?.retailPriceCents ? "current" : "none"
    };
  });
}
async function parseImportFile(file, business) {
  const all = await findAllProducts();
  if (file.kind === "csv") {
    const r2 = await readCsv(file.text);
    if (!r2.ok) return r2;
    if (r2.raw.length === 0) return { ok: false, message: "No product rows found under the header." };
    const mode2 = detectMode(r2.raw, r2.mode);
    return { ok: true, mode: mode2, vendor: "", date: "", lines: toImportLines(r2.raw, all, mode2) };
  }
  const r = await extractImportDocument(file, business);
  if (!r.ok) return r;
  const raw = r.lines.map((l) => ({ ...l, vendor: r.docType === "receipt" ? r.vendor : "" }));
  const mode = detectMode(raw, r.docType);
  return { ok: true, mode, vendor: r.vendor, date: r.date, lines: toImportLines(raw, all, mode) };
}
function makeSku(taken) {
  let code = "";
  do {
    code = `BT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}
async function applyImportLines(params) {
  if (params.mode === "inventory") {
    try {
      const { syncSquareSalesIfConnected } = await import("./integrations.server-Cl39Wgfx.js");
      await syncSquareSalesIfConnected();
    } catch (error) {
      console.error("Square sales sync before import failed", error);
    }
  }
  const all = await findAllProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  const taken = new Set(all.flatMap((p) => [p.barcode, ...p.extraBarcodes]));
  const note = `Import: ${params.source}`.slice(0, 200);
  const summary = { created: 0, updated: 0, priced: 0, units: 0 };
  for (const line of params.lines) {
    let product = line.productId ? byId.get(line.productId) : void 0;
    if (product) {
      const changes = {};
      if (line.unitCostCents > 0 && line.unitCostCents !== product.unitCostCents) changes.unitCostCents = line.unitCostCents;
      if (line.retailPriceCents > 0 && line.retailPriceCents !== product.retailPriceCents) changes.retailPriceCents = line.retailPriceCents;
      if (changes.unitCostCents || changes.retailPriceCents) summary.priced++;
      for (const k of ["brand", "size", "category", "vendor"]) {
        if (!product[k] && line[k].trim()) changes[k] = line[k].trim();
      }
      if (Object.keys(changes).length) product = await updateProductFields(product.id, changes) ?? product;
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
        retailPriceCents: line.retailPriceCents
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
      square: "later"
    });
    if (after) byId.set(after.id, after);
    summary.units += Math.abs(delta);
  }
  await flushSquareSoon();
  return summary;
}
const SOLD_HINT = /sold|qty|quantity|units|count|^#$|^no\.?$/i;
const NOT_A_PRODUCT = /^(sub)?total|^tax$|^tips?$|^shipping|^discount|^grand/i;
function salesColumns(rows) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const header = rows[r];
    const name = header.findIndex((h) => HEADER_HINTS.name.test(h));
    const barcode = header.findIndex((h) => HEADER_HINTS.barcode.test(h));
    const sold = header.findIndex((h) => /sold/i.test(h));
    const qty = sold >= 0 ? sold : header.findIndex((h) => SOLD_HINT.test(h));
    if ((name >= 0 || barcode >= 0) && qty >= 0) {
      return { headerRow: r, name, barcode, qty, brand: header.findIndex((h) => HEADER_HINTS.brand.test(h)), size: header.findIndex((h) => HEADER_HINTS.size.test(h)) };
    }
  }
  return null;
}
async function readSalesCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, message: "That file is empty." };
  let cols = salesColumns(rows);
  if (!cols) {
    const ai = await mapCsvColumns(rows.slice(0, 12));
    if (ai.ok && (ai.mapping.columns.name >= 0 || ai.mapping.columns.barcode >= 0) && ai.mapping.columns.qty >= 0) {
      const c2 = ai.mapping.columns;
      cols = { headerRow: ai.mapping.headerRow, name: c2.name, barcode: c2.barcode, qty: c2.qty, brand: c2.brand, size: c2.size };
    }
  }
  if (!cols) {
    return { ok: false, message: "Couldn't find a product name and a quantity sold column. Export the product sales report, not the full sales list." };
  }
  const { headerRow, ...c } = cols;
  const cell = (row, i) => i >= 0 ? (row[i] ?? "").trim() : "";
  const raw = rows.slice(headerRow + 1).map((row) => ({
    barcode: cell(row, c.barcode).slice(0, 60),
    name: cell(row, c.name).slice(0, 160),
    brand: cell(row, c.brand).slice(0, 160),
    size: cell(row, c.size).slice(0, 40),
    category: "",
    vendor: "",
    qty: toQty(cell(row, c.qty)),
    unitCostCents: 0,
    retailPriceCents: 0
  }));
  return { ok: true, raw };
}
async function parseSalesReportFile(file, business) {
  let raw;
  let period = "";
  if (file.kind === "csv") {
    const r = await readSalesCsv(file.text);
    if (!r.ok) return r;
    raw = r.raw;
  } else {
    const r = await extractImportDocument(file, business);
    if (!r.ok) return r;
    raw = r.lines.map((l) => ({ ...l, vendor: "" }));
    period = r.date;
  }
  raw = raw.filter((l) => (l.name || l.barcode) && (l.qty ?? 0) > 0 && !NOT_A_PRODUCT.test(l.name));
  if (raw.length === 0) return { ok: false, message: "No products with units sold found in that report." };
  const all = await findAllProducts();
  const merged = /* @__PURE__ */ new Map();
  for (const l of raw.slice(0, MAX_IMPORT_LINES)) {
    const match = findMatch(l, all);
    const id = match ? `p${match.id}` : `n${norm(`${l.brand} ${l.name} ${l.size}`)}`;
    const hit = merged.get(id);
    if (hit) {
      hit.qty += l.qty ?? 0;
      continue;
    }
    merged.set(id, {
      key: merged.size,
      productId: match?.id ?? null,
      name: match?.name ?? l.name,
      brand: match?.brand ?? l.brand,
      size: match?.size ?? l.size,
      qty: l.qty ?? 0
    });
  }
  return { ok: true, period, lines: [...merged.values()] };
}
async function applySalesReport(params) {
  const note = salesReportNote(params.app, params.period);
  if (!params.force && await countMovementsWithNote(note) > 0) {
    return { ok: false, duplicate: true, message: `A ${params.app} report for ${params.period || "this period"} is already logged.` };
  }
  const byProduct = /* @__PURE__ */ new Map();
  for (const l of params.lines) if (l.qty > 0) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + l.qty);
  let units = 0;
  for (const [productId, qty] of byProduct) {
    await applyMovement({ productId, type: "out", delta: -qty, staffName: params.staffName, note, square: "later" });
    units += qty;
  }
  await flushSquareSoon();
  return { ok: true, units, products: byProduct.size };
}
export {
  applyImportLines as a,
  parseSalesReportFile as b,
  applySalesReport as c,
  parseImportFile as p
};
