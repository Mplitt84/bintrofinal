import { requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyCounts, applyPars, categoryGroups, duplicateGroups, mergeCategoryNames, smartPars, undoParChange, categoryList, deleteCategoryName } from "./tidy.server.js";

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
    await mergeCategoryNames(data.from, data.to);
    return categoryGroups();
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
  .handler(async ({ data }) => ({ moved: await deleteCategoryName(data.name, data.moveTo), list: await categoryList() }));
