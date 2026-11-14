import { and, asc, desc, eq, gt, gte, inArray, like, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businessId, mine, owned } from "./tenant.js";
import { budgets, businessProfile, clientFormulas, expenseReceipts, expenses, movements, productCategories, products, retailGoals, teamMembers } from "../../db/schema.js";
import { EMPTY_PROFILE, businessTypeById, type BusinessProfile, type BusinessType } from "../lib/business-types.js";
import { DEFAULT_TAX_GROUP, isTaxGroupId, type ProductCategory, type TaxGroupId } from "../lib/tax-categories.js";
import { deriveInitials } from "../lib/inventory-defaults.js";


export async function findBusinessProfile(): Promise<BusinessProfile> {
  const rows = await db.select().from(businessProfile).where(mine(businessProfile));
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
    palette: row.palette,
    orderEveryDays: row.orderEveryDays,
    taxState: row.taxState,
    retailCommissionPct: row.retailCommissionPct,
    currency: row.currency,
  };
}

export async function saveBusinessProfile(data: Partial<BusinessProfile>) {
  const values = { ...data, updatedAt: new Date() };
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, ...values, ...owned(), id: businessId() })
    .onConflictDoUpdate({ target: businessProfile.businessId, set: values });
  return findBusinessProfile();
}

// --- Product categories ------------------------------------------------------

export async function findProductCategories(): Promise<ProductCategory[]> {
  const rows = await db.select().from(productCategories).where(mine(productCategories)).orderBy(asc(productCategories.name));
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
        await db.update(productCategories).set({ taxGroup: item.taxGroup }).where(and(mine(productCategories), eq(productCategories.id, found.id)));
      }
    } else {
      await db.insert(productCategories).values({ ...owned(), name, taxGroup: item.taxGroup }).onConflictDoNothing();
      byName.set(name.toLowerCase(), { id: 0, name, taxGroup: item.taxGroup });
    }
  }
  return findProductCategories();
}

export async function deleteProductCategories(ids: number[]) {
  if (ids.length) await db.delete(productCategories).where(and(mine(productCategories), inArray(productCategories.id, ids)));
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
  return db.select().from(teamMembers).where(mine(teamMembers)).orderBy(asc(teamMembers.name));
}

/** Every flag a team member carries. Only `sellsRetail` changes what a screen shows. */
export type TeamRoles = {
  isProvider?: boolean;
  isAdmin?: boolean;
  sellsRetail?: boolean;
  managesInventory?: boolean;
  doesQa?: boolean;
};

export async function insertTeamMember(name: string, roles: TeamRoles = {}) {
  await db
    .insert(teamMembers)
    .values({
      ...owned(),
      name,
      isProvider: roles.isProvider ?? true,
      isAdmin: roles.isAdmin ?? false,
      sellsRetail: roles.sellsRetail ?? true,
      managesInventory: roles.managesInventory ?? false,
      doesQa: roles.doesQa ?? false,
    })
    .onConflictDoNothing();
  return findTeamMembers();
}

/** Set a team member's roles. Anything left out keeps the value it had. */
export async function setTeamMemberRoles(id: number, roles: TeamRoles) {
  const set = Object.fromEntries(Object.entries(roles).filter(([, v]) => v !== undefined));
  if (Object.keys(set).length) {
    await db.update(teamMembers).set(set).where(and(mine(teamMembers), eq(teamMembers.id, id)));
  }
  return findTeamMembers();
}

/**
 * Rename a team member everywhere their name was written down.
 *
 * Staff are recorded by name, not by id — a scan, a client record and a goal all
 * carry the text. A typo or a changed surname therefore splits one person into two
 * on every report until the old spelling is corrected, which is what this does.
 * Returns how many rows moved, so the screen can say what happened.
 */
export async function renameTeamMember(id: number, nextName: string) {
  const next = nextName.trim();
  if (!next) throw new Error("A name is needed.");
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(mine(teamMembers), eq(teamMembers.id, id)));
  if (!member) throw new Error("That team member was already removed.");
  const from = member.name;
  if (from === next) return { team: await findTeamMembers(), moved: 0 };

  const clash = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(mine(teamMembers), eq(teamMembers.name, next)));
  if (clash.length) throw new Error(`${next} is already on the team. Remove one of them instead.`);

  const scans = await db
    .update(movements)
    .set({ staffName: next, staffInitials: deriveInitials(next) })
    .where(and(mine(movements), eq(movements.staffName, from)))
    .returning({ id: movements.id });
  const visits = await db
    .update(clientFormulas)
    .set({ staffName: next })
    .where(and(mine(clientFormulas), eq(clientFormulas.staffName, from)))
    .returning({ id: clientFormulas.id });
  const goals = await db
    .update(retailGoals)
    .set({ staffName: next })
    .where(and(mine(retailGoals), eq(retailGoals.staffName, from)))
    .returning({ id: retailGoals.id });
  await db.update(teamMembers).set({ name: next }).where(and(mine(teamMembers), eq(teamMembers.id, id)));

  return { team: await findTeamMembers(), moved: scans.length + visits.length + goals.length };
}

export async function deleteTeamMember(id: number) {
  await db.delete(teamMembers).where(and(mine(teamMembers), eq(teamMembers.id, id)));
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
      ...owned(),
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
  const [row] = await db.update(expenses).set(data).where(and(mine(expenses), eq(expenses.id, id))).returning();
  return row;
}

export async function deleteExpense(id: number) {
  await db.delete(expenseReceipts).where(and(mine(expenseReceipts), eq(expenseReceipts.expenseId, id)));
  await db.delete(expenses).where(and(mine(expenses), eq(expenses.id, id)));
}

export async function findExpensesForMonth(month: string) {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(mine(expenses), like(expenses.spentOn, `${month}-%`)))
    .orderBy(desc(expenses.spentOn), desc(expenses.id));
  const withReceipt = await expenseIdsWithReceipt(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, hasReceipt: withReceipt.has(r.id) }));
}

// --- Receipt photos ---------------------------------------------------------

export async function expenseIdsWithReceipt(ids: number[]) {
  if (!ids.length) return new Set<number>();
  const rows = await db.select({ id: expenseReceipts.expenseId }).from(expenseReceipts).where(and(mine(expenseReceipts), inArray(expenseReceipts.expenseId, ids)));
  return new Set(rows.map((r) => r.id));
}

/** Saves (or replaces) the receipt photo for an expense. A new photo is attached to QuickBooks again. */
export async function saveExpenseReceipt(expenseId: number, mediaType: string, data: string) {
  await db
    .insert(expenseReceipts)
    .values({ ...owned(), expenseId, mediaType, data })
    .onConflictDoUpdate({ target: expenseReceipts.expenseId, set: { mediaType, data, createdAt: new Date() } });
  await db.update(expenses).set({ quickbooksReceiptId: "" }).where(and(mine(expenses), eq(expenses.id, expenseId)));
}

export async function findExpenseReceipt(expenseId: number) {
  const [row] = await db.select().from(expenseReceipts).where(and(mine(expenseReceipts), eq(expenseReceipts.expenseId, expenseId)));
  return row ?? null;
}

export async function deleteExpenseReceipt(expenseId: number) {
  await db.delete(expenseReceipts).where(and(mine(expenseReceipts), eq(expenseReceipts.expenseId, expenseId)));
}

export async function findExpensesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(expenses).where(and(mine(expenses), inArray(expenses.id, ids)));
}

export async function setMonthBudget(month: string, amountCents: number | null) {
  if (amountCents === null) {
    await db.delete(budgets).where(and(mine(budgets), eq(budgets.month, month)));
    return;
  }
  await db
    .insert(budgets)
    .values({ ...owned(), month, amountCents })
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
        mine(movements),
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
        mine(movements),
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
  const overrides = keys.length ? await db.select().from(budgets).where(and(mine(budgets), inArray(budgets.month, keys))) : [];
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
          .where(and(mine(expenses), like(expenses.spentOn, `${m.key}-%`)))
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
