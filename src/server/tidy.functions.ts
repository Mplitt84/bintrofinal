import { requireUser } from "./auth.middleware";
import { categorySnapshot, saveSnapshot, vendorSnapshot } from "./trash.server.js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyCounts, applyPars, categoryGroups, duplicateGroups, mergeCategoryNames, smartPars, undoParChange, categoryList, deleteCategoryName, vendorGroups,
  vendorList,
  mergeVendorNames,
  renameVendor, deleteVendor, categorySuggestionsFor, applyProductTidy } from "./tidy.server.js";

export const getSmartPars = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => smartPars());

export const setPars = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      staffName: z.string().max(60).optional(),
      items: z.array(z.object({ productId: z.number().int().positive(), par: z.number().int().min(0).max(999), max: z.number().int().min(0).max(100_000).optional() })).max(2000),
    }),
  )
  .handler(async ({ data }) => applyPars(data.items, data.staffName ?? ""));

/** Restores the levels from before a Smart par apply. */
export const undoPars = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ batchId: z.string().min(1).max(80) }))
  .handler(async ({ data }) => undoParChange(data.batchId));

export const getCategoryGroups = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => categoryGroups());

export const mergeCategories = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ from: z.array(z.string().max(80)).min(2).max(30), to: z.string().trim().min(1).max(80) }))
  .handler(async ({ data }) => {
    const snap = await categorySnapshot(data.from.filter((f) => f !== data.to));
    await mergeCategoryNames(data.from, data.to);
    const undoId = await saveSnapshot("category", `Merged categories into ${data.to}`, snap);
    return { groups: await categoryGroups(), undoId };
  });

export const getDuplicateGroups = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => duplicateGroups());

/** Stock count: no plan needed — keeping counts right is the core of the app. */
export const saveCounts = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      staffName: z.string().max(60),
      counts: z.array(z.object({ productId: z.number().int().positive(), counted: z.number().int().min(0).max(100_000) })).min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => applyCounts(data));

export const getCategoryList = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => categoryList());

/** Deletes a category; its products move to `moveTo` (blank = no category). */
export const deleteCategory = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ name: z.string().min(1).max(80), moveTo: z.string().max(80) }))
  .handler(async ({ data }) => {
    const snap = await categorySnapshot([data.name]);
    const moved = await deleteCategoryName(data.name, data.moveTo);
    const undoId = await saveSnapshot("category", `Deleted category ${data.name}`, snap);
    return { moved, list: await categoryList(), undoId };
  });

/** Suppliers typed several ways, for Settings → Suppliers. */
export const getVendorGroups = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async () => vendorGroups());

/** Every supplier in use, with how many products carry it. */
export const getVendorList = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async () => vendorList());

/** Give several spellings of one supplier the single name that was kept. */
export const mergeVendors = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ from: z.array(z.string().max(120)).min(1).max(20), to: z.string().trim().min(1).max(120) }))
  .handler(async ({ data }) => {
    const snap = await vendorSnapshot(data.from.filter((f) => f !== data.to));
    const moved = await mergeVendorNames(data.from, data.to);
    return { moved, undoId: await saveSnapshot("supplier", `Merged suppliers into ${data.to}`, snap, { listed: false }) };
  });

/** Rename one supplier on every product that carries it. */
export const renameVendorFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ from: z.string().min(1).max(120), to: z.string().trim().min(1).max(120) }))
  .handler(async ({ data }) => {
    const snap = await vendorSnapshot([data.from]);
    const moved = await renameVendor(data.from, data.to);
    return { moved, undoId: await saveSnapshot("supplier", `Renamed ${data.from} to ${data.to}`, snap, { listed: false }) };
  });

/** Delete a supplier; its products move to `moveTo` (blank = no supplier). */
export const deleteVendorFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ name: z.string().min(1).max(120), moveTo: z.string().max(120) }))
  .handler(async ({ data }) => {
    const snap = await vendorSnapshot([data.name]);
    const moved = await deleteVendor(data.name, data.moveTo);
    return { moved, undoId: await saveSnapshot("supplier", `Deleted supplier ${data.name}`, snap) };
  });

/** Bintro's category guesses from each product's name and size, plus name / size tidying. */
export const getCategorySuggestions = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ recheck: z.boolean().default(false) }))
  .handler(async ({ data }) => categorySuggestionsFor(data.recheck));

const tidyItem = z.object({
  productId: z.number().int().positive(),
  category: z.string().max(80).optional(),
  name: z.string().max(200).optional(),
  size: z.string().max(60).optional(),
});

/** Applies the ticked fixes; returns the old values so the screen can undo. */
export const applyProductTidyFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ items: z.array(tidyItem).min(1).max(2000) }))
  .handler(async ({ data }) => applyProductTidy(data.items));
