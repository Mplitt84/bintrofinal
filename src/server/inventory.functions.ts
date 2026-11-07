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
  computeStats,
  findBelowParProducts,
  buildPurchaseOrderLines,
} from "./inventory.server.js";
import { sendPurchaseOrderEmail, sendRestockEmail } from "./email.server.js";
import { lookupBarcodeOnline, parseSpokenProduct, readProductLabel } from "./product-lookup.server.js";
import { findBusinessContext, findBusinessProfile } from "./business.server.js";
import { MAX_ORDER_QTY } from "../lib/inventory-defaults.js";
import { assertFeature, assertProductRoom } from "./account.server.js";

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  return findAllProducts();
});

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  return computeStats();
});

export const getRecentMovements = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number }) => data)
  .handler(async ({ data }) => {
    return findRecentMovements(data.limit ?? 25);
  });

export const getMovementsSince = createServerFn({ method: "GET" })
  .inputValidator((data: { since: string | null }) => data)
  .handler(async ({ data }) => {
    const since = data.since ? new Date(data.since) : null;
    return findMovementsSince(since && !Number.isNaN(since.getTime()) ? since : null);
  });

export const lookupBarcode = createServerFn({ method: "GET" })
  .inputValidator((data: { barcode: string }) => data)
  .handler(async ({ data }) => {
    return findProductByBarcode(data.barcode.trim());
  });

export const searchProducts = createServerFn({ method: "GET" })
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
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2000).optional(),
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator(CreateProductSchema)
  .handler(async ({ data }) => {
    await assertProductRoom();
    await assertBarcodeFree(data.barcode.trim());
    return insertProduct(data);
  });

export const linkBarcodeToProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: number; barcode: string }) => data)
  .handler(async ({ data }) => {
    await assertBarcodeFree(data.barcode.trim(), data.productId);
    return updateProductBarcode(data.productId, data.barcode.trim());
  });

const UpdateProductSchema = z.object({
  productId: z.number().int(),
  name: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  size: z.string().optional(),
  reorderThreshold: z.number().int().optional(),
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

export const updateProduct = createServerFn({ method: "POST" })
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
      const current = await findProductById(productId);
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

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    return deleteProductById(data.productId);
  });

const ScanSchema = z.object({
  barcode: z.string().min(1),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive(),
  staffName: z.string().optional(),
});

export const scanMovement = createServerFn({ method: "POST" })
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

export const undoMovement = createServerFn({ method: "POST" })
  .inputValidator((data: { movementId: number }) => data)
  .handler(async ({ data }) => {
    return reverseAndDeleteMovement(data.movementId);
  });

export const emailBelowPar = createServerFn({ method: "POST" })
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
export const emailPurchaseOrder = createServerFn({ method: "POST" })
  .inputValidator(PurchaseOrderSchema)
  .handler(async ({ data }) => {
    await assertFeature("orders");
    const [lines, profile] = await Promise.all([buildPurchaseOrderLines(data.lines), findBusinessProfile()]);
    return sendPurchaseOrderEmail(lines, (data.staffName ?? "").trim(), (data.note ?? "").trim(), profile);
  });

/** Looks an unknown barcode up in public product databases to pre-fill the new-product form. */
export const lookupBarcodeDetails = createServerFn({ method: "GET" })
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
export const readLabelPhoto = createServerFn({ method: "POST" })
  .inputValidator(LabelSchema)
  .handler(async ({ data }) => {
    await assertFeature("ai");
    return readProductLabel(data.image, data.mediaType, await findBusinessContext());
  });

/** Talk-to-text: turns a spoken product description into form fields with AI. */
export const readSpokenProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ transcript: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data }) => {
    await assertFeature("ai");
    return parseSpokenProduct(data.transcript, await findBusinessContext());
  });
