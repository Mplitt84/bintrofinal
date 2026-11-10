import { requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  findAllProducts,
  findProductByBarcode,
  findBarcodeOwner,
  findProductById,
  searchProductsByText,
  insertProduct,
  updateProductBarcode,
  updateProductFields,
  applyMovement,
  findRecentMovements,
  findMovementsSince,
  reverseAndDeleteMovement,
  deleteProductById,
  mergeProductsInto,
  computeStats,
  findBelowParProducts,
  buildPurchaseOrderLines,
} from "./inventory.server.js";
import { sendPurchaseOrderEmail, sendRestockEmail } from "./email.server.js";
import { lookupBarcodeOnline, parseSpokenProduct, readProductLabel, readStockPhoto } from "./product-lookup.server.js";
import { findBusinessContext, findBusinessProfile } from "./business.server.js";
import { MAX_ORDER_QTY } from "../lib/inventory-defaults.js";
import { assertFeature, assertProductRoom, hasFeature } from "./account.server.js";

export const listProducts = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => {
  return findAllProducts();
});

export const getStats = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => {
  return computeStats();
});

export const getRecentMovements = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator((data: { limit?: number }) => data)
  .handler(async ({ data }) => {
    return findRecentMovements(data.limit ?? 25);
  });

export const getMovementsSince = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator((data: { since: string | null }) => data)
  .handler(async ({ data }) => {
    const since = data.since ? new Date(data.since) : null;
    return findMovementsSince(since && !Number.isNaN(since.getTime()) ? since : null);
  });

export const lookupBarcode = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator((data: { barcode: string }) => data)
  .handler(async ({ data }) => {
    return findProductByBarcode(data.barcode.trim());
  });

export const searchProducts = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    if (!data.query.trim()) return [];
    return searchProductsByText(data.query.trim());
  });

const CreateProductSchema = z.object({
  barcode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  size: z.string().optional(),
  qty: z.number().int().optional(),
  reorderThreshold: z.number().int().optional(),
  maxQty: z.number().int().min(0).max(100_000).optional(),
  packSize: z.number().int().min(1).max(1000).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2000).optional(),
});

export const createProduct = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(CreateProductSchema)
  .handler(async ({ data }) => {
    await assertProductRoom();
    await assertBarcodeFree(data.barcode.trim());
    return insertProduct(data);
  });

/** Edit product → change its main barcode (throws "duplicate…" when another product has it). */
export const setProductBarcode = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ productId: z.number().int().positive(), barcode: z.string().trim().min(1).max(64) }))
  .handler(async ({ data }) => {
    await assertBarcodeFree(data.barcode, data.productId);
    return updateProductBarcode(data.productId, data.barcode);
  });

/**
 * "Link to an existing product" from the new-barcode sheet. The scanned code is
 * added as another SKU, so the product's own barcode keeps scanning; it only
 * becomes the main barcode when the product has none or a made-up one (BT- / SQ-).
 */
export const linkBarcodeToProduct = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ productId: z.number().int().positive(), barcode: z.string().trim().min(1).max(64) }))
  .handler(async ({ data }) => {
    const code = data.barcode;
    const product = await findProductById(data.productId);
    if (!product) return { ok: false as const, message: "That product isn't in Bintro any more." };
    const owner = await findBarcodeOwner(code, data.productId);
    if (owner) return { ok: false as const, message: `${code} already belongs to ${owner.name}.` };
    if (product.barcode === code || (product.extraBarcodes ?? []).includes(code)) return { ok: true as const, product };
    const placeholder = !product.barcode || /^(BT|SQ)-/i.test(product.barcode);
    const updated = placeholder
      ? await updateProductBarcode(data.productId, code)
      : await updateProductFields(data.productId, { extraBarcodes: [...(product.extraBarcodes ?? []), code] });
    return { ok: true as const, product: updated };
  });

const UpdateProductSchema = z.object({
  productId: z.number().int(),
  name: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  size: z.string().optional(),
  reorderThreshold: z.number().int().optional(),
  maxQty: z.number().int().min(0).max(100_000).optional(),
  packSize: z.number().int().min(1).max(1000).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  qty: z.number().int().optional(),
  imageUrl: z.string().max(2000).optional(),
  /** Additional barcodes / SKUs that also scan to this product. */
  extraBarcodes: z.array(z.string().max(64)).max(20).optional(),
  staffName: z.string().optional(),
});

/** Throws (with "duplicate" in the message, which the form shows as a clash) when another product scans with this code. */
async function assertBarcodeFree(barcode: string, exceptId?: number) {
  const owner = await findBarcodeOwner(barcode, exceptId);
  if (owner) throw new Error(`duplicate barcode: ${barcode} already belongs to ${owner.name}`);
}

export const updateProduct = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(UpdateProductSchema)
  .handler(async ({ data }) => {
    const { productId, qty, staffName, extraBarcodes, ...rest } = data;
    let extras: string[] | undefined;
    if (extraBarcodes !== undefined) {
      const current = await findProductById(productId);
      const main = current?.barcode ?? "";
      extras = Array.from(new Set(extraBarcodes.map((c) => c.trim()).filter((c) => c && c !== main)));
      for (const code of extras) await assertBarcodeFree(code, productId);
    }
    if (qty !== undefined) {
      let current = await findProductById(productId);
      if (current?.squareVariationId && qty !== current.qty) {
        // Count any Square sales first, so a hand count isn't later lowered again by sales it already reflects.
        try {
          const { syncSquareSalesIfConnected } = await import("./integrations.server.js");
          await syncSquareSalesIfConnected();
          current = await findProductById(productId);
        } catch (error) {
          console.error("Square sales sync before count failed", error);
        }
      }
      if (current && qty !== current.qty) {
        await applyMovement({
          productId,
          type: "adjust",
          delta: qty - current.qty,
          staffName: staffName ?? "",
          note: "Manual on-hand edit",
        });
      }
    }
    return updateProductFields(productId, extras === undefined ? rest : { ...rest, extraBarcodes: extras });
  });

export const deleteProduct = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ productId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    return deleteProductById(data.productId);
  });

/** Folds a duplicate into the real product (barcode, Square link, history) and removes the duplicate. */
export const mergeProducts = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ sourceId: z.number().int().positive(), targetId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    return mergeProductsInto(data.sourceId, data.targetId);
  });

const ScanSchema = z.object({
  barcode: z.string().min(1),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive(),
  staffName: z.string().optional(),
});

export const scanMovement = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(ScanSchema)
  .handler(async ({ data }) => {
    const product = await findProductByBarcode(data.barcode.trim());
    if (!product) {
      return { status: "unknown" as const, barcode: data.barcode.trim() };
    }

    const delta = data.type === "in" ? data.qty : -data.qty;
    const { product: updated, movement } = await applyMovement({
      productId: product.id,
      type: data.type,
      delta,
      staffName: data.staffName ?? "",
    });

    return { status: "ok" as const, product: updated, movement };
  });

export const undoMovement = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator((data: { movementId: number }) => data)
  .handler(async ({ data }) => {
    return reverseAndDeleteMovement(data.movementId);
  });

export const emailBelowPar = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator((data: { staffName?: string }) => data)
  .handler(async ({ data }) => {
    const [items, profile] = await Promise.all([findBelowParProducts(), findBusinessProfile()]);
    return sendRestockEmail(items, (data.staffName ?? "").trim(), profile);
  });

/** One ticked row from the Purchase Order tab: which product, and how many units. */
const OrderLineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(MAX_ORDER_QTY),
});

const PurchaseOrderSchema = z.object({
  lines: z.array(OrderLineSchema).min(1).max(500),
  staffName: z.string().optional(),
  note: z.string().max(500).optional(),
});

/**
 * Emails the purchase order staff assembled by hand. Only the lines sent from the
 * client are included, and product details are re-read from the database so the
 * vendor always gets current names, costs and on-hand counts.
 */
export const emailPurchaseOrder = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(PurchaseOrderSchema)
  .handler(async ({ data }) => {
    await assertFeature("orders");
    const [lines, profile] = await Promise.all([buildPurchaseOrderLines(data.lines), findBusinessProfile()]);
    return sendPurchaseOrderEmail(lines, (data.staffName ?? "").trim(), (data.note ?? "").trim(), profile);
  });

/** Looks an unknown barcode up in public product databases to pre-fill the new-product form. */
export const lookupBarcodeDetails = createServerFn({ method: "GET" }).middleware([requireUser])
  .inputValidator((data: { barcode: string }) => data)
  .handler(async ({ data }) => {
    return lookupBarcodeOnline(data.barcode.trim());
  });

const LabelSchema = z.object({
  /** Base64 JPEG/PNG/WebP, already shrunk on the device before upload. */
  image: z.string().min(1).max(6_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** Reads brand, product name and size off a photo of the product label with AI. */
export const readLabelPhoto = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(LabelSchema)
  .handler(async ({ data }) => {
    await assertFeature("ai");
    return readProductLabel(data.image, data.mediaType, await findBusinessContext());
  });

/** Talk-to-text: turns a spoken product description into form fields with AI. */
export const readSpokenProduct = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ transcript: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data }) => {
    await assertFeature("ai");
    return parseSpokenProduct(data.transcript, await findBusinessContext());
  });

const STOP_WORDS = new Set(["the", "and", "for", "with", "fl", "oz", "ml", "of", "a"]);
function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}
function sizeKey(size: string) {
  return size.toLowerCase().replace(/[^0-9.]/g, "");
}

/**
 * Quick stock photo: reads the SKU / barcode or the full label off a photo, then
 * finds the product. `deviceBarcode` is a code the phone already decoded from the
 * photo; it wins over the AI's reading. Returns the exact match (by code) or the
 * closest products by brand + name + size for staff to confirm.
 */
export const readStockPhotoFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(LabelSchema.extend({ deviceBarcode: z.string().trim().max(64).optional() }))
  .handler(async ({ data }) => {
    const device = data.deviceBarcode?.trim() ?? "";
    let read: Awaited<ReturnType<typeof readStockPhoto>>;
    if (device) {
      // The code itself is enough; the label is only a bonus for new products.
      const ai = (await hasFeature("ai"))
        ? await readStockPhoto(data.image, data.mediaType, await findBusinessContext()).catch(() => null)
        : null;
      const extra = ai && ai.ok ? ai : { brand: "", name: "", size: "", category: "" };
      read = { ok: true, captured: "sku", barcode: device, brand: extra.brand, name: extra.name, size: extra.size, category: extra.category };
    } else {
      await assertFeature("ai");
      read = await readStockPhoto(data.image, data.mediaType, await findBusinessContext());
    }
    if (!read.ok) return read;

    if (read.barcode) {
      const product = await findProductByBarcode(read.barcode);
      if (product) return { ...read, product, candidates: [product] };
    }

    const wanted = words(`${read.brand} ${read.name}`);
    const wantedSize = sizeKey(read.size);
    if (wanted.length === 0) return { ...read, product: null, candidates: [] };
    const scored = (await findAllProducts())
      .map((p) => {
        const have = new Set(words(`${p.brand} ${p.name}`));
        const hits = wanted.filter((w) => have.has(w)).length;
        let score = hits / Math.max(wanted.length, have.size);
        if (wantedSize && sizeKey(p.size) === wantedSize) score += 0.25;
        return { p, score, hits };
      })
      .filter((x) => x.hits >= Math.min(2, wanted.length))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { ...read, product: null, candidates: scored.map((x) => x.p) };
  });

/** Logs a scan in or out for a product picked by id (photo flow, where there may be no barcode). */
export const recordProductMovement = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      productId: z.number().int().positive(),
      type: z.enum(["in", "out"]),
      qty: z.number().int().positive().max(MAX_ORDER_QTY),
      staffName: z.string().optional(),
      /** What the photo showed, for the activity log. */
      captured: z.enum(["sku", "label"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const product = await findProductById(data.productId);
    if (!product) throw new Error("That product no longer exists.");
    return applyMovement({
      productId: product.id,
      type: data.type,
      delta: data.type === "in" ? data.qty : -data.qty,
      staffName: data.staffName ?? "",
      note: data.captured ? `Photo: ${data.captured === "sku" ? "SKU / barcode" : "full label"}` : undefined,
    });
  });

const BulkChangesSchema = z
  .object({
    category: z.string().trim().max(80),
    vendor: z.string().trim().max(120),
    brand: z.string().trim().max(160),
    reorderThreshold: z.number().int().min(0).max(100_000),
    maxQty: z.number().int().min(0).max(100_000),
    packSize: z.number().int().min(1).max(1000),
    expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    unitCostCents: z.number().int().min(0).max(100_000_00),
    retailPriceCents: z.number().int().min(0).max(100_000_00),
  })
  .partial();

/**
 * Bulk edit: applies the same changes to every selected product (only the fields
 * sent; counts are never touched). Runs a few products at a time.
 */
export const bulkUpdateProducts = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(2000), changes: BulkChangesSchema }))
  .handler(async ({ data }) => {
    const changes = Object.fromEntries(Object.entries(data.changes).filter(([, v]) => v !== undefined));
    if (Object.keys(changes).length === 0) return { updated: 0 };
    let updated = 0;
    for (let i = 0; i < data.productIds.length; i += 10) {
      const chunk = data.productIds.slice(i, i + 10);
      const rows = await Promise.all(chunk.map((id) => updateProductFields(id, changes)));
      updated += rows.filter(Boolean).length;
    }
    return { updated };
  });

/** Bulk delete: removes the selected products and their history (same as deleting one at a time). */
export const bulkDeleteProducts = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ productIds: z.array(z.number().int().positive()).min(1).max(2000) }))
  .handler(async ({ data }) => {
    let deleted = 0;
    for (const id of data.productIds) if (await deleteProductById(id)) deleted++;
    return { deleted };
  });
