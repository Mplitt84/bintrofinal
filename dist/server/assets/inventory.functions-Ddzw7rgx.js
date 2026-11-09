import { r as requireUser } from "./auth.middleware-2uPScvPU.js";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { f as findAllProducts, c as computeStats, a as findRecentMovements, b as findMovementsSince, d as findProductByBarcode, s as searchProductsByText, i as insertProduct, u as updateProductBarcode, e as findBarcodeOwner, g as findProductById, h as applyMovement, j as updateProductFields, k as deleteProductById, m as mergeProductsInto, r as reverseAndDeleteMovement, l as findBelowParProducts, n as buildPurchaseOrderLines } from "./inventory.server-DdbWwcaj.js";
import { s as sendRestockEmail, a as sendPurchaseOrderEmail } from "./email.server-2uKsRAsj.js";
import { l as lookupBarcodeOnline, r as readProductLabel, p as parseSpokenProduct, a as readStockPhoto } from "./product-lookup.server-C6LGgHTN.js";
import { f as findBusinessProfile, a as findBusinessContext } from "./business.server-WsLDvovH.js";
import { M as MAX_ORDER_QTY } from "./inventory-defaults-BnRHgx1T.js";
import { b as assertProductRoom, d as assertFeature, a as hasFeature } from "./account.server-Dnxw0Aoe.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:crypto";
import "drizzle-orm";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "./business-types-DKNVcfJE.js";
import "./purchase-order-1ZyUH4cu.js";
const listProducts_createServerFn_handler = createServerRpc({
  id: "ea3d7bea8c20602600fdb60763c4be2316202d598de73f0a4277d084c37c355f",
  name: "listProducts",
  filename: "src/server/inventory.functions.ts"
}, (opts) => listProducts.__executeServer(opts));
const listProducts = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(listProducts_createServerFn_handler, async () => {
  return findAllProducts();
});
const getStats_createServerFn_handler = createServerRpc({
  id: "3d2ac9b271549c34af9ee5dce1a7ea2b1a3bcbe29eebf79877cd5d28f2f53ae2",
  name: "getStats",
  filename: "src/server/inventory.functions.ts"
}, (opts) => getStats.__executeServer(opts));
const getStats = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getStats_createServerFn_handler, async () => {
  return computeStats();
});
const getRecentMovements_createServerFn_handler = createServerRpc({
  id: "b426e6454f76618fb04a0e57c79174475f6d80f701b87711ee5aa288a5097fd1",
  name: "getRecentMovements",
  filename: "src/server/inventory.functions.ts"
}, (opts) => getRecentMovements.__executeServer(opts));
const getRecentMovements = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator((data) => data).handler(getRecentMovements_createServerFn_handler, async ({
  data
}) => {
  return findRecentMovements(data.limit ?? 25);
});
const getMovementsSince_createServerFn_handler = createServerRpc({
  id: "d5932e99bf7f053e64a594d1fdf362428a631d07022086bdcf6f0a1e038509d3",
  name: "getMovementsSince",
  filename: "src/server/inventory.functions.ts"
}, (opts) => getMovementsSince.__executeServer(opts));
const getMovementsSince = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator((data) => data).handler(getMovementsSince_createServerFn_handler, async ({
  data
}) => {
  const since = data.since ? new Date(data.since) : null;
  return findMovementsSince(since && !Number.isNaN(since.getTime()) ? since : null);
});
const lookupBarcode_createServerFn_handler = createServerRpc({
  id: "f4c024d9a3eed139097ac8eda8cbd4a30e614f60477534a0ab157167c8019fcb",
  name: "lookupBarcode",
  filename: "src/server/inventory.functions.ts"
}, (opts) => lookupBarcode.__executeServer(opts));
const lookupBarcode = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator((data) => data).handler(lookupBarcode_createServerFn_handler, async ({
  data
}) => {
  return findProductByBarcode(data.barcode.trim());
});
const searchProducts_createServerFn_handler = createServerRpc({
  id: "8faec6748de68f1cf8ce6bfd57ca19807095ec135ffc3d4cdb0c2cb0363337c5",
  name: "searchProducts",
  filename: "src/server/inventory.functions.ts"
}, (opts) => searchProducts.__executeServer(opts));
const searchProducts = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator((data) => data).handler(searchProducts_createServerFn_handler, async ({
  data
}) => {
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
  maxQty: z.number().int().min(0).max(1e5).optional(),
  packSize: z.number().int().min(1).max(1e3).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2e3).optional()
});
const createProduct_createServerFn_handler = createServerRpc({
  id: "1687560e98c420e589f15a5fc2d2cc5d10a436e40b36b3eb6abb8c02197449b8",
  name: "createProduct",
  filename: "src/server/inventory.functions.ts"
}, (opts) => createProduct.__executeServer(opts));
const createProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(CreateProductSchema).handler(createProduct_createServerFn_handler, async ({
  data
}) => {
  await assertProductRoom();
  await assertBarcodeFree(data.barcode.trim());
  return insertProduct(data);
});
const linkBarcodeToProduct_createServerFn_handler = createServerRpc({
  id: "04be2dc3eebc2a4becde65112b9afb13adb203a17735c09bba4c8e90f72e118e",
  name: "linkBarcodeToProduct",
  filename: "src/server/inventory.functions.ts"
}, (opts) => linkBarcodeToProduct.__executeServer(opts));
const linkBarcodeToProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator((data) => data).handler(linkBarcodeToProduct_createServerFn_handler, async ({
  data
}) => {
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
  maxQty: z.number().int().min(0).max(1e5).optional(),
  packSize: z.number().int().min(1).max(1e3).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  qty: z.number().int().optional(),
  imageUrl: z.string().max(2e3).optional(),
  /** Additional barcodes / SKUs that also scan to this product. */
  extraBarcodes: z.array(z.string().max(64)).max(20).optional(),
  staffName: z.string().optional()
});
async function assertBarcodeFree(barcode, exceptId) {
  const owner = await findBarcodeOwner(barcode, exceptId);
  if (owner) throw new Error(`duplicate barcode: ${barcode} already belongs to ${owner.name}`);
}
const updateProduct_createServerFn_handler = createServerRpc({
  id: "739f1912b13ae2d1e9d0af1e4adb44800b626440c5bad7fbe3aa6b25465176b4",
  name: "updateProduct",
  filename: "src/server/inventory.functions.ts"
}, (opts) => updateProduct.__executeServer(opts));
const updateProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(UpdateProductSchema).handler(updateProduct_createServerFn_handler, async ({
  data
}) => {
  const {
    productId,
    qty,
    staffName,
    extraBarcodes,
    ...rest
  } = data;
  let extras;
  if (extraBarcodes !== void 0) {
    const current = await findProductById(productId);
    const main = current?.barcode ?? "";
    extras = Array.from(new Set(extraBarcodes.map((c) => c.trim()).filter((c) => c && c !== main)));
    for (const code of extras) await assertBarcodeFree(code, productId);
  }
  if (qty !== void 0) {
    let current = await findProductById(productId);
    if (current?.squareVariationId && qty !== current.qty) {
      try {
        const {
          syncSquareSalesIfConnected
        } = await import("./integrations.server-Bt4S1L6u.js");
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
        note: "Manual on-hand edit"
      });
    }
  }
  return updateProductFields(productId, extras === void 0 ? rest : {
    ...rest,
    extraBarcodes: extras
  });
});
const deleteProduct_createServerFn_handler = createServerRpc({
  id: "e3cddd74ca07b524e465399894018ec004151db4484866ec05390653eea5fbb7",
  name: "deleteProduct",
  filename: "src/server/inventory.functions.ts"
}, (opts) => deleteProduct.__executeServer(opts));
const deleteProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productId: z.number().int().positive()
})).handler(deleteProduct_createServerFn_handler, async ({
  data
}) => {
  return deleteProductById(data.productId);
});
const mergeProducts_createServerFn_handler = createServerRpc({
  id: "6467c210f1ed57f198690a8612b51bcdd7d4197117c6faf1fc3ad1ba62c8ca56",
  name: "mergeProducts",
  filename: "src/server/inventory.functions.ts"
}, (opts) => mergeProducts.__executeServer(opts));
const mergeProducts = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive()
})).handler(mergeProducts_createServerFn_handler, async ({
  data
}) => {
  return mergeProductsInto(data.sourceId, data.targetId);
});
const ScanSchema = z.object({
  barcode: z.string().min(1),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive(),
  staffName: z.string().optional()
});
const scanMovement_createServerFn_handler = createServerRpc({
  id: "de608114b50d09a009d436bb8aea3edac098b1a6367204486c56b9a251a539ee",
  name: "scanMovement",
  filename: "src/server/inventory.functions.ts"
}, (opts) => scanMovement.__executeServer(opts));
const scanMovement = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(ScanSchema).handler(scanMovement_createServerFn_handler, async ({
  data
}) => {
  const product = await findProductByBarcode(data.barcode.trim());
  if (!product) {
    return {
      status: "unknown",
      barcode: data.barcode.trim()
    };
  }
  const delta = data.type === "in" ? data.qty : -data.qty;
  const {
    product: updated,
    movement
  } = await applyMovement({
    productId: product.id,
    type: data.type,
    delta,
    staffName: data.staffName ?? ""
  });
  return {
    status: "ok",
    product: updated,
    movement
  };
});
const undoMovement_createServerFn_handler = createServerRpc({
  id: "0d694f5a8da3fad061ec4b881739a2d409b465c25ef86a11befd05d0ec15e2a0",
  name: "undoMovement",
  filename: "src/server/inventory.functions.ts"
}, (opts) => undoMovement.__executeServer(opts));
const undoMovement = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator((data) => data).handler(undoMovement_createServerFn_handler, async ({
  data
}) => {
  return reverseAndDeleteMovement(data.movementId);
});
const emailBelowPar_createServerFn_handler = createServerRpc({
  id: "e69c8c8b0366f38ebfbd47e7ce0d88323949432c4f643959422c476707ca5071",
  name: "emailBelowPar",
  filename: "src/server/inventory.functions.ts"
}, (opts) => emailBelowPar.__executeServer(opts));
const emailBelowPar = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator((data) => data).handler(emailBelowPar_createServerFn_handler, async ({
  data
}) => {
  const [items, profile] = await Promise.all([findBelowParProducts(), findBusinessProfile()]);
  return sendRestockEmail(items, (data.staffName ?? "").trim(), profile);
});
const OrderLineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(MAX_ORDER_QTY)
});
const PurchaseOrderSchema = z.object({
  lines: z.array(OrderLineSchema).min(1).max(500),
  staffName: z.string().optional(),
  note: z.string().max(500).optional()
});
const emailPurchaseOrder_createServerFn_handler = createServerRpc({
  id: "6dc7bab5a0f94bd3275b2c76fec2fa343f66b7aadb9fe590a1d9e79cabf926c5",
  name: "emailPurchaseOrder",
  filename: "src/server/inventory.functions.ts"
}, (opts) => emailPurchaseOrder.__executeServer(opts));
const emailPurchaseOrder = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(PurchaseOrderSchema).handler(emailPurchaseOrder_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("orders");
  const [lines, profile] = await Promise.all([buildPurchaseOrderLines(data.lines), findBusinessProfile()]);
  return sendPurchaseOrderEmail(lines, (data.staffName ?? "").trim(), (data.note ?? "").trim(), profile);
});
const lookupBarcodeDetails_createServerFn_handler = createServerRpc({
  id: "be6f8faa1b358b37786ef5ba3aa6ac47e341db0ae1b72c22975b3a3e562abc82",
  name: "lookupBarcodeDetails",
  filename: "src/server/inventory.functions.ts"
}, (opts) => lookupBarcodeDetails.__executeServer(opts));
const lookupBarcodeDetails = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator((data) => data).handler(lookupBarcodeDetails_createServerFn_handler, async ({
  data
}) => {
  return lookupBarcodeOnline(data.barcode.trim());
});
const LabelSchema = z.object({
  /** Base64 JPEG/PNG/WebP, already shrunk on the device before upload. */
  image: z.string().min(1).max(6e6),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"])
});
const readLabelPhoto_createServerFn_handler = createServerRpc({
  id: "c33f3e8f2d91dfc1479d0a17451f929c733f6c5e03e49d9073b2aadc07ae0be4",
  name: "readLabelPhoto",
  filename: "src/server/inventory.functions.ts"
}, (opts) => readLabelPhoto.__executeServer(opts));
const readLabelPhoto = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(LabelSchema).handler(readLabelPhoto_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("ai");
  return readProductLabel(data.image, data.mediaType, await findBusinessContext());
});
const readSpokenProduct_createServerFn_handler = createServerRpc({
  id: "03296ffa8e7c6513d87844145725c5215c0fad9b462343edb1da327e7019172f",
  name: "readSpokenProduct",
  filename: "src/server/inventory.functions.ts"
}, (opts) => readSpokenProduct.__executeServer(opts));
const readSpokenProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  transcript: z.string().trim().min(1).max(1e3)
})).handler(readSpokenProduct_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("ai");
  return parseSpokenProduct(data.transcript, await findBusinessContext());
});
const STOP_WORDS = /* @__PURE__ */ new Set(["the", "and", "for", "with", "fl", "oz", "ml", "of", "a"]);
function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9.]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}
function sizeKey(size) {
  return size.toLowerCase().replace(/[^0-9.]/g, "");
}
const readStockPhotoFn_createServerFn_handler = createServerRpc({
  id: "5f35fa34e4a2d5a018c585948359b6a403cc4a51937689b89e57232a7e0373b4",
  name: "readStockPhotoFn",
  filename: "src/server/inventory.functions.ts"
}, (opts) => readStockPhotoFn.__executeServer(opts));
const readStockPhotoFn = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(LabelSchema.extend({
  deviceBarcode: z.string().trim().max(64).optional()
})).handler(readStockPhotoFn_createServerFn_handler, async ({
  data
}) => {
  const device = data.deviceBarcode?.trim() ?? "";
  let read;
  if (device) {
    const ai = await hasFeature("ai") ? await readStockPhoto(data.image, data.mediaType, await findBusinessContext()).catch(() => null) : null;
    const extra = ai && ai.ok ? ai : {
      brand: "",
      name: "",
      size: "",
      category: ""
    };
    read = {
      ok: true,
      captured: "sku",
      barcode: device,
      brand: extra.brand,
      name: extra.name,
      size: extra.size,
      category: extra.category
    };
  } else {
    await assertFeature("ai");
    read = await readStockPhoto(data.image, data.mediaType, await findBusinessContext());
  }
  if (!read.ok) return read;
  if (read.barcode) {
    const product = await findProductByBarcode(read.barcode);
    if (product) return {
      ...read,
      product,
      candidates: [product]
    };
  }
  const wanted = words(`${read.brand} ${read.name}`);
  const wantedSize = sizeKey(read.size);
  if (wanted.length === 0) return {
    ...read,
    product: null,
    candidates: []
  };
  const scored = (await findAllProducts()).map((p) => {
    const have = new Set(words(`${p.brand} ${p.name}`));
    const hits = wanted.filter((w) => have.has(w)).length;
    let score = hits / Math.max(wanted.length, have.size);
    if (wantedSize && sizeKey(p.size) === wantedSize) score += 0.25;
    return {
      p,
      score,
      hits
    };
  }).filter((x) => x.hits >= Math.min(2, wanted.length)).sort((a, b) => b.score - a.score).slice(0, 5);
  return {
    ...read,
    product: null,
    candidates: scored.map((x) => x.p)
  };
});
const recordProductMovement_createServerFn_handler = createServerRpc({
  id: "4e453ef218bcaad133228783bdf43d236b2b5149aa3f05827d95d14448ef80ee",
  name: "recordProductMovement",
  filename: "src/server/inventory.functions.ts"
}, (opts) => recordProductMovement.__executeServer(opts));
const recordProductMovement = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productId: z.number().int().positive(),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive().max(MAX_ORDER_QTY),
  staffName: z.string().optional(),
  /** What the photo showed, for the activity log. */
  captured: z.enum(["sku", "label"]).optional()
})).handler(recordProductMovement_createServerFn_handler, async ({
  data
}) => {
  const product = await findProductById(data.productId);
  if (!product) throw new Error("That product no longer exists.");
  return applyMovement({
    productId: product.id,
    type: data.type,
    delta: data.type === "in" ? data.qty : -data.qty,
    staffName: data.staffName ?? "",
    note: data.captured ? `Photo: ${data.captured === "sku" ? "SKU / barcode" : "full label"}` : void 0
  });
});
const BulkChangesSchema = z.object({
  category: z.string().trim().max(80),
  vendor: z.string().trim().max(120),
  brand: z.string().trim().max(160),
  reorderThreshold: z.number().int().min(0).max(1e5),
  maxQty: z.number().int().min(0).max(1e5),
  packSize: z.number().int().min(1).max(1e3),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  unitCostCents: z.number().int().min(0).max(1e7),
  retailPriceCents: z.number().int().min(0).max(1e7)
}).partial();
const bulkUpdateProducts_createServerFn_handler = createServerRpc({
  id: "473a0c24e2e34c7b181501451d8fbc96ec6351ec3f1c69ffa77bf41f657e6af8",
  name: "bulkUpdateProducts",
  filename: "src/server/inventory.functions.ts"
}, (opts) => bulkUpdateProducts.__executeServer(opts));
const bulkUpdateProducts = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(2e3),
  changes: BulkChangesSchema
})).handler(bulkUpdateProducts_createServerFn_handler, async ({
  data
}) => {
  const changes = Object.fromEntries(Object.entries(data.changes).filter(([, v]) => v !== void 0));
  if (Object.keys(changes).length === 0) return {
    updated: 0
  };
  let updated = 0;
  for (let i = 0; i < data.productIds.length; i += 10) {
    const chunk = data.productIds.slice(i, i + 10);
    const rows = await Promise.all(chunk.map((id) => updateProductFields(id, changes)));
    updated += rows.filter(Boolean).length;
  }
  return {
    updated
  };
});
const bulkDeleteProducts_createServerFn_handler = createServerRpc({
  id: "7c5f50af97d50b9ab72780ff530d7d3ad36556de9a7937ff5bf96acb584a9d3c",
  name: "bulkDeleteProducts",
  filename: "src/server/inventory.functions.ts"
}, (opts) => bulkDeleteProducts.__executeServer(opts));
const bulkDeleteProducts = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(2e3)
})).handler(bulkDeleteProducts_createServerFn_handler, async ({
  data
}) => {
  let deleted = 0;
  for (const id of data.productIds) if (await deleteProductById(id)) deleted++;
  return {
    deleted
  };
});
export {
  bulkDeleteProducts_createServerFn_handler,
  bulkUpdateProducts_createServerFn_handler,
  createProduct_createServerFn_handler,
  deleteProduct_createServerFn_handler,
  emailBelowPar_createServerFn_handler,
  emailPurchaseOrder_createServerFn_handler,
  getMovementsSince_createServerFn_handler,
  getRecentMovements_createServerFn_handler,
  getStats_createServerFn_handler,
  linkBarcodeToProduct_createServerFn_handler,
  listProducts_createServerFn_handler,
  lookupBarcodeDetails_createServerFn_handler,
  lookupBarcode_createServerFn_handler,
  mergeProducts_createServerFn_handler,
  readLabelPhoto_createServerFn_handler,
  readSpokenProduct_createServerFn_handler,
  readStockPhotoFn_createServerFn_handler,
  recordProductMovement_createServerFn_handler,
  scanMovement_createServerFn_handler,
  searchProducts_createServerFn_handler,
  undoMovement_createServerFn_handler,
  updateProduct_createServerFn_handler
};
