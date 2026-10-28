import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  computeBudgetOverview,
  deleteExpense,
  deleteProductCategories,
  deleteTeamMember,
  findBusinessContext,
  findBusinessProfile,
  findProductCategories,
  findExpensesForMonth,
  findTeamMembers,
  insertExpense,
  insertTeamMember,
  saveBusinessProfile,
  setMonthBudget,
  updateExpense,
  upsertProductCategories,
} from "./business.server.js";
import { readReceipt, suggestProductDetails } from "./product-lookup.server.js";
import {
  disconnectIntegration,
  importSquareCatalog,
  integrationStatus,
  pushMonthToQuickBooks,
  syncSquareSales,
} from "./integrations.server.js";
import { TAX_GROUPS, type TaxGroupId } from "../lib/tax-categories.js";
import { assertFeature, assertTeamRoom } from "./account.server.js";

const MONTH = z.string().regex(/^\d{4}-\d{2}$/);
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MonthWindowSchema = z.object({ key: MONTH, start: z.string(), end: z.string() });

export const getBusinessProfile = createServerFn({ method: "GET" }).handler(async () => {
  return findBusinessProfile();
});

const ProfileSchema = z.object({
  name: z.string().max(120).optional(),
  businessType: z.string().max(40).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  address: z.string().max(400).optional(),
  website: z.string().max(300).optional(),
  orderEmail: z.string().max(200).optional(),
  monthlyBudgetCents: z.number().int().min(0).max(1_000_000_000).optional(),
  weeklyReportEmail: z.boolean().optional(),
  monthlyReportEmail: z.boolean().optional(),
  fastMoverAlertEmail: z.boolean().optional(),
  palette: z.string().max(40).optional(),
});

export const updateBusinessProfile = createServerFn({ method: "POST" })
  .inputValidator(ProfileSchema)
  .handler(async ({ data }) => {
    const trimmed = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
    );
    return saveBusinessProfile(trimmed);
  });

export const listTeamMembers = createServerFn({ method: "GET" }).handler(async () => {
  return findTeamMembers();
});

export const addTeamMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    await assertTeamRoom();
    return insertTeamMember(data.name);
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    return deleteTeamMember(data.id);
  });

// --- Product categories ------------------------------------------------------

const TaxGroupSchema = z.enum(TAX_GROUPS.map((g) => g.id) as [TaxGroupId, ...TaxGroupId[]]);

export const listProductCategories = createServerFn({ method: "GET" }).handler(async () => {
  return findProductCategories();
});

/** Adds categories, or moves existing ones to a different tax group. */
export const saveProductCategories = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      items: z.array(z.object({ name: z.string().trim().min(1).max(60), taxGroup: TaxGroupSchema })).max(100),
    }),
  )
  .handler(async ({ data }) => {
    return upsertProductCategories(data.items);
  });

/** Removes categories from the list. Products keep their category text. */
export const removeProductCategories = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.number().int()).max(200) }))
  .handler(async ({ data }) => {
    return deleteProductCategories(data.ids);
  });

// --- Budget & expenses ------------------------------------------------------

export const getBudgetOverview = createServerFn({ method: "POST" })
  .inputValidator(z.object({ months: z.array(MonthWindowSchema).min(1).max(24) }))
  .handler(async ({ data }) => {
    return computeBudgetOverview(data.months);
  });

export const listExpenses = createServerFn({ method: "GET" })
  .inputValidator(z.object({ month: MONTH }))
  .handler(async ({ data }) => {
    return findExpensesForMonth(data.month);
  });

const ExpenseSchema = z.object({
  spentOn: DAY,
  amountCents: z.number().int().min(1).max(1_000_000_000),
  category: z.string().max(60).optional(),
  vendor: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  staffName: z.string().max(60).optional(),
});

export const createExpense = createServerFn({ method: "POST" })
  .inputValidator(ExpenseSchema)
  .handler(async ({ data }) => {
    await assertFeature("budget");
    return insertExpense(data);
  });

export const editExpense = createServerFn({ method: "POST" })
  .inputValidator(ExpenseSchema.partial().extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return updateExpense(id, rest);
  });

export const removeExpense = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await deleteExpense(data.id);
    return { ok: true };
  });

export const saveMonthBudget = createServerFn({ method: "POST" })
  .inputValidator(z.object({ month: MONTH, amountCents: z.number().int().min(0).max(1_000_000_000).nullable() }))
  .handler(async ({ data }) => {
    await setMonthBudget(data.month, data.amountCents);
    return { ok: true };
  });

// --- AI helpers ------------------------------------------------------------

const businessContext = findBusinessContext;

/** AI price detection + smart fill for the product form. */
export const suggestProduct = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      brand: z.string().max(160),
      name: z.string().max(200),
      size: z.string().max(60),
      category: z.string().max(80),
      vendor: z.string().max(120),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("ai");
    return suggestProductDetails(data, await businessContext());
  });

export const readReceiptPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      image: z.string().min(1).max(6_000_000),
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("budget");
    const business = await businessContext();
    return readReceipt(data.image, data.mediaType, business.expenseCategories);
  });

// --- Integrations ------------------------------------------------------------

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  return integrationStatus();
});

const ProviderSchema = z.object({ provider: z.enum(["square", "quickbooks"]) });

export const disconnect = createServerFn({ method: "POST" })
  .inputValidator(ProviderSchema)
  .handler(async ({ data }) => {
    await disconnectIntegration(data.provider);
    return integrationStatus();
  });

/** Wraps an integration call so the UI gets a message instead of a thrown error. */
async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; result: T } | { ok: false; message: string }> {
  try {
    return { ok: true, result: await fn() };
  } catch (error) {
    console.error("Integration error", error);
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export const squareImportCatalog = createServerFn({ method: "POST" }).handler(async () => {
  return attempt(async () => {
    await assertFeature("square");
    return importSquareCatalog();
  });
});

export const squareSyncSales = createServerFn({ method: "POST" }).handler(async () => {
  return attempt(async () => {
    await assertFeature("square");
    return syncSquareSales();
  });
});

export const quickbooksPushMonth = createServerFn({ method: "POST" })
  .inputValidator(MonthWindowSchema)
  .handler(async ({ data }) => {
    return attempt(async () => {
      await assertFeature("quickbooks");
      return pushMonthToQuickBooks(data);
    });
  });
