const LOOKUP_TIMEOUT_MS = 4500;
const LABEL_MODEL = "claude-sonnet-5-5";
const SUGGEST_MODEL = "claude-haiku-4-5";
const BACKUP_MODEL = "claude-sonnet-4-6";
async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      headers: { "User-Agent": "Bintro/1.0 (small business inventory)", Accept: "application/json" }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
function clean(value, max = 160) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
const OPEN_FACTS = [
  { host: "world.openbeautyfacts.org", source: "Open Beauty Facts" },
  { host: "world.openproductsfacts.org", source: "Open Products Facts" },
  { host: "world.openfoodfacts.org", source: "Open Food Facts" }
];
async function lookupOpenFacts(code, host, source) {
  const fields = "product_name,brands,quantity,categories,image_front_url,image_url";
  const data = await fetchJson(`https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  const p = data?.status === 1 ? data.product : void 0;
  const name = clean(p?.product_name);
  if (!p || !name) return { found: false };
  return {
    found: true,
    source,
    name,
    brand: clean(p.brands).split(",")[0]?.trim() ?? "",
    size: clean(p.quantity, 40),
    category: clean(p.categories).split(",")[0]?.trim() ?? "",
    imageUrl: clean(p.image_front_url, 2e3) || clean(p.image_url, 2e3)
  };
}
async function lookupUpcItemDb(code) {
  const data = await fetchJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`);
  const item = data?.items?.[0];
  const name = clean(item?.title);
  if (!item || !name) return { found: false };
  const images = Array.isArray(item.images) ? item.images : [];
  return {
    found: true,
    source: "UPCitemdb",
    name,
    brand: clean(item.brand),
    size: clean(item.size, 40),
    category: clean(item.category).split(">").pop()?.trim() ?? "",
    imageUrl: images.map((i) => clean(i, 2e3)).find((u) => u.startsWith("https://")) ?? ""
  };
}
async function lookupOpenLibrary(isbn) {
  const key = `ISBN:${isbn}`;
  const data = await fetchJson(
    `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`
  );
  const book = data?.[key];
  const title = clean(book?.title);
  if (!book || !title) return { found: false };
  const authors = Array.isArray(book.authors) ? book.authors : [];
  const subjects = Array.isArray(book.subjects) ? book.subjects : [];
  const cover = book.cover ?? {};
  const subtitle = clean(book.subtitle);
  return {
    found: true,
    source: "Open Library",
    name: subtitle ? `${title}: ${subtitle}` : title,
    brand: authors.map((a) => clean(a.name)).filter(Boolean).slice(0, 2).join(", "),
    size: book.number_of_pages ? `${clean(String(book.number_of_pages), 6)} pages` : "",
    category: clean(subjects[0]?.name, 60),
    imageUrl: clean(cover.medium, 2e3) || clean(cover.large, 2e3)
  };
}
async function lookupBarcodeOnline(barcode) {
  const code = barcode.trim().replace(/-/g, "");
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
function anthropicEndpoints() {
  const list = [];
  const own = process.env.BINTRO_ANTHROPIC_KEY?.trim();
  if (own) list.push({ url: "https://api.anthropic.com/v1/messages", headers: { "x-api-key": own }, label: "anthropic-own-key" });
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const base = process.env.ANTHROPIC_BASE_URL?.trim();
  if (key) {
    list.push({
      url: `${(base || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`,
      headers: { "x-api-key": key },
      label: base ? "anthropic-env" : "anthropic-direct"
    });
  }
  const gwKey = process.env.NETLIFY_AI_GATEWAY_KEY?.trim();
  const gwBase = process.env.NETLIFY_AI_GATEWAY_BASE_URL?.trim();
  if (gwKey && gwBase) {
    list.push({
      url: `${gwBase.replace(/\/$/, "")}/anthropic/v1/messages`,
      headers: { Authorization: `Bearer ${gwKey}` },
      label: "netlify-gateway"
    });
  }
  return list;
}
function anthropicEndpoint() {
  return anthropicEndpoints()[0] ?? null;
}
const RETRY_STATUS = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504, 529]);
async function postToClaude(body, timeoutMs, tag) {
  const endpoints = anthropicEndpoints();
  const models = [String(body.model), ...body.model === LABEL_MODEL ? [BACKUP_MODEL] : body.model === SUGGEST_MODEL ? [LABEL_MODEL] : []];
  let last = null;
  for (const model of models) {
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(endpoint.url, {
            method: "POST",
            signal: AbortSignal.timeout(timeoutMs),
            headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", ...endpoint.headers },
            body: JSON.stringify({ ...body, model })
          });
          if (res.ok) return res;
          last = res;
          const detail = (await res.clone().text().catch(() => "")).slice(0, 300);
          console.error(`AI ${tag} via ${endpoint.label} (${model}) failed`, res.status, detail);
          if (!RETRY_STATUS.has(res.status)) break;
        } catch (error) {
          console.error(`AI ${tag} via ${endpoint.label} (${model}) error`, error);
        }
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  return last;
}
async function callTool(tool, content, opts = {}) {
  if (!anthropicEndpoint()) return { ok: false, message: "AI help isn't available on this deploy yet." };
  try {
    const res = await postToClaude(
      {
        model: opts.model ?? LABEL_MODEL,
        max_tokens: opts.maxTokens ?? 500,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content }]
      },
      opts.timeoutMs ?? 3e4,
      tool.name
    );
    if (!res || !res.ok) {
      return { ok: false, message: "The AI couldn't answer just now. Try again in a moment." };
    }
    const data = await res.json();
    return { ok: true, input: data.content?.find((c) => c.type === "tool_use")?.input ?? {} };
  } catch (error) {
    console.error(`AI ${tool.name} error`, error);
    return { ok: false, message: "Couldn't reach the AI. Check your connection and try again." };
  }
}
function labelTool(itemNoun, categories) {
  return {
    name: "record_product",
    description: "Record the product details printed on the label.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand, manufacturer, or for books the author. Empty if not visible." },
        name: {
          type: "string",
          description: `Product name including line, variant, shade, flavor or edition, as a ${itemNoun} would be listed.`
        },
        size: { type: "string", description: "Net size or format as printed, e.g. 60 ml, 750 ml, Paperback. Empty if not visible." },
        category: {
          type: "string",
          description: `Short category. Prefer one of: ${categories.join(", ")}.`
        }
      },
      required: ["brand", "name", "size", "category"]
    }
  };
}
async function readProductLabel(imageBase64, mediaType, business) {
  const r = await callTool(labelTool(business.itemNoun, business.categories), [
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    {
      type: "text",
      text: `This is a photo of a ${business.itemNoun}. Read the label and record the brand, product name (with variant), size and category. Leave a field empty rather than guessing.`
    }
  ], { maxTokens: 400 });
  if (!r.ok) {
    return { ok: false, message: r.message.replace("The AI couldn't answer just now.", "Couldn't read that label.") };
  }
  const result = {
    brand: clean(r.input.brand),
    name: clean(r.input.name),
    size: clean(r.input.size, 40),
    category: clean(r.input.category, 60)
  };
  if (!result.name && !result.brand) {
    return { ok: false, message: "No product details found in that photo. Try the front label." };
  }
  return { ok: true, ...result };
}
const STOCK_PHOTO_TOOL = {
  name: "read_stock_photo",
  description: "Record the product code and label details visible in a quick stock photo.",
  input_schema: {
    type: "object",
    properties: {
      barcode: {
        type: "string",
        description: "The barcode number printed under the bars (UPC/EAN digits), or the SKU / item code printed on the product or shelf tag. Copy it exactly, digits and letters only. Empty if no code is fully readable."
      },
      code_complete: {
        type: "boolean",
        description: "True only if every character of the code is clearly readable (not cut off, blurred or covered)."
      },
      brand: { type: "string", description: "Brand as printed. Empty if not visible." },
      name: { type: "string", description: "Product name with line, variant or shade as printed. Empty if not visible." },
      size: { type: "string", description: "Net size as printed, e.g. 8 fl oz. Empty if not visible." },
      category: { type: "string", description: "Short category." },
      label_complete: {
        type: "boolean",
        description: "True only if the brand AND the full product name are both clearly readable on the label."
      }
    },
    required: ["barcode", "code_complete", "brand", "name", "size", "category", "label_complete"]
  }
};
async function readStockPhoto(imageBase64, mediaType, business) {
  const r = await callTool(STOCK_PHOTO_TOOL, [
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    {
      type: "text",
      text: `A staff member photographed a ${business.itemNoun} to log it in or out of inventory. Read the barcode number or SKU if one is fully visible, and the brand, product name and size from the label. Prefer one of these categories: ${business.categories.join(", ")}. Never guess a digit or a word: leave it empty and mark it incomplete instead.`
    }
  ], { maxTokens: 400 });
  if (!r.ok) {
    return { ok: false, message: r.message.replace("The AI couldn't answer just now.", "Couldn't read that photo.") };
  }
  const code = clean(r.input.barcode, 40).replace(/[^0-9A-Za-z-]/g, "");
  const brand = clean(r.input.brand);
  const name = clean(r.input.name);
  const base = { brand, name, size: clean(r.input.size, 40), category: clean(r.input.category, 60) };
  if (code.length >= 4 && r.input.code_complete === true) {
    return { ok: true, captured: "sku", barcode: code, ...base };
  }
  if (brand && name && r.input.label_complete === true) {
    return { ok: true, captured: "label", barcode: "", ...base };
  }
  return {
    ok: false,
    message: "Retake the photo so the whole SKU or barcode number, or the full front label (brand and product name), is clear."
  };
}
const SUGGEST_TOOL = {
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
        description: "Estimated per-unit wholesale / distributor cost to a small business in USD. 0 if you have no idea."
      },
      retail_price: { type: "number", description: "Estimated typical US retail / menu price per unit in USD. 0 if unknown." },
      note: { type: "string", description: "One short sentence on how confident the price estimate is and what it's based on." }
    },
    required: ["brand", "name", "size", "category", "wholesale_cost", "retail_price", "note"]
  }
};
function toCents(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100), 1e7) : 0;
}
async function suggestProductDetails(fields, business) {
  const known = Object.entries(fields).filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`).join("\n");
  if (!known) return { ok: false, message: "Type at least a product name first." };
  const r = await callTool(
    SUGGEST_TOOL,
    [
      {
        type: "text",
        text: `A small business is adding a ${business.itemNoun} to its inventory. Here is what staff typed:
${known}

Fix spelling and capitalisation, fill in anything missing that you're confident about, and estimate typical US wholesale cost and retail price per unit. Categories this business uses: ${business.categories.join(", ")}. Leave fields empty rather than inventing details.`
      }
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 2e4 }
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
    note: clean(r.input.note, 200)
  };
}
function spokenTool(itemNoun, categories) {
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
        retail: { type: "number", description: "Per-unit retail or selling price in USD if said, else 0." }
      },
      required: ["brand", "name", "size", "category", "vendor", "qty", "par", "cost", "retail"]
    }
  };
}
function toCount(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1e5) : null;
}
async function parseSpokenProduct(transcript, business) {
  const r = await callTool(
    spokenTool(business.itemNoun, business.categories),
    [
      {
        type: "text",
        text: `Staff at a small business dictated details for a ${business.itemNoun} they're adding to inventory. Speech recognition wrote:
"${transcript}"

Pull out only what they said. Fix words speech recognition commonly mishears in brand and product names, turn spoken numbers into digits ("eight fifty" as a price = 8.50, "a dozen" = 12), and leave fields empty (or -1 / 0 for numbers) when they weren't mentioned.`
      }
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 2e4 }
  );
  if (!r.ok) return r;
  const result = {
    ok: true,
    brand: clean(r.input.brand),
    name: clean(r.input.name),
    size: clean(r.input.size, 40),
    category: clean(r.input.category, 60),
    vendor: clean(r.input.vendor, 120),
    qty: toCount(r.input.qty),
    par: toCount(r.input.par),
    unitCostCents: toCents(r.input.cost),
    retailPriceCents: toCents(r.input.retail)
  };
  if (!result.name && !result.brand && !result.unitCostCents && !result.retailPriceCents && result.qty === null) {
    return { ok: false, message: "Couldn't pick out product details. Try saying the brand and product name." };
  }
  return result;
}
function receiptTool(categories) {
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
        note: { type: "string", description: "Very short summary of what was bought, under 60 characters." }
      },
      required: ["total", "vendor", "date", "category", "note"]
    }
  };
}
async function readReceipt(imageBase64, mediaType, categories) {
  const r = await callTool(receiptTool(categories), [
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    { type: "text", text: "Read this receipt or invoice and record the total, vendor, date, category and a short note." }
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
    note: clean(r.input.note, 120)
  };
}
function extractTool(categories) {
  return {
    name: "record_line_items",
    description: "Record every product line item in the document.",
    input_schema: {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: ["inventory", "receipt"],
          description: "inventory = a stock list / count sheet of what is on hand. receipt = a vendor invoice, packing slip or receipt for stock bought."
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
                description: "Units: on-hand count for inventory lists, units received for invoices (cases × units per case when a pack size is shown). -1 if not shown."
              },
              unit_cost: { type: "number", description: "Cost per single unit in USD before tax. 0 if not shown." },
              retail_price: { type: "number", description: "Retail / selling price per unit in USD. 0 if not shown." }
            },
            required: ["code", "name", "brand", "size", "category", "qty", "unit_cost", "retail_price"]
          }
        }
      },
      required: ["document_type", "vendor", "date", "items"]
    }
  };
}
function toQty(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1e6) : null;
}
async function extractImportDocument(file, business) {
  const doc = file.mediaType === "application/pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } } : { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.data } };
  const r = await callTool(
    extractTool(business.categories),
    [
      doc,
      {
        type: "text",
        text: `This is an inventory spreadsheet, vendor invoice or receipt for a small business that stocks ${business.itemNoun}s. Record every product line item exactly as printed. Keep text short and leave fields empty rather than guessing.`
      }
    ],
    { maxTokens: 8e3, timeoutMs: 55e3 }
  );
  if (!r.ok) return r;
  const items = Array.isArray(r.input.items) ? r.input.items : [];
  const lines = items.map((i) => ({
    barcode: clean(i.code, 60),
    name: clean(i.name),
    brand: clean(i.brand),
    size: clean(i.size, 40),
    category: clean(i.category, 60),
    qty: toQty(i.qty),
    unitCostCents: toCents(i.unit_cost),
    retailPriceCents: toCents(i.retail_price)
  })).filter((l) => l.name || l.barcode);
  if (lines.length === 0) {
    return { ok: false, message: "No product lines found in that file. Try a clearer scan or a CSV export." };
  }
  const date = clean(r.input.date, 10);
  return {
    ok: true,
    docType: r.input.document_type === "receipt" ? "receipt" : "inventory",
    vendor: clean(r.input.vendor, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    lines
  };
}
const CSV_FIELDS = ["barcode", "name", "brand", "size", "category", "vendor", "qty", "unit_cost", "retail_price"];
const CSV_MAP_TOOL = {
  name: "map_columns",
  description: "Say which spreadsheet column holds each inventory field.",
  input_schema: {
    type: "object",
    properties: {
      header_row: { type: "number", description: "0-based index of the header row among the rows shown. -1 if there is no header." },
      document_type: {
        type: "string",
        enum: ["inventory", "receipt"],
        description: "inventory = stock on hand list. receipt = invoice / order / delivery of stock bought."
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
              retail_price: "Column index of the per-unit selling / retail price."
            }[f] + " -1 if none."
          }
        ])
      )
    },
    required: ["header_row", "document_type", ...CSV_FIELDS]
  }
};
async function mapCsvColumns(sample) {
  const table = sample.map((row, i) => `${i}: ${row.map((c, j) => `[${j}] ${c.slice(0, 40)}`).join(" | ")}`).join("\n");
  const r = await callTool(
    CSV_MAP_TOOL,
    [{ type: "text", text: `Here are the first rows of a small business's inventory spreadsheet or supplier invoice export:
${table}` }],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 2e4 }
  );
  if (!r.ok) return r;
  const width = Math.max(...sample.map((row) => row.length));
  const col = (v) => {
    const n = Math.round(Number(v));
    return Number.isInteger(n) && n >= 0 && n < width ? n : -1;
  };
  const headerRow = Math.round(Number(r.input.header_row));
  return {
    ok: true,
    mapping: {
      headerRow: Number.isInteger(headerRow) && headerRow >= -1 && headerRow < sample.length ? headerRow : 0,
      docType: r.input.document_type === "receipt" ? "receipt" : "inventory",
      columns: Object.fromEntries(CSV_FIELDS.map((f) => [f, col(r.input[f])]))
    }
  };
}
const BATCH_PRICE_TOOL = {
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
            retail_price: { type: "number", description: "Typical US retail / menu price per unit in USD. 0 if unknown." }
          },
          required: ["index", "wholesale_cost", "retail_price"]
        }
      }
    },
    required: ["prices"]
  }
};
async function estimatePricesBatch(items, business) {
  const list = items.map((i, n) => `${n}: ${[i.brand, i.name, i.size].filter(Boolean).join(" ")}${i.category ? ` (${i.category})` : ""}`).join("\n");
  const r = await callTool(
    BATCH_PRICE_TOOL,
    [
      {
        type: "text",
        text: `A small business stocks ${business.itemNoun}s. Estimate typical US per-unit wholesale cost and retail price for each item:
${list}`
      }
    ],
    { model: SUGGEST_MODEL, maxTokens: 2500, timeoutMs: 4e4 }
  );
  if (!r.ok) return r;
  const prices = items.map(() => ({ unitCostCents: 0, retailPriceCents: 0 }));
  const rows = Array.isArray(r.input.prices) ? r.input.prices : [];
  for (const row of rows) {
    const i = Math.round(Number(row.index));
    if (prices[i]) prices[i] = { unitCostCents: toCents(row.wholesale_cost), retailPriceCents: toCents(row.retail_price) };
  }
  return { ok: true, prices };
}
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
  "thredup.com"
];
const PRO_DISTRIBUTORS = {
  salon: "SalonCentric, CosmoProf, Salon Service Group, Armstrong McCall, Beauty Systems Group",
  barber: "SalonCentric, CosmoProf, Armstrong McCall, Salon Service Group",
  nails: "CosmoProf, SalonCentric, the brand's professional store",
  brows: "CosmoProf, SalonCentric, Universal Companies, the brand's professional store",
  tattoo: "Kingpin Tattoo Supply, Painful Pleasures, Worldwide Tattoo Supply, the ink or needle maker's own store",
  spa: "Universal Companies, CosmoProf, the brand's professional store",
  bar: "the business's licensed distributor (for example Southern Glazer's, RNDC, Breakthru Beverage)"
};
const DEFAULT_DISTRIBUTORS = "SalonCentric, CosmoProf, Salon Service Group, Armstrong McCall, Kingpin Tattoo Supply, Universal Companies";
const MARKETPLACES = ["amazon.com", "walmart.com", "target.com"];
function isResaleUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return RESALE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
const RECORD_PRICE_TOOL = {
  name: "record_price",
  description: "Record the most accurate current price found for the product. Call this exactly once, at the end.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "True if a listing for this exact product (same size) was found on an allowed source." },
      retail_price: {
        type: "number",
        description: "Regular per-unit retail price / MSRP in USD from the brand's site or the supplier's listing. 0 if not found."
      },
      unit_cost: {
        type: "number",
        description: "Per-unit professional / wholesale price in USD the business would pay its supplier or a pro distributor, if a source shows it. 0 if not shown — do not guess."
      },
      source_name: { type: "string", description: "Site the main price came from, e.g. 'SalonCentric', 'Salon Service Group', 'Kingpin Tattoo Supply', 'Redken.com'." },
      source_url: { type: "string", description: "Exact product page URL the price came from." },
      source_type: { type: "string", enum: ["manufacturer", "distributor", "amazon"] },
      note: {
        type: "string",
        description: "One short sentence: pack size / per-unit maths, sale vs regular price, or why nothing reliable was found."
      }
    },
    required: ["found", "retail_price", "unit_cost", "source_name", "source_url", "source_type", "note"]
  }
};
async function findWebPrice(fields, business) {
  const label = [fields.brand, fields.name, fields.size].filter((v) => v.trim()).join(" ");
  if (!fields.name.trim()) return { ok: false, message: "Add a product name first." };
  if (!anthropicEndpoint()) return { ok: false, message: "AI help isn't available on this deploy yet." };
  const vendor = fields.vendor.trim();
  const distributors = PRO_DISTRIBUTORS[business.id ?? ""] ?? DEFAULT_DISTRIBUTORS;
  const allowedMarket = MARKETPLACES.filter((d) => vendor && vendor.toLowerCase().includes(d.split(".")[0]));
  const blocked = [...RESALE_DOMAINS, ...MARKETPLACES.filter((d) => !allowedMarket.includes(d))];
  const prompt = `Find what a professional ${business.itemNoun.replace(/ product$/, "")} business pays for this ${business.itemNoun}, and its suggested retail price, in the US:
${label}${fields.barcode && /^\d{8,14}$/.test(fields.barcode) ? `
UPC/EAN: ${fields.barcode}` : ""}${vendor ? `
This business buys it from: ${vendor}` : ""}

Where to look, in this order — stop at the first that lists this exact product and size:
1. ${vendor ? `${vendor} (the business's own supplier) — its professional price is the cost.` : "(no supplier on file, skip)"}
2. Professional distributors that service providers buy from: ${distributors}. Their pro / wholesale price is the cost.
3. The brand or manufacturer's own website (its professional/wholesale price if shown publicly, and its regular retail price / MSRP).
${allowedMarket.length ? `4. ${allowedMarket.join(", ")} — only because the business buys this item there; only listings sold by the retailer itself or the brand's official store.` : ""}

Never use resale, auction, marketplace or third-party seller listings (eBay, Poshmark, Mercari, Etsy, Amazon or Walmart third-party sellers, discount liquidators, price-comparison sites).
- Match the exact product and size. For a multi-pack or case, divide to a per-unit price and say so in the note.
- unit_cost = what the professional pays per unit (distributor or brand pro price). Only report it if a source shows it; otherwise 0.
- retail_price = the brand's regular retail price / MSRP per unit (or the supplier's listed retail price).
- Prefer regular prices; if only a sale price is shown, use it and mention the sale.
When done, call record_price once.`;
  const messages = [{ role: "user", content: prompt }];
  const call = async (forceRecord) => {
    const res = await postToClaude(
      {
        model: LABEL_MODEL,
        max_tokens: 1500,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 6, blocked_domains: blocked },
          RECORD_PRICE_TOOL
        ],
        tool_choice: forceRecord ? { type: "tool", name: RECORD_PRICE_TOOL.name } : { type: "auto" },
        messages
      },
      75e3,
      "web price"
    );
    if (!res || !res.ok) return null;
    return await res.json();
  };
  try {
    let record;
    for (let turn = 0; turn < 4 && !record; turn++) {
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
      const blockedHost = (() => {
        try {
          const host = new URL(url).hostname.replace(/^www\./, "");
          return blocked.some((d) => host === d || host.endsWith(`.${d}`));
        } catch {
          return false;
        }
      })();
      if (record.found && (retail || cost) && !isResaleUrl(url) && !blockedHost) {
        return {
          ok: true,
          unitCostCents: cost,
          retailPriceCents: retail,
          sourceName: clean(record.source_name, 120),
          sourceUrl: /^https?:\/\//.test(url) ? url : "",
          sourceType,
          note: clean(record.note, 240)
        };
      }
      if (!record.found) {
        const estimate = await webPriceFallback(fields, business);
        if (estimate.ok) {
          return { ...estimate, note: `No listing found at your supplier, pro distributors or the brand's site. ${estimate.note}`.trim() };
        }
        return { ok: false, message: clean(record.note, 240) || "No reliable listing found for this product." };
      }
    }
  } catch (error) {
    console.error("AI web price error", error);
  }
  return webPriceFallback(fields, business);
}
async function webPriceFallback(fields, business) {
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
    note: `Not verified on a live listing. ${r.note}`.trim()
  };
}
const SUMMARY_TOOL = {
  name: "write_summary",
  description: "Write the short summary shown at the top of the report email and app pop-up.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2–4 plain sentences for a busy owner: what stands out, what to do this week, and any money figure worth knowing. No greeting, no markdown."
      }
    },
    required: ["summary"]
  }
};
async function writeInsightSummary(kind, facts, business) {
  const focus = {
    weekly: "what is selling very well this week (with the expected profit) and what staff are using most in services, and whether to stock deeper on either. Items marked USED were not sold — never call them sales or give them profit",
    monthly: "items that are barely being used (especially color and retail lines), the cash tied up in them, what to do (promote, bundle, return, stop reordering), and prices that need updating",
    fast: "items selling out fast, how soon they run out, what to buy in higher volume and the predicted cost"
  }[kind];
  const r = await callTool(
    SUMMARY_TOOL,
    [
      {
        type: "text",
        text: `You're the stock advisor for a small business that stocks ${business.itemNoun}s. Summarise ${focus}. Only use the numbers given.

${facts}`
      }
    ],
    { model: SUGGEST_MODEL, maxTokens: 400, timeoutMs: 25e3 }
  );
  return r.ok ? clean(r.input.summary, 900) : "";
}
async function pingAI() {
  const endpoints = anthropicEndpoints();
  if (endpoints.length === 0) return { ok: false, route: "", detail: "No AI key on this site (add BINTRO_ANTHROPIC_KEY).", routes: [] };
  const names = {
    "anthropic-own-key": "Your Anthropic key (BINTRO_ANTHROPIC_KEY)",
    "anthropic-direct": "ANTHROPIC_API_KEY",
    "anthropic-env": "Netlify AI (ANTHROPIC_*)",
    "netlify-gateway": "Netlify AI Gateway"
  };
  const routes = [];
  for (const endpoint of endpoints) {
    let status = 0;
    let text = "";
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        signal: AbortSignal.timeout(2e4),
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", ...endpoint.headers },
        body: JSON.stringify({ model: SUGGEST_MODEL, max_tokens: 5, messages: [{ role: "user", content: "Reply with OK." }] })
      });
      status = res.status;
      text = res.ok ? "" : (await res.text().catch(() => "")).slice(0, 300);
    } catch (error) {
      text = error instanceof Error ? error.message : "no response";
    }
    const note = status >= 200 && status < 300 ? "Working" : status === 401 ? "Key rejected. Check it was pasted in full, with no spaces." : status === 400 && /credit/i.test(text) ? "No credit left. Add some under Billing at console.anthropic.com." : status === 404 && /model/i.test(text) ? "Model not available on this key." : status ? `Answered ${status}${text ? `: ${text.replace(/\s+/g, " ").slice(0, 140)}` : ""}` : `No answer (${text})`;
    console.log(`AI setup check ${endpoint.label}: ${status} ${text.slice(0, 200)}`);
    routes.push({ label: names[endpoint.label] ?? endpoint.label, status, note });
  }
  const working = routes.find((r) => r.status >= 200 && r.status < 300);
  return {
    ok: Boolean(working),
    route: working?.label ?? "",
    detail: working ? "" : routes.map((r) => `${r.label}: ${r.note}`).join(" · "),
    routes
  };
}
export {
  CSV_FIELDS as C,
  readStockPhoto as a,
  readReceipt as b,
  pingAI as c,
  extractImportDocument as d,
  estimatePricesBatch as e,
  findWebPrice as f,
  lookupBarcodeOnline as l,
  mapCsvColumns as m,
  parseSpokenProduct as p,
  readProductLabel as r,
  suggestProductDetails as s,
  writeInsightSummary as w
};
