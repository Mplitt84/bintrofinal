import { eq, asc, like, desc, sql, and, inArray, gt, gte, lt } from "drizzle-orm";
import { h as db, w as businessProfile, j as productCategories, K as expenses, m as movements, p as products, I as teamMembers, L as budgets } from "./auth.middleware-2uPScvPU.js";
import { E as EMPTY_PROFILE, a as businessTypeById, D as DEFAULT_TAX_GROUP, k as isTaxGroupId } from "./business-types-DKNVcfJE.js";
const PROFILE_ID = 1;
async function findBusinessProfile() {
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
    palette: row.palette,
    orderEveryDays: row.orderEveryDays
  };
}
async function saveBusinessProfile(data) {
  const values = { ...data, updatedAt: /* @__PURE__ */ new Date() };
  await db.insert(businessProfile).values({ ...EMPTY_PROFILE, ...values, id: PROFILE_ID }).onConflictDoUpdate({ target: businessProfile.id, set: values });
  return findBusinessProfile();
}
async function findProductCategories() {
  const rows = await db.select().from(productCategories).orderBy(asc(productCategories.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    taxGroup: isTaxGroupId(r.taxGroup) ? r.taxGroup : DEFAULT_TAX_GROUP
  }));
}
async function upsertProductCategories(items) {
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
async function deleteProductCategories(ids) {
  if (ids.length) await db.delete(productCategories).where(inArray(productCategories.id, ids));
  return findProductCategories();
}
async function findBusinessContext() {
  const [profile, categories] = await Promise.all([findBusinessProfile(), findProductCategories()]);
  const type = businessTypeById(profile.businessType);
  return categories.length ? { ...type, categories: categories.map((c) => c.name) } : type;
}
async function findTeamMembers() {
  return db.select().from(teamMembers).orderBy(asc(teamMembers.name));
}
async function insertTeamMember(name) {
  await db.insert(teamMembers).values({ name }).onConflictDoNothing();
  return findTeamMembers();
}
async function deleteTeamMember(id) {
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
  return findTeamMembers();
}
async function insertExpense(data) {
  const [row] = await db.insert(expenses).values({
    spentOn: data.spentOn,
    amountCents: data.amountCents,
    category: data.category ?? "",
    vendor: data.vendor ?? "",
    note: data.note ?? "",
    staffName: data.staffName ?? ""
  }).returning();
  return row;
}
async function updateExpense(id, data) {
  const [row] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
  return row;
}
async function deleteExpense(id) {
  await db.delete(expenses).where(eq(expenses.id, id));
}
async function findExpensesForMonth(month) {
  return db.select().from(expenses).where(like(expenses.spentOn, `${month}-%`)).orderBy(desc(expenses.spentOn), desc(expenses.id));
}
async function setMonthBudget(month, amountCents) {
  if (amountCents === null) {
    await db.delete(budgets).where(eq(budgets.month, month));
    return;
  }
  await db.insert(budgets).values({ month, amountCents }).onConflictDoUpdate({ target: budgets.month, set: { amountCents } });
}
async function inventorySpend(start, end) {
  return db.select({
    vendor: sql`coalesce(nullif(${products.vendor}, ''), nullif(${products.brand}, ''), 'Unassigned')`,
    units: sql`coalesce(sum(${movements.delta}), 0)::int`,
    cents: sql`coalesce(sum(${movements.delta} * ${products.unitCostCents}), 0)::int`
  }).from(movements).innerJoin(products, eq(movements.productId, products.id)).where(
    and(
      inArray(movements.type, ["in", "receive"]),
      gt(movements.delta, 0),
      gte(movements.createdAt, start),
      lt(movements.createdAt, end)
    )
  ).groupBy(sql`1`);
}
async function inventorySpendByCategory(start, end) {
  return db.select({
    category: products.category,
    cents: sql`coalesce(sum(${movements.delta} * ${products.unitCostCents}), 0)::int`
  }).from(movements).innerJoin(products, eq(movements.productId, products.id)).where(
    and(
      inArray(movements.type, ["in", "receive"]),
      gt(movements.delta, 0),
      gte(movements.createdAt, start),
      lt(movements.createdAt, end)
    )
  ).groupBy(products.category);
}
async function computeBudgetOverview(months) {
  const profile = await findBusinessProfile();
  const keys = months.map((m) => m.key);
  const overrides = keys.length ? await db.select().from(budgets).where(inArray(budgets.month, keys)) : [];
  const overrideByMonth = new Map(overrides.map((b) => [b.month, b.amountCents]));
  return Promise.all(
    months.map(async (m) => {
      const [vendors, stockCategories, expenseRows] = await Promise.all([
        inventorySpend(new Date(m.start), new Date(m.end)),
        inventorySpendByCategory(new Date(m.start), new Date(m.end)),
        db.select({
          category: expenses.category,
          cents: sql`coalesce(sum(${expenses.amountCents}), 0)::int`
        }).from(expenses).where(like(expenses.spentOn, `${m.key}-%`)).groupBy(expenses.category)
      ]);
      const inventoryCents = vendors.reduce((s, v) => s + Number(v.cents), 0);
      const expenseCents = expenseRows.reduce((s, e) => s + Number(e.cents), 0);
      return {
        month: m.key,
        budgetCents: overrideByMonth.get(m.key) ?? profile.monthlyBudgetCents,
        hasOverride: overrideByMonth.has(m.key),
        inventoryCents,
        expenseCents,
        vendors: vendors.map((v) => ({ vendor: v.vendor, units: Number(v.units), cents: Number(v.cents) })).sort((a, b) => b.cents - a.cents),
        stockCategories: stockCategories.map((c) => ({ category: c.category, cents: Number(c.cents) })).filter((c) => c.cents !== 0),
        categories: expenseRows.map((e) => ({ category: e.category || "Other", cents: Number(e.cents) })).sort((a, b) => b.cents - a.cents)
      };
    })
  );
}
export {
  findBusinessContext as a,
  findTeamMembers as b,
  findProductCategories as c,
  deleteTeamMember as d,
  deleteProductCategories as e,
  findBusinessProfile as f,
  computeBudgetOverview as g,
  findExpensesForMonth as h,
  insertTeamMember as i,
  insertExpense as j,
  updateExpense as k,
  deleteExpense as l,
  setMonthBudget as m,
  inventorySpend as n,
  saveBusinessProfile as s,
  upsertProductCategories as u
};
