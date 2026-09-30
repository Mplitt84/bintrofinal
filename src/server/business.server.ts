import { and, asc, desc, eq, gt, gte, inArray, like, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { budgets, businessProfile, expenses, movements, productCategories, products, teamMembers } from "../../db/schema.js";
import { EMPTY_PROFILE, businessTypeById, type BusinessProfile, type BusinessType } from "../lib/business-types.js";
import { DEFAULT_TAX_GROUP, isTaxGroupId, type ProductCategory, type TaxGroupId } from "../lib/tax-categories.js";

const PROFILE_ID = 1;

export async function findBusinessProfile(): Promise<BusinessProfile> {
  const rows = await db.select().from(businessProfile).where(eq(businessProfile.id, PROFILE_ID));
  const row = rows[0];
  if (!row) return { ...EMPTY_PROFILE };
  return {
    name: row.name,
    businessType: row.businessType,
    email: row.email,
    phone: row.phone,
    address: row.address,
    website: row.website,
    orderEmail: row.orderEmail,
    monthlyBudgetCents: row.monthlyBudgetCents,
    weeklyReportEmail: row.weeklyReportEmail,
    monthlyReportEmail: row.monthlyReportEmail,
    fastMoverAlertEmail: row.fastMoverAlertEmail,
  };
}

export async function saveBusinessProfile(data: Partial<BusinessProfile>) {
  const values = { ...data, updatedAt: new Date() };
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, ...values, id: PROFILE_ID })
    .onConflictDoUpdate({ target: businessProfile.id, set: values });
  return findBusinessProfile();
}

// --- Product categories ------------------------------------------------------

export async function findProductCategories(): Promise<ProductCategory[]> {
  const rows = await db.select().from(productCategories).orderBy(asc(productCategories.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    taxGroup: isTaxGroupId(r.taxGroup) ? r.taxGroup : DEFAULT_TAX_GROUP,
  }));
}

/** Adds categories (or re-files existing ones under a new tax group). Names match case-insensitively. */
export async function upsertProductCategories(items: { name: string; taxGroup: TaxGroupId }[]) {
  const existing = await findProductCategories();
  const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));
  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;
    const found = byName.get(name.toLowerCase());
    if (found) {
      if (found.taxGroup !== item.taxGroup) {
        await db.update(productCategories).set({ taxGroup: item.taxGroup }).where(eq(productCategories.id, found.id));
      }
    } else {
      await db.insert(productCategories).values({ name, taxGroup: item.taxGroup }).onConflictDoNothing();
      byName.set(name.toLowerCase(), { id: 0, name, taxGroup: item.taxGroup });
    }
  }
  return findProductCategories();
}

export async function deleteProductCategories(ids: number[]) {
  if (ids.length) await db.delete(productCategories).where(inArray(productCategories.id, ids));
  return findProductCategories();
}

/**
 * The business type for AI prompts, preferring the business's own category
 * list once it has one so AI picks from categories the accountant knows.
 */
export async function findBusinessContext(): Promise<BusinessType> {
  const [profile, categories] = await Promise.all([findBusinessProfile(), findProductCategories()]);
  const type = businessTypeById(profile.businessType);
  return categories.length ? { ...type, categories: categories.map((c) => c.name) } : type;
}

export async function findTeamMembers() {
  return db.select().from(teamMembers).orderBy(asc(teamMembers.name));
}

export async function insertTeamMember(name: string) {
  await db.insert(teamMembers).values({ name }).onConflictDoNothing();
  return findTeamMembers();
}

export async function deleteTeamMember(id: number) {
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
  return findTeamMembers();
}

export type ExpenseInput = {
  spentOn: string;
  amountCents: number;
  category?: string;
  vendor?: string;
  note?: string;
  staffName?: string;
};

export async function insertExpense(data: ExpenseInput) {
  const [row] = await db
    .insert(expenses)
    .values({
      spentOn: data.spentOn,
      amountCents: data.amountCents,
      category: data.category ?? "",
      vendor: data.vendor ?? "",
      note: data.note ?? "",
      staffName: data.staffName ?? "",
    })
    .returning();
  return row;
}

export async function updateExpense(id: number, data: Partial<ExpenseInput>) {
  const [row] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
  return row;
}

export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function findExpensesForMonth(month: string) {
  return db
    .select()
    .from(expenses)
    .where(like(expenses.spentOn, `${month}-%`))
    .orderBy(desc(expenses.spentOn), desc(expenses.id));
}

export async function findExpensesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(expenses).where(inArray(expenses.id, ids));
}

export async function setMonthBudget(month: string, amountCents: number | null) {
  if (amountCents === null) {
    await db.delete(budgets).where(eq(budgets.month, month));
    return;
  }
  await db
    .insert(budgets)
    .values({ month, amountCents })
    .onConflictDoUpdate({ target: budgets.month, set: { amountCents } });
}

export type MonthWindow = { key: string; start: string; end: string };

/** Stock received (scanned in) in a window, priced at each product's current unit cost. */
async function inventorySpend(start: Date, end: Date) {
  return db
    .select({
      vendor: sql<string>`coalesce(nullif(${products.vendor}, ''), nullif(${products.brand}, ''), 'Unassigned')`,
      units: sql<number>`coalesce(sum(${movements.delta}), 0)::int`,
      cents: sql<number>`coalesce(sum(${movements.delta} * ${products.unitCostCents}), 0)::int`,
    })
    .from(movements)
    .innerJoin(products, eq(movements.productId, products.id))
    .where(
      and(
        inArray(movements.type, ["in", "receive"]),
        gt(movements.delta, 0),
        gte(movements.createdAt, start),
        lt(movements.createdAt, end),
      ),
    )
    .groupBy(sql`1`);
}

/** Stock received in a window grouped by product category, so it can roll up to tax groups. */
async function inventorySpendByCategory(start: Date, end: Date) {
  return db
    .select({
      category: products.category,
      cents: sql<number>`coalesce(sum(${movements.delta} * ${products.unitCostCents}), 0)::int`,
    })
    .from(movements)
    .innerJoin(products, eq(movements.productId, products.id))
    .where(
      and(
        inArray(movements.type, ["in", "receive"]),
        gt(movements.delta, 0),
        gte(movements.createdAt, start),
        lt(movements.createdAt, end),
      ),
    )
    .groupBy(products.category);
}

/**
 * Month-by-month spend for the Budget tab: stock received (from scans) plus
 * logged expenses, against that month's budget.
 */
export async function computeBudgetOverview(months: MonthWindow[]) {
  const profile = await findBusinessProfile();
  const keys = months.map((m) => m.key);
  const overrides = keys.length ? await db.select().from(budgets).where(inArray(budgets.month, keys)) : [];
  const overrideByMonth = new Map(overrides.map((b) => [b.month, b.amountCents]));

  return Promise.all(
    months.map(async (m) => {
      const [vendors, stockCategories, expenseRows] = await Promise.all([
        inventorySpend(new Date(m.start), new Date(m.end)),
        inventorySpendByCategory(new Date(m.start), new Date(m.end)),
        db
          .select({
            category: expenses.category,
            cents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
          })
          .from(expenses)
          .where(like(expenses.spentOn, `${m.key}-%`))
          .groupBy(expenses.category),
      ]);
      const inventoryCents = vendors.reduce((s, v) => s + Number(v.cents), 0);
      const expenseCents = expenseRows.reduce((s, e) => s + Number(e.cents), 0);
      return {
        month: m.key,
        budgetCents: overrideByMonth.get(m.key) ?? profile.monthlyBudgetCents,
        hasOverride: overrideByMonth.has(m.key),
        inventoryCents,
        expenseCents,
        vendors: vendors
          .map((v) => ({ vendor: v.vendor, units: Number(v.units), cents: Number(v.cents) }))
          .sort((a, b) => b.cents - a.cents),
        stockCategories: stockCategories
          .map((c) => ({ category: c.category, cents: Number(c.cents) }))
          .filter((c) => c.cents !== 0),
        categories: expenseRows
          .map((e) => ({ category: e.category || "Other", cents: Number(e.cents) }))
          .sort((a, b) => b.cents - a.cents),
      };
    }),
  );
}

export { inventorySpend as findInventorySpend };
