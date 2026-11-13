/**
 * The Reports screen's data: fetches the rows one period needs and hands them to
 * `buildReport` in `src/lib/reports.ts`, which does all the arithmetic. Server-only.
 *
 * Windows and chart bucket edges come from the client so the day, week, month,
 * quarter and year all follow the device's own clock, the way the Scan tab's
 * "At a glance" does.
 */
import { and, gte, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientFormulas, expenses, movements, products } from "../../db/schema.js";
import { buildReport } from "../lib/reports.js";
import type { Report, ReportPeriod, ReportWindow } from "../lib/reports.js";
import { findBusinessProfile, findProductCategories } from "./business.server.js";
import { hasFeature } from "./account.server.js";
import { useKindFor } from "./insights.server.js";
import { mine } from "./tenant.js";

/** YYYY-MM-DD (expenses and visits are stored as plain dates) read in local time. */
function fromDateText(text: string) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function computeReport(period: ReportPeriod, w: ReportWindow): Promise<Report> {
  // One span covers this period and the stretch of the one before it.
  const from = w.prevStart < w.start ? w.prevStart : w.start;
  const fromText = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

  // Spending outside stock is a Premium feature, so it is only read there.
  const books = (await hasFeature("budget"))
    ? await db
        .select({ category: expenses.category, vendor: expenses.vendor, amountCents: expenses.amountCents, spentOn: expenses.spentOn })
        .from(expenses)
        .where(and(mine(expenses), gte(expenses.spentOn, fromText)))
    : [];

  const [all, categories, profile, rows, visitRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        vendor: products.vendor,
        imageUrl: products.imageUrl,
        unitCostCents: products.unitCostCents,
        retailPriceCents: products.retailPriceCents,
      })
      .from(products)
      .where(mine(products)),
    findProductCategories(),
    findBusinessProfile(),
    db
      .select({
        productId: movements.productId,
        type: movements.type,
        delta: movements.delta,
        staffName: movements.staffName,
        note: movements.note,
        at: movements.createdAt,
      })
      .from(movements)
      .where(and(mine(movements), gte(movements.createdAt, from), lt(movements.createdAt, w.end))),
    db
      .select({ serviceDate: clientFormulas.serviceDate, service: clientFormulas.service, tags: clientFormulas.tags, staffName: clientFormulas.staffName })
      .from(clientFormulas)
      .where(and(mine(clientFormulas), gte(clientFormulas.serviceDate, fromText))),
  ]);

  return buildReport({
    period,
    window: w,
    products: all.map((p) => ({ ...p, kind: useKindFor(p, categories, profile.businessType) })),
    movements: rows,
    expenses: books.map((e) => ({ category: e.category, vendor: e.vendor, amountCents: e.amountCents, at: fromDateText(e.spentOn) })),
    visits: visitRows.map((v) => ({ at: fromDateText(v.serviceDate), service: v.service, tags: v.tags ?? [], staffName: v.staffName })),
  });
}
