/**
 * Fills in new-product details for barcodes the business hasn't scanned before:
 * first from free public product databases, then (on request) by reading a photo
 * of the label with AI through Netlify AI Gateway. Also hosts the other AI
 * helpers: price estimates / smart fill, receipt reading and reading uploaded
 * inventory spreadsheets / vendor invoices for bulk import. Server-only.
 */

export type LookupResult =
  | {
      found: true;
      source: string;
      brand: string;
      name: string;
      size: string;
      category: string;
      imageUrl: string;
    }
  | { found: false };

export type LabelResult =
  | { ok: true; brand: string; name: string; size: string; category: string }
  | { ok: false; message: string };

const LOOKUP_TIMEOUT_MS = 4500;

/** Model used to read label and receipt photos. Sonnet reads small shade codes and sizes reliably. */
const LABEL_MODEL = "claude-sonnet-5-5";

/** Text-only smart fill and price estimates: Haiku keeps it quick enough to run as staff type. */
const SUGGEST_MODEL = "claude-haiku-4-5";

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      headers: { "User-Agent": "Bintro/1.0 (small business inventory)", Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** The Open *Facts family shares one API; beauty first, then general products, then food and drink. */
const OPEN_FACTS = [
  { host: "world.openbeautyfacts.org", source: "Open Beauty Facts" },
  { host: "world.openproductsfacts.org", source: "Open Products Facts" },
  { host: "world.openfoodfacts.org", source: "Open Food Facts" },
];

async function lookupOpenFacts(code: string, host: string, source: string): Promise<LookupResult> {
  const fields = "product_name,brands,quantity,categories,image_front_url,image_url";
  const data = (await fetchJson(`https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`)) as {
    status?: number;
    product?: Record<string, unknown>;
  } | null;
  const p = data?.status === 1 ? data.product : undefined;
  const name = clean(p?.product_name);
  if (!p || !name) return { found: false };
  return {
    found: true,
    source,
    name,
    brand: clean(p.brands).split(",")[0]?.trim() ?? "",
    size: clean(p.quantity, 40),
    category: clean(p.categories).split(",")[0]?.trim() ?? "",
    imageUrl: clean(p.image_front_url, 2000) || clean(p.image_url, 2000),
  };
}

async function lookupUpcItemDb(code: string): Promise<LookupResult> {
  const data = (await fetchJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`)) as {
    items?: Array<Record<string, unknown>>;
  } | null;
  const item = data?.items?.[0];
  const name = clean(item?.title);
  if (!item || !name) return { found: false };
  const images = Array.isArray(item.images) ? (item.images as unknown[]) : [];
  return {
    found: true,
    source: "UPCitemdb",
    name,
    brand: clean(item.brand),
    size: clean(item.size, 40),
    category: clean(item.category).split(">").pop()?.trim() ?? "",
    imageUrl: images.map((i) => clean(i, 2000)).find((u) => u.startsWith("https://")) ?? "",
  };
}

/** Books: ISBN-13 barcodes start 978/979; Open Library knows title, author and cover. */
async function lookupOpenLibrary(isbn: string): Promise<LookupResult> {
  const key = `ISBN:${isbn}`;
  const data = (await fetchJson(
    `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
  )) as Record<string, Record<string, unknown>> | null;
  const book = data?.[key];
  const title = clean(book?.title);
  if (!book || !title) return { found: false };
  const authors = Array.isArray(book.authors) ? (book.authors as Array<{ name?: unknown }>) : [];
  const subjects = Array.isArray(book.subjects) ? (book.subjects as Array<{ name?: unknown }>) : [];
  const cover = (book.cover ?? {}) as Record<string, unknown>;
  const subtitle = clean(book.subtitle);
  return {
    found: true,
    source: "Open Library",
    name: subtitle ? `${title}: ${subtitle}` : title,
    brand: authors.map((a) => clean(a.name)).filter(Boolean).slice(0, 2).join(", "),
    size: book.number_of_pages ? `${clean(String(book.number_of_pages), 6)} pages` : "",
    category: clean(subjects[0]?.name, 60),
    imageUrl: clean(cover.medium, 2000) || clean(cover.large, 2000),
  };
}

export async function lookupBarcodeOnline(barcode: string): Promise<LookupResult> {
  const code = barcode.trim().replace(/-/g, "");
  // Public databases only index retail EAN/UPC codes (and ISBNs); house-made SKUs never match.
  if (!/^\d{8,14}$/.test(code)) return { found: false };

  if (/^97[89]\d{10}$/.test(code)) {
    const book = await lookupOpenLibrary(code);
    if (book.found) return book;
  }

  const facts = await Promise.all(OPEN_FACTS.map((f) => lookupOpenFacts(code, f.host, f.source)));
  const hit = facts.find((r) => r.found);
  if (hit) return hit;
  return lookupUpcItemDb(code);
}

function anthropicEndpoint(): { url: string; headers: Record<string, string> } | null {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_BASE_URL) {
    return {
      url: `${process.env.ANTHROPIC_BASE_URL.replace(/\/$/, "")}/v1/messages`,
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY },
    };
  }
  if (process.env.NETLIFY_AI_GATEWAY_KEY && process.env.NETLIFY_AI_GATEWAY_BASE_URL) {
    return {
      url: `${process.env.NETLIFY_AI_GATEWAY_BASE_URL.replace(/\/$/, "")}/anthropic/v1/messages`,
      headers: { Authorization: `Bearer ${process.env.NETLIFY_AI_GATEWAY_KEY}` },
    };
  }
  return null;
}

type ToolSpec = { name: string; description: string; input_schema: Record<string, unknown> };
type Content =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

/**
 * Calls Claude with a single forced tool and returns the tool input, or a
 * user-facing error message. Every AI helper in Bintro goes through here.
 */
async function callTool(
  tool: ToolSpec,
  content: Content[],
  opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {},
): Promise<{ ok: true; input: Record<string, unknown> } | { ok: false; message: string }> {
  const endpoint = anthropicEndpoint();
  if (!endpoint) return { ok: false, message: "AI help isn't available on this deploy yet." };
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", ...endpoint.headers },
      body: JSON.stringify({
        model: opts.model ?? LABEL_MODEL,
        max_tokens: opts.maxTokens ?? 500,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) {
      console.error(`AI ${tool.name} failed`, res.status, await res.text().catch(() => ""));
      return { ok: false, message: "The AI couldn't answer just now. Try again in a moment." };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; input?: Record<string, unknown> }> };
    return { ok: true, input: data.content?.find((c) => c.type === "tool_use")?.input ?? {} };
  } catch (error) {
    console.error(`AI ${tool.name} error`, error);
    return { ok: false, message: "Couldn't reach the AI. Check your connection and try again." };
  }
}

function labelTool(itemNoun: string, categories: string[]): ToolSpec {
  return {
    name: "record_product",
    description: "Record the product details printed on the label.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand, manufacturer, or for books the author. Empty if not visible." },
        name: {
          type: "string",
          description: `Product name including line, variant, shade, flavor or edition, as a ${itemNoun} would be listed.`,
        },
        size: { type: "string", description: "Net size or format as printed, e.g. 60 ml, 750 ml, Paperback. Empty if not visible." },
        category: {
          type: "string",
          description: `Short category. Prefer one of: ${categories.join(", ")}.`,
        },
      },
      required: ["brand", "name", "size", "category"],
    },
  };
}

export async function readProductLabel(
  imageBase64: string,
  mediaType: string,
  business: { itemNoun: string; categories: string[] },
): Promise<LabelResult> {
  const r = await callTool(labelTool(business.itemNoun, business.categories), [
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    {
      type: "text",
      text: `This is a photo of a ${business.itemNoun}. Read the label and record the brand, product name (with variant), size and category. Leave a field empty rather than guessing.`,
    },
  ], { maxTokens: 400 });
  if (!r.ok) {
    return { ok: false, message: r.message.replace("The AI couldn't answer just now.", "Couldn't read that label.") };
  }
  const result = {
    brand: clean(r.input.brand),
    name: clean(r.input.name),
    size: clean(r.input.size, 40),
    category: clean(r.input.category, 60),
  };
  if (!result.name && !result.brand) {
    return { ok: false, message: "No product details found in that photo. Try the front label." };
  }
  return { ok: true, ...result };
}

export type SuggestResult =
  | {
      ok: true;
      brand: string;
      name: string;
      size: string;
      category: string;
      unitCostCents: number;
      retailPriceCents: number;
      note: string;
    }
  | { ok: false; message: string };

const SUGGEST_TOOL: ToolSpec = {
  name: "complete_product",
  description: "Complete the inventory record and estimate typical US pricing.",
  input_schema: {
    type: "object",
    properties: {
      brand: { type: "string", description: "Brand / manufacturer (author for books). Keep what was given if already set." },
      name: { type: "string", description: "Clean, properly capitalised product name with variant. Keep the given one if already good." },
      size: { type: "string", description: "Typical size or format if known, else empty." },
      category: { type: "string", description: "Short category." },
      wholesale_cost: {
        type: "number",
        description: "Estimated per-unit wholesale / distributor cost to a small business in USD. 0 if you have no idea.",
      },
      retail_price: { type: "number", description: "Estimated typical US retail / menu price per unit in USD. 0 if unknown." },
      note: { type: "string", description: "One short sentence on how confident the price estimate is and what it's based on." },
    },
    required: ["brand", "name", "size", "category", "wholesale_cost", "retail_price", "note"],
  },
};

function toCents(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100), 100_000_00) : 0;
}

/**
 * AI price detection and smart fill: from whatever staff have typed (even just
 * "redken shades eq 9v"), completes brand, name, size and category and
 * estimates wholesale cost and retail price.
 */
export async function suggestProductDetails(
  fields: { brand: string; name: string; size: string; category: string; vendor: string },
  business: { itemNoun: string; categories: string[] },
): Promise<SuggestResult> {
  const known = Object.entries(fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join("\n");
  if (!known) return { ok: false, message: "Type at least a product name first." };

  const r = await callTool(
    SUGGEST_TOOL,
    [
      {
        type: "text",
        text: `A small business is adding a ${business.itemNoun} to its inventory. Here is what staff typed:
${known}

Fix spelling and capitalisation, fill in anything missing that you're confident about, and estimate typical US wholesale cost and retail price per unit. Categories this business uses: ${business.categories.join(", ")}. Leave fields empty rather than inventing details.`,
      },
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 20_000 },
  );
  if (!r.ok) return r;
  return {
    ok: true,
    brand: clean(r.input.brand),
    name: clean(r.input.name),
    size: clean(r.input.size, 40),
    category: clean(r.input.category, 60),
    unitCostCents: toCents(r.input.wholesale_cost),
    retailPriceCents: toCents(r.input.retail_price),
    note: clean(r.input.note, 200),
  };
}

export type SpokenProductResult =
  | {
      ok: true;
      brand: string;
      name: string;
      size: string;
      category: string;
      vendor: string;
      /** Null when not mentioned, so the form keeps what's there. */
      qty: number | null;
      par: number | null;
      unitCostCents: number;
      retailPriceCents: number;
    }
  | { ok: false; message: string };

function spokenTool(itemNoun: string, categories: string[]): ToolSpec {
  return {
    name: "record_spoken_product",
    description: "Record the product details staff said out loud.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand or manufacturer, properly spelled and capitalised. Empty if not said." },
        name: { type: "string", description: `Product name with line, variant or shade, as a ${itemNoun} would be listed. Empty if not said.` },
        size: { type: "string", description: "Size written compactly, e.g. 300 ml, 8.5 oz, 750 ml. Empty if not said." },
        category: { type: "string", description: `Category. Prefer one of: ${categories.join(", ")}. Empty if unclear.` },
        vendor: { type: "string", description: "Distributor or supplier they buy it from. Empty if not said." },
        qty: { type: "number", description: "Units on hand / on the shelf if said, else -1." },
        par: { type: "number", description: "Reorder point / par level / minimum if said, else -1." },
        cost: { type: "number", description: "Per-unit cost or wholesale price in USD if said, else 0." },
        retail: { type: "number", description: "Per-unit retail or selling price in USD if said, else 0." },
      },
      required: ["brand", "name", "size", "category", "vendor", "qty", "par", "cost", "retail"],
    },
  };
}

function toCount(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 100_000) : null;
}

/**
 * Talk-to-text for the product form: turns something like "Redken Shades EQ 9V,
 * two ounce, color, we have six, costs eight fifty, sells for nineteen" into fields.
 * Only what was actually said is filled in.
 */
export async function parseSpokenProduct(
  transcript: string,
  business: { itemNoun: string; categories: string[] },
): Promise<SpokenProductResult> {
  const r = await callTool(
    spokenTool(business.itemNoun, business.categories),
    [
      {
        type: "text",
        text: `Staff at a small business dictated details for a ${business.itemNoun} they're adding to inventory. Speech recognition wrote:
"${transcript}"

Pull out only what they said. Fix words speech recognition commonly mishears in brand and product names, turn spoken numbers into digits ("eight fifty" as a price = 8.50, "a dozen" = 12), and leave fields empty (or -1 / 0 for numbers) when they weren't mentioned.`,
      },
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 20_000 },
  );
  if (!r.ok) return r;
  const result = {
    ok: true as const,
    brand: clean(r.input.brand),
    name: clean(r.input.name),
    size: clean(r.input.size, 40),
    category: clean(r.input.category, 60),
    vendor: clean(r.input.vendor, 120),
    qty: toCount(r.input.qty),
    par: toCount(r.input.par),
    unitCostCents: toCents(r.input.cost),
    retailPriceCents: toCents(r.input.retail),
  };
  if (!result.name && !result.brand && !result.unitCostCents && !result.retailPriceCents && result.qty === null) {
    return { ok: false, message: "Couldn't pick out product details. Try saying the brand and product name." };
  }
  return result;
}

export type ReceiptResult =
  | { ok: true; amountCents: number; vendor: string; spentOn: string; category: string; note: string }
  | { ok: false; message: string };

function receiptTool(categories: string[]): ToolSpec {
  return {
    name: "record_receipt",
    description: "Record the totals from a receipt or invoice.",
    input_schema: {
      type: "object",
      properties: {
        total: { type: "number", description: "Grand total paid in USD, including tax." },
        vendor: { type: "string", description: "Store or supplier name." },
        date: { type: "string", description: "Purchase date as YYYY-MM-DD. Empty if not printed." },
        category: { type: "string", description: `Best expense category. One of: ${categories.join(", ")}.` },
        note: { type: "string", description: "Very short summary of what was bought, under 60 characters." },
      },
      required: ["total", "vendor", "date", "category", "note"],
    },
  };
}

/** Reads a receipt / invoice photo into an expense. */
export async function readReceipt(imageBase64: string, mediaType: string, categories: string[]): Promise<ReceiptResult> {
  const r = await callTool(receiptTool(categories), [
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    { type: "text", text: "Read this receipt or invoice and record the total, vendor, date, category and a short note." },
  ]);
  if (!r.ok) return r;
  const amountCents = toCents(r.input.total);
  if (!amountCents) return { ok: false, message: "Couldn't find a total on that receipt. Try a flatter, closer photo." };
  const date = clean(r.input.date, 10);
  return {
    ok: true,
    amountCents,
    vendor: clean(r.input.vendor, 80),
    spentOn: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    category: clean(r.input.category, 40),
    note: clean(r.input.note, 120),
  };
}

// --- Bulk import: spreadsheets, invoices and receipts ------------------------

export type ImportDocType = "inventory" | "receipt";

export type ExtractedLine = {
  barcode: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  qty: number | null;
  unitCostCents: number;
  retailPriceCents: number;
};

export type ExtractResult =
  | { ok: true; docType: ImportDocType; vendor: string; date: string; lines: ExtractedLine[] }
  | { ok: false; message: string };

function extractTool(categories: string[]): ToolSpec {
  return {
    name: "record_line_items",
    description: "Record every product line item in the document.",
    input_schema: {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: ["inventory", "receipt"],
          description:
            "inventory = a stock list / count sheet of what is on hand. receipt = a vendor invoice, packing slip or receipt for stock bought.",
        },
        vendor: { type: "string", description: "Supplier / store name for receipts and invoices. Empty if none." },
        date: { type: "string", description: "Document date as YYYY-MM-DD. Empty if not printed." },
        items: {
          type: "array",
          description: "One entry per product line. Skip subtotals, tax, shipping, fees and discounts.",
          items: {
            type: "object",
            properties: {
              code: { type: "string", description: "Barcode / UPC / EAN / ISBN / SKU / item number. Empty if none." },
              name: { type: "string", description: "Product name with variant or shade, without the brand." },
              brand: { type: "string", description: "Brand or manufacturer. Empty if not shown." },
              size: { type: "string", description: "Unit size, e.g. 250 ml. Empty if not shown." },
              category: { type: "string", description: `Short category. Prefer one of: ${categories.join(", ")}.` },
              qty: {
                type: "number",
                description:
                  "Units: on-hand count for inventory lists, units received for invoices (cases × units per case when a pack size is shown). -1 if not shown.",
              },
              unit_cost: { type: "number", description: "Cost per single unit in USD before tax. 0 if not shown." },
              retail_price: { type: "number", description: "Retail / selling price per unit in USD. 0 if not shown." },
            },
            required: ["code", "name", "brand", "size", "category", "qty", "unit_cost", "retail_price"],
          },
        },
      },
      required: ["document_type", "vendor", "date", "items"],
    },
  };
}

function toQty(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1_000_000) : null;
}

/** Reads a PDF or photo of an inventory sheet, invoice or receipt into product line items. */
export async function extractImportDocument(
  file: { data: string; mediaType: string },
  business: { itemNoun: string; categories: string[] },
): Promise<ExtractResult> {
  const doc: Content =
    file.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } }
      : { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.data } };
  const r = await callTool(
    extractTool(business.categories),
    [
      doc,
      {
        type: "text",
        text: `This is an inventory spreadsheet, vendor invoice or receipt for a small business that stocks ${business.itemNoun}s. Record every product line item exactly as printed. Keep text short and leave fields empty rather than guessing.`,
      },
    ],
    { maxTokens: 8000, timeoutMs: 55_000 },
  );
  if (!r.ok) return r;
  const items = Array.isArray(r.input.items) ? (r.input.items as Array<Record<string, unknown>>) : [];
  const lines = items
    .map((i) => ({
      barcode: clean(i.code, 60),
      name: clean(i.name),
      brand: clean(i.brand),
      size: clean(i.size, 40),
      category: clean(i.category, 60),
      qty: toQty(i.qty),
      unitCostCents: toCents(i.unit_cost),
      retailPriceCents: toCents(i.retail_price),
    }))
    .filter((l) => l.name || l.barcode);
  if (lines.length === 0) {
    return { ok: false, message: "No product lines found in that file. Try a clearer scan or a CSV export." };
  }
  const date = clean(r.input.date, 10);
  return {
    ok: true,
    docType: r.input.document_type === "receipt" ? "receipt" : "inventory",
    vendor: clean(r.input.vendor, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    lines,
  };
}

export const CSV_FIELDS = ["barcode", "name", "brand", "size", "category", "vendor", "qty", "unit_cost", "retail_price"] as const;
export type CsvField = (typeof CSV_FIELDS)[number];
export type CsvMapping = { headerRow: number; docType: ImportDocType; columns: Record<CsvField, number> };

const CSV_MAP_TOOL: ToolSpec = {
  name: "map_columns",
  description: "Say which spreadsheet column holds each inventory field.",
  input_schema: {
    type: "object",
    properties: {
      header_row: { type: "number", description: "0-based index of the header row among the rows shown. -1 if there is no header." },
      document_type: {
        type: "string",
        enum: ["inventory", "receipt"],
        description: "inventory = stock on hand list. receipt = invoice / order / delivery of stock bought.",
      },
      ...Object.fromEntries(
        CSV_FIELDS.map((f) => [
          f,
          {
            type: "number",
            description: {
              barcode: "Column index of the barcode / UPC / EAN / ISBN / SKU / item code.",
              name: "Column index of the product name or description.",
              brand: "Column index of the brand / manufacturer / author.",
              size: "Column index of the unit size.",
              category: "Column index of the category / department / type.",
              vendor: "Column index of the supplier / vendor / distributor.",
              qty: "Column index of the quantity (on hand, counted, ordered or received).",
              unit_cost: "Column index of the per-unit cost the business pays (wholesale / invoice price).",
              retail_price: "Column index of the per-unit selling / retail price.",
            }[f] + " -1 if none.",
          },
        ]),
      ),
    },
    required: ["header_row", "document_type", ...CSV_FIELDS],
  },
};

/** Works out which CSV column is which from the first rows. Cheap: only a sample is sent. */
export async function mapCsvColumns(sample: string[][]): Promise<{ ok: true; mapping: CsvMapping } | { ok: false; message: string }> {
  const table = sample.map((row, i) => `${i}: ${row.map((c, j) => `[${j}] ${c.slice(0, 40)}`).join(" | ")}`).join("\n");
  const r = await callTool(
    CSV_MAP_TOOL,
    [{ type: "text", text: `Here are the first rows of a small business's inventory spreadsheet or supplier invoice export:\n${table}` }],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 20_000 },
  );
  if (!r.ok) return r;
  const width = Math.max(...sample.map((row) => row.length));
  const col = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isInteger(n) && n >= 0 && n < width ? n : -1;
  };
  const headerRow = Math.round(Number(r.input.header_row));
  return {
    ok: true,
    mapping: {
      headerRow: Number.isInteger(headerRow) && headerRow >= -1 && headerRow < sample.length ? headerRow : 0,
      docType: r.input.document_type === "receipt" ? "receipt" : "inventory",
      columns: Object.fromEntries(CSV_FIELDS.map((f) => [f, col(r.input[f])])) as Record<CsvField, number>,
    },
  };
}

export type PriceEstimate = { unitCostCents: number; retailPriceCents: number };

const BATCH_PRICE_TOOL: ToolSpec = {
  name: "estimate_prices",
  description: "Estimate typical US pricing for each numbered item.",
  input_schema: {
    type: "object",
    properties: {
      prices: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The item number given." },
            wholesale_cost: { type: "number", description: "Per-unit wholesale cost to a small business in USD. 0 if unknown." },
            retail_price: { type: "number", description: "Typical US retail / menu price per unit in USD. 0 if unknown." },
          },
          required: ["index", "wholesale_cost", "retail_price"],
        },
      },
    },
    required: ["prices"],
  },
};

/** AI price estimates for many import lines at once. Returns one entry per item, zeros when unknown. */
export async function estimatePricesBatch(
  items: { name: string; brand: string; size: string; category: string }[],
  business: { itemNoun: string },
): Promise<{ ok: true; prices: PriceEstimate[] } | { ok: false; message: string }> {
  const list = items
    .map((i, n) => `${n}: ${[i.brand, i.name, i.size].filter(Boolean).join(" ")}${i.category ? ` (${i.category})` : ""}`)
    .join("\n");
  const r = await callTool(
    BATCH_PRICE_TOOL,
    [
      {
        type: "text",
        text: `A small business stocks ${business.itemNoun}s. Estimate typical US per-unit wholesale cost and retail price for each item:\n${list}`,
      },
    ],
    { model: SUGGEST_MODEL, maxTokens: 2500, timeoutMs: 40_000 },
  );
  if (!r.ok) return r;
  const prices: PriceEstimate[] = items.map(() => ({ unitCostCents: 0, retailPriceCents: 0 }));
  const rows = Array.isArray(r.input.prices) ? (r.input.prices as Array<Record<string, unknown>>) : [];
  for (const row of rows) {
    const i = Math.round(Number(row.index));
    if (prices[i]) prices[i] = { unitCostCents: toCents(row.wholesale_cost), retailPriceCents: toCents(row.retail_price) };
  }
  return { ok: true, prices };
}

// --- Web price search --------------------------------------------------------

/**
 * Resale, auction and marketplace sites whose prices don't reflect what a
 * business actually pays or what the brand charges. Never used as a source.
 */
const RESALE_DOMAINS = [
  "ebay.com",
  "poshmark.com",
  "mercari.com",
  "etsy.com",
  "depop.com",
  "offerup.com",
  "craigslist.org",
  "facebook.com",
  "bonanza.com",
  "vinted.com",
  "whatnot.com",
  "aliexpress.com",
  "dhgate.com",
  "temu.com",
  "wish.com",
  "shopgoodwill.com",
  "kijiji.ca",
  "stockx.com",
  "tradesy.com",
  "thredup.com",
];

function isResaleUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return RESALE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const RECORD_PRICE_TOOL: ToolSpec = {
  name: "record_price",
  description: "Record the most accurate current price found for the product. Call this exactly once, at the end.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "True if a listing for this exact product (same size) was found on an allowed source." },
      retail_price: {
        type: "number",
        description: "Current per-unit selling price in USD on the manufacturer's site or Amazon (sold by Amazon or the brand's official store). 0 if not found.",
      },
      unit_cost: {
        type: "number",
        description: "Per-unit professional / wholesale price in USD if an authorised distributor shows it publicly. 0 if not shown — do not guess.",
      },
      source_name: { type: "string", description: "Site the main price came from, e.g. 'Redken.com', 'SalonCentric', 'Amazon (sold by Amazon)'." },
      source_url: { type: "string", description: "Exact product page URL the price came from." },
      source_type: { type: "string", enum: ["manufacturer", "distributor", "amazon"] },
      note: {
        type: "string",
        description: "One short sentence: pack size / per-unit maths, sale vs regular price, or why nothing reliable was found.",
      },
    },
    required: ["found", "retail_price", "unit_cost", "source_name", "source_url", "source_type", "note"],
  },
};

type WebPriceFields = { brand: string; name: string; size: string; category: string; vendor: string; barcode?: string };

export type WebPriceLookup =
  | {
      ok: true;
      unitCostCents: number;
      retailPriceCents: number;
      sourceName: string;
      sourceUrl: string;
      sourceType: "manufacturer" | "distributor" | "amazon" | "estimate";
      note: string;
    }
  | { ok: false; message: string };

type Block = { type: string; name?: string; input?: Record<string, unknown> };

/**
 * Finds the most accurate current price for a product by searching the web
 * (Claude web search through the AI Gateway). Only the manufacturer's own
 * site, authorised professional distributors and Amazon (sold by Amazon or the
 * brand's official storefront) count; resale and marketplace sites are blocked.
 * Falls back to a clearly-labelled AI estimate when web search isn't available.
 */
export async function findWebPrice(
  fields: WebPriceFields,
  business: { itemNoun: string; categories: string[] },
): Promise<WebPriceLookup> {
  const label = [fields.brand, fields.name, fields.size].filter((v) => v.trim()).join(" ");
  if (!fields.name.trim()) return { ok: false, message: "Add a product name first." };
  const endpoint = anthropicEndpoint();
  if (!endpoint) return { ok: false, message: "AI help isn't available on this deploy yet." };

  const prompt = `Find the most accurate current US price for this ${business.itemNoun}:
${label}${fields.barcode && /^\d{8,14}$/.test(fields.barcode) ? `\nUPC/EAN: ${fields.barcode}` : ""}${fields.vendor ? `\nUsually bought from: ${fields.vendor}` : ""}

Rules:
- Use ONLY these sources, in this order of preference: (1) the brand/manufacturer's official website, (2) an authorised professional distributor's website (for example SalonCentric, CosmoProf, Sally Beauty Pro, Salon Services, or the distributor named above; for bars, the distributor or brand site), (3) Amazon.com — but only listings sold by Amazon.com or the brand's official Amazon storefront.
- Never use resale, auction, marketplace or third-party seller listings (eBay, Poshmark, Mercari, Etsy, Walmart Marketplace sellers, Amazon third-party sellers, discount liquidators, price-comparison aggregators).
- Match the exact product and size. If a price is for a multi-pack or case, divide to a per-unit price and say so in the note.
- Prefer the regular price; if only a sale price is shown, use it and mention the sale in the note.
- Wholesale/pro cost: only report it if a distributor shows it publicly; otherwise 0.
When done, call record_price once.`;

  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [{ role: "user", content: prompt }];
  const call = async (forceRecord: boolean) => {
    const res = await fetch(endpoint.url, {
      method: "POST",
      signal: AbortSignal.timeout(75_000),
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", ...endpoint.headers },
      body: JSON.stringify({
        model: LABEL_MODEL,
        max_tokens: 1500,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 5, blocked_domains: RESALE_DOMAINS },
          RECORD_PRICE_TOOL,
        ],
        tool_choice: forceRecord ? { type: "tool", name: RECORD_PRICE_TOOL.name } : { type: "auto" },
        messages,
      }),
    });
    if (!res.ok) {
      console.error("AI web price failed", res.status, (await res.text().catch(() => "")).slice(0, 500));
      return null;
    }
    return (await res.json()) as { content?: Block[]; stop_reason?: string };
  };

  try {
    let record: Record<string, unknown> | undefined;
    for (let turn = 0; turn < 4 && !record; turn++) {
      // After a few rounds of searching, make it commit to an answer.
      const data = await call(turn >= 2);
      if (!data) break;
      const content = data.content ?? [];
      record = content.find((c) => c.type === "tool_use" && c.name === RECORD_PRICE_TOOL.name)?.input;
      if (record) break;
      messages.push({ role: "assistant", content });
      if (data.stop_reason !== "pause_turn") {
        messages.push({ role: "user", content: "Now call record_price with the best price you found (found=false if none)." });
      }
    }

    if (record) {
      const url = clean(record.source_url, 500);
      const type = String(record.source_type);
      const sourceType = type === "manufacturer" || type === "distributor" || type === "amazon" ? type : "manufacturer";
      const retail = toCents(record.retail_price);
      const cost = toCents(record.unit_cost);
      if (record.found && (retail || cost) && !isResaleUrl(url)) {
        return {
          ok: true,
          unitCostCents: cost,
          retailPriceCents: retail,
          sourceName: clean(record.source_name, 120),
          sourceUrl: /^https?:\/\//.test(url) ? url : "",
          sourceType,
          note: clean(record.note, 240),
        };
      }
      if (!record.found) {
        const estimate = await webPriceFallback(fields, business);
        if (estimate.ok) {
          return { ...estimate, note: `No listing on the manufacturer, distributor or Amazon sites. ${estimate.note}`.trim() };
        }
        return { ok: false, message: clean(record.note, 240) || "No reliable listing found for this product." };
      }
    }
  } catch (error) {
    console.error("AI web price error", error);
  }
  return webPriceFallback(fields, business);
}

/** Model-only estimate, used when web search isn't available. Always labelled as an estimate. */
async function webPriceFallback(fields: WebPriceFields, business: { itemNoun: string; categories: string[] }): Promise<WebPriceLookup> {
  const r = await suggestProductDetails(fields, business);
  if (!r.ok) return { ok: false, message: "Couldn't check prices online just now. Try again in a moment." };
  if (!r.unitCostCents && !r.retailPriceCents) return { ok: false, message: "No reliable price found for this product." };
  return {
    ok: true,
    unitCostCents: r.unitCostCents,
    retailPriceCents: r.retailPriceCents,
    sourceName: "AI estimate",
    sourceUrl: "",
    sourceType: "estimate",
    note: `Not verified on a live listing. ${r.note}`.trim(),
  };
}

// --- Insight summaries -------------------------------------------------------

const SUMMARY_TOOL: ToolSpec = {
  name: "write_summary",
  description: "Write the short summary shown at the top of the report email and app pop-up.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2–4 plain sentences for a busy owner: what stands out, what to do this week, and any money figure worth knowing. No greeting, no markdown.",
      },
    },
    required: ["summary"],
  },
};

/**
 * AI-written plain-language summary for a report ("Your top seller this week…").
 * Returns an empty string when AI isn't available, so reports still send.
 */
export async function writeInsightSummary(kind: "weekly" | "monthly" | "fast", facts: string, business: { itemNoun: string }) {
  const focus = {
    weekly: "what is selling very well this week (with the expected profit) and what staff are using most in services, and whether to stock deeper on either. Items marked USED were not sold — never call them sales or give them profit",
    monthly: "items that are barely being used (especially color and retail lines), the cash tied up in them, what to do (promote, bundle, return, stop reordering), and prices that need updating",
    fast: "items selling out fast, how soon they run out, what to buy in higher volume and the predicted cost",
  }[kind];
  const r = await callTool(
    SUMMARY_TOOL,
    [
      {
        type: "text",
        text: `You're the stock advisor for a small business that stocks ${business.itemNoun}s. Summarise ${focus}. Only use the numbers given.\n\n${facts}`,
      },
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 25_000 },
  );
  return r.ok ? clean(r.input.summary, 900) : "";
}
