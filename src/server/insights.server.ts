import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { insightReports, movements, priceChecks, products } from "../../db/schema.js";
import {
  BEST_SELLER_LIMIT,
  BULK_COVER_DAYS,
  FAST_MIN_WEEK_UNITS,
  FAST_RUNOUT_DAYS,
  FAST_SURGE_RATIO,
  PRICE_STALE_DAYS,
  SOLD_TAX_GROUPS,
  SLOW_GROUP_LABELS,
  SLOW_MAX_UNITS,
  SLOW_MIN_AGE_DAYS,
  SLOW_WINDOW_DAYS,
  WEEK_DAYS,
  daysBetween,
  daysLabel,
  isColorCategory,
  outVerb,
  type BestSeller,
  type FastMover,
  type InsightKind,
  type Insights,
  type PriceReminder,
  type SlowGroup,
  type SlowMover,
  type UseKind,
} from "../lib/insights.js";
import { categorySuggestionsFor, findCategory, guessTaxGroup, type ProductCategory } from "../lib/tax-categories.js";
import { findBusinessContext, findBusinessProfile, findProductCategories } from "./business.server.js";
import { sendInsightReportEmail, type ReportSection, type SendResult } from "./email.server.js";
import { writeInsightSummary } from "./product-lookup.server.js";
import type { Product } from "./inventory.server.js";

const DAY_MS = 86_400_000;
/** Fast-mover alerts don't re-email the same product within this many days. */
const FAST_REALERT_DAYS = 3;

function timeZone() {
  return process.env.BUSINESS_TIMEZONE?.trim() || process.env.SALON_TIMEZONE?.trim() || "America/New_York";
}

/** YYYY-MM-DD for `date` in the business time zone. */
function localDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone(), year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** ISO week key, e.g. 2026-W40, in the business time zone. */
function isoWeekKey(date: Date) {
  const [y, m, d] = localDay(date).split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d!));
  const weekday = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Sold vs used, from the category's tax group: the business's saved mapping,
 * then the suggestions for its type, then keywords. With no category at all, a
 * retail price is the only hint that the item is sold.
 */
function useKindFor(p: Product, saved: ProductCategory[], businessType: string): UseKind {
  if (!p.category.trim()) return p.retailPriceCents > 0 ? "sold" : "used";
  const group = guessTaxGroup(p.category, categorySuggestionsFor(businessType), saved);
  return SOLD_TAX_GROUPS.includes(group) ? "sold" : "used";
}

function base(p: Product, useKind: UseKind) {
  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    size: p.size,
    category: p.category,
    vendor: p.vendor,
    imageUrl: p.imageUrl,
    qty: p.qty,
    unitCostCents: p.unitCostCents,
    retailPriceCents: p.retailPriceCents,
    useKind,
  };
}

function productLabel(i: { name: string; brand: string; size: string }) {
  const extra = [i.brand, i.size].filter(Boolean).join(" · ");
  return extra ? `${i.name} (${extra})` : i.name;
}

/**
 * Everything the reports and pop-ups need, computed live from the movement log:
 * best sellers (last 7 days vs the week before), slow movers (last 30 days),
 * fast movers with a bulk order and cost prediction, and stale prices.
 */
export async function computeInsights(now = new Date()): Promise<Omit<Insights, "summaries">> {
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
  const w1 = iso(WEEK_DAYS);
  const w2 = iso(WEEK_DAYS * 2);
  const w4 = iso(WEEK_DAYS * 4);
  const m1 = iso(SLOW_WINDOW_DAYS);
  const since = new Date(now.getTime() - Math.max(WEEK_DAYS * 4, SLOW_WINDOW_DAYS) * DAY_MS);
  const used = sql`-${movements.delta}`;

  const [all, categories, profile, usage, lastUsed] = await Promise.all([
    db.select().from(products),
    findProductCategories(),
    findBusinessProfile(),
    db
      .select({
        productId: movements.productId,
        week: sql<number>`coalesce(sum(${used}) filter (where ${movements.createdAt} >= ${w1}::timestamp), 0)::int`,
        prevWeek: sql<number>`coalesce(sum(${used}) filter (where ${movements.createdAt} >= ${w2}::timestamp and ${movements.createdAt} < ${w1}::timestamp), 0)::int`,
        prior3w: sql<number>`coalesce(sum(${used}) filter (where ${movements.createdAt} >= ${w4}::timestamp and ${movements.createdAt} < ${w1}::timestamp), 0)::int`,
        month: sql<number>`coalesce(sum(${used}) filter (where ${movements.createdAt} >= ${m1}::timestamp), 0)::int`,
      })
      .from(movements)
      .where(and(eq(movements.type, "out"), gte(movements.createdAt, since)))
      .groupBy(movements.productId),
    db
      .select({ productId: movements.productId, at: sql<string>`max(${movements.createdAt})` })
      .from(movements)
      .where(eq(movements.type, "out"))
      .groupBy(movements.productId),
  ]);

  const usageById = new Map(usage.map((u) => [u.productId, u]));
  const lastUsedById = new Map(lastUsed.map((u) => [u.productId, u.at]));

  const bestSellers: BestSeller[] = [];
  const slowMovers: SlowMover[] = [];
  const fastMovers: FastMover[] = [];
  const priceReminders: PriceReminder[] = [];
  const week = { soldUnits: 0, soldRevenueCents: 0, soldProfitCents: 0, soldUnpriced: 0, usedUnits: 0, usedCostCents: 0 };

  for (const p of all) {
    const u = usageById.get(p.id) ?? { week: 0, prevWeek: 0, prior3w: 0, month: 0 };
    const useKind = useKindFor(p, categories, profile.businessType);
    const item = base(p, useKind);
    const priceDate = p.priceUpdatedAt ?? p.createdAt;
    const priceDaysOld = daysBetween(priceDate, now);
    const priceStale = p.unitCostCents === 0 || priceDaysOld >= PRICE_STALE_DAYS;

    if (u.week > 0) {
      const sold = useKind === "sold";
      const revenueCents = sold ? u.week * p.retailPriceCents : 0;
      const costCents = u.week * p.unitCostCents;
      const profitCents = sold && p.retailPriceCents > 0 && p.unitCostCents > 0 ? revenueCents - costCents : null;
      bestSellers.push({
        ...item,
        weekUnits: u.week,
        prevWeekUnits: u.prevWeek,
        trendPct: u.prevWeek > 0 ? Math.round(((u.week - u.prevWeek) / u.prevWeek) * 100) : null,
        revenueCents,
        costCents,
        profitCents,
      });
      if (sold) {
        week.soldUnits += u.week;
        week.soldRevenueCents += revenueCents;
        if (profitCents === null) week.soldUnpriced += 1;
        else week.soldProfitCents += profitCents;
      } else {
        week.usedUnits += u.week;
        week.usedCostCents += costCents;
      }
    }

    if (p.qty > 0 && u.month <= SLOW_MAX_UNITS && daysBetween(p.createdAt, now) >= SLOW_MIN_AGE_DAYS) {
      const last = lastUsedById.get(p.id);
      const saved = findCategory(categories, p.category);
      const group: SlowGroup = isColorCategory(p.category, p.name)
        ? "color"
        : saved?.taxGroup === "resale" || /retail|resale|take.?home/i.test(p.category)
          ? "retail"
          : "other";
      slowMovers.push({
        ...item,
        monthUnits: u.month,
        daysSinceUsed: last ? daysBetween(last, now) : null,
        tiedUpCents: p.qty * p.unitCostCents,
        group,
      });
    }

    if (u.week >= FAST_MIN_WEEK_UNITS) {
      const dailyRate = u.week / WEEK_DAYS;
      const usualRate = u.prior3w / (WEEK_DAYS * 3);
      const surge = usualRate > 0 ? dailyRate >= usualRate * FAST_SURGE_RATIO : u.week >= FAST_MIN_WEEK_UNITS * 2;
      const daysLeft = Math.max(0, p.qty) / dailyRate;
      if (daysLeft <= FAST_RUNOUT_DAYS || surge) {
        const orderQty = Math.max(1, Math.ceil(dailyRate * BULK_COVER_DAYS + p.reorderThreshold - Math.max(0, p.qty)));
        fastMovers.push({
          ...item,
          weekUnits: u.week,
          dailyRate: Math.round(dailyRate * 10) / 10,
          daysLeft: Math.round(daysLeft * 10) / 10,
          surge,
          orderQty,
          orderCostCents: orderQty * p.unitCostCents,
          priceUpdatedAt: p.priceUpdatedAt ? p.priceUpdatedAt.toISOString() : null,
          priceStale,
        });
      }
    }

    if (priceStale) {
      priceReminders.push({
        ...item,
        priceUpdatedAt: p.priceUpdatedAt ? p.priceUpdatedAt.toISOString() : null,
        daysOld: priceDaysOld,
        missingCost: p.unitCostCents === 0,
      });
    }
  }

  bestSellers.sort((a, b) => b.weekUnits - a.weekUnits || b.revenueCents - a.revenueCents);
  slowMovers.sort((a, b) => b.tiedUpCents - a.tiedUpCents || a.name.localeCompare(b.name));
  fastMovers.sort((a, b) => a.daysLeft - b.daysLeft || b.weekUnits - a.weekUnits);
  const fastIds = new Set(fastMovers.map((f) => f.productId));
  priceReminders.sort(
    (a, b) =>
      Number(fastIds.has(b.productId)) - Number(fastIds.has(a.productId)) ||
      Number(b.missingCost) - Number(a.missingCost) ||
      b.daysOld - a.daysOld,
  );

  return {
    generatedAt: now.toISOString(),
    weekKey: isoWeekKey(now),
    monthKey: localDay(now).slice(0, 7),
    bestSellers: bestSellers.slice(0, BEST_SELLER_LIMIT),
    week,
    slowMovers: slowMovers.slice(0, 40),
    fastMovers,
    fastOrderTotalCents: fastMovers.reduce((sum, f) => sum + f.orderCostCents, 0),
    priceReminders: priceReminders.slice(0, 100),
  };
}

// --- Report text -------------------------------------------------------------

type Computed = Awaited<ReturnType<typeof computeInsights>>;

function priceAge(f: { priceUpdatedAt: string | null; priceStale: boolean }) {
  if (!f.priceUpdatedAt) return "cost never confirmed";
  const d = daysBetween(f.priceUpdatedAt);
  return `cost from ${d === 0 ? "today" : `${d}d ago`}${f.priceStale ? " — update it" : ""}`;
}

function fastSection(items: FastMover[], total: number): ReportSection {
  return {
    title: "Buy in higher volume",
    lead: `Going out fast. Suggested orders cover ${BULK_COVER_DAYS} days of sales or use plus par, priced at your most recent cost.`,
    columns: [
      { label: "Product" },
      { label: "Sold / used 7d", align: "right" },
      { label: "Runs out in", align: "right" },
      { label: "Order", align: "right" },
      { label: "Predicted cost", align: "right" },
    ],
    rows: items.map((f) => [
      productLabel(f),
      `${f.weekUnits} ${outVerb(f.useKind)}`,
      f.qty <= 0 ? "Out now" : daysLabel(f.daysLeft),
      String(f.orderQty),
      f.unitCostCents ? `${money(f.orderCostCents)} (${priceAge(f)})` : "Add a cost",
    ]),
    total: total ? `Predicted total: ${money(total)}` : undefined,
  };
}

function factsFor(kind: InsightKind, i: Computed) {
  const lines: string[] = [];
  if (kind === "weekly") {
    lines.push(
      "Top items, last 7 days. SOLD items were sold to clients (show sales and expected profit). USED items were used up by staff doing services — they were NOT sold, so never call them sales or give them revenue or profit; talk about product cost used instead.",
    );
    for (const b of i.bestSellers) {
      const trend = b.trendPct === null ? "new this week" : `${b.trendPct}% vs previous week`;
      const money7d =
        b.useKind === "sold"
          ? `est. sales ${money(b.revenueCents)}${b.profitCents === null ? " (profit unknown: missing price or cost)" : `, expected profit ${money(b.profitCents)}`}`
          : `product cost used ${money(b.costCents)}`;
      lines.push(`- [${b.useKind.toUpperCase()}] ${productLabel(b)}: ${b.weekUnits} ${outVerb(b.useKind)}, ${trend}, ${money7d}, ${b.qty} on hand`);
    }
    const w = i.week;
    lines.push(
      `Week totals: ${w.soldUnits} sold, est. sales ${money(w.soldRevenueCents)}, expected profit ${money(w.soldProfitCents)}${w.soldUnpriced ? ` (${w.soldUnpriced} sold item(s) missing a price or cost)` : ""}; ${w.usedUnits} used in services, product cost ${money(w.usedCostCents)}.`,
    );
  }
  if (kind === "weekly" || kind === "fast") {
    if (i.fastMovers.length) lines.push(`Going out fast — SOLD to clients or USED in services (predicted bulk order total ${money(i.fastOrderTotalCents)}):`);
    for (const f of i.fastMovers.slice(0, 12)) {
      lines.push(`- [${f.useKind.toUpperCase()}] ${productLabel(f)}: ${f.weekUnits} ${outVerb(f.useKind)} in 7 days, ${f.qty} on hand, runs out in ${daysLabel(f.daysLeft)}${f.surge ? ", selling well above usual" : ""}; order ${f.orderQty} ≈ ${money(f.orderCostCents)}`);
    }
  }
  if (kind === "monthly") {
    const tied = i.slowMovers.reduce((s, m) => s + m.tiedUpCents, 0);
    lines.push(`Slow movers, used ≤${SLOW_MAX_UNITS} in ${SLOW_WINDOW_DAYS} days (cash tied up ${money(tied)}):`);
    for (const m of i.slowMovers.slice(0, 20)) {
      lines.push(`- [${SLOW_GROUP_LABELS[m.group]}] ${productLabel(m)}: ${m.qty} on hand, ${money(m.tiedUpCents)} tied up, last used ${m.daysSinceUsed === null ? "never" : `${m.daysSinceUsed} days ago`}`);
    }
    lines.push(`Prices needing an update (older than ${PRICE_STALE_DAYS} days or missing): ${i.priceReminders.length}`);
  }
  return lines.join("\n");
}

/** "5 sold · $120 expected profit · 9 used in services ($34 product)". */
function weekTotal(i: Computed) {
  const w = i.week;
  const parts: string[] = [];
  if (w.soldUnits) parts.push(`${w.soldUnits} sold · ${money(w.soldProfitCents)} expected profit`);
  if (w.usedUnits) parts.push(`${w.usedUnits} used in services${w.usedCostCents ? ` (${money(w.usedCostCents)} product)` : ""}`);
  return parts.join(" · ") || undefined;
}

function sectionsFor(kind: InsightKind, i: Computed, fastItems: FastMover[]): ReportSection[] {
  if (kind === "weekly") {
    const sections: ReportSection[] = [
      {
        title: "Moving most this week",
        lead: "Retail items sold to clients and products used up in services over the last 7 days, compared with the week before. Only sold items earn sales and profit; used items show the product cost that went into services.",
        columns: [
          { label: "Product" },
          { label: "Units", align: "right" },
          { label: "vs last week", align: "right" },
          { label: "Est. sales", align: "right" },
          { label: "Expected profit / cost used", align: "right" },
          { label: "On hand", align: "right" },
        ],
        rows: i.bestSellers.map((b) => [
          productLabel(b),
          `${b.weekUnits} ${outVerb(b.useKind)}`,
          b.trendPct === null ? "New" : `${b.trendPct > 0 ? "+" : ""}${b.trendPct}%`,
          b.useKind === "sold" && b.revenueCents ? money(b.revenueCents) : "—",
          b.useKind === "sold"
            ? b.profitCents === null
              ? "Add price & cost"
              : `${money(b.profitCents)} profit`
            : b.costCents
              ? `${money(b.costCents)} used`
              : "—",
          String(b.qty),
        ]),
        total: weekTotal(i),
      },
    ];
    if (fastItems.length) sections.push(fastSection(fastItems, i.fastOrderTotalCents));
    return sections;
  }
  if (kind === "fast") {
    return [fastSection(fastItems, fastItems.reduce((s, f) => s + f.orderCostCents, 0))];
  }
  const groups: SlowGroup[] = ["color", "retail", "other"];
  const sections: ReportSection[] = groups
    .map((g) => {
      const items = i.slowMovers.filter((m) => m.group === g);
      return {
        title: `Slow ${SLOW_GROUP_LABELS[g].toLowerCase()}`,
        lead: `Used ${SLOW_MAX_UNITS} or fewer times in the last ${SLOW_WINDOW_DAYS} days. Consider a promotion, bundle, return or lower par.`,
        columns: [
          { label: "Product" },
          { label: "Used 30d", align: "right" as const },
          { label: "On hand", align: "right" as const },
          { label: "Cash tied up", align: "right" as const },
          { label: "Last used", align: "right" as const },
        ],
        rows: items.map((m) => [
          productLabel(m),
          String(m.monthUnits),
          String(m.qty),
          m.tiedUpCents ? money(m.tiedUpCents) : "—",
          m.daysSinceUsed === null ? "Never" : `${m.daysSinceUsed}d ago`,
        ]),
        total: items.length ? `Tied up: ${money(items.reduce((s, m) => s + m.tiedUpCents, 0))}` : undefined,
      };
    })
    .filter((s) => s.rows.length);
  if (i.priceReminders.length) {
    sections.push({
      title: "Update your prices",
      lead: `These costs are over ${PRICE_STALE_DAYS} days old or missing. Open Bintro → Activity → Insights → Prices to check them online in a tap.`,
      columns: [{ label: "Product" }, { label: "Your cost", align: "right" }, { label: "Last updated", align: "right" }],
      rows: i.priceReminders.slice(0, 25).map((r) => [
        productLabel(r),
        r.unitCostCents ? money(r.unitCostCents) : "Missing",
        r.priceUpdatedAt ? `${r.daysOld}d ago` : "Never",
      ]),
      total: i.priceReminders.length > 25 ? `…and ${i.priceReminders.length - 25} more in the app` : undefined,
    });
  }
  return sections;
}

const SUBJECTS: Record<InsightKind, (i: Computed, fast: FastMover[]) => string> = {
  weekly: (i) => {
    const top = i.bestSellers.find((b) => b.useKind === "sold");
    const profit = i.week.soldProfitCents > 0 ? ` · ${money(i.week.soldProfitCents)} expected profit` : "";
    return top ? `Best sellers this week: ${top.name} leads${profit}` : `This week's stock use${i.bestSellers[0] ? `: ${i.bestSellers[0].name} used most` : ""}`;
  },
  monthly: (i) => `Monthly check: ${i.slowMovers.length} slow item${i.slowMovers.length === 1 ? "" : "s"}, ${i.priceReminders.length} price${i.priceReminders.length === 1 ? "" : "s"} to update`,
  fast: (_i, fast) => `Alert: ${fast.length} item${fast.length === 1 ? "" : "s"} selling out fast`,
};

const HEADINGS: Record<InsightKind, string> = {
  weekly: "Weekly sales & service use",
  monthly: "Monthly slow movers & price check",
  fast: "Moving fast — buy in higher volume",
};

function periodKeyFor(kind: InsightKind, i: Computed, now: Date) {
  return kind === "weekly" ? i.weekKey : kind === "monthly" ? i.monthKey : localDay(now);
}

async function findReport(kind: InsightKind, periodKey: string) {
  const rows = await db
    .select()
    .from(insightReports)
    .where(and(eq(insightReports.kind, kind), eq(insightReports.periodKey, periodKey)));
  return rows[0] ?? null;
}

/** Products fast-alerted by email in the last few days, so an alert isn't repeated every run. */
async function recentlyAlertedIds(now: Date) {
  const rows = await db
    .select({ payload: insightReports.payload })
    .from(insightReports)
    .where(
      and(
        eq(insightReports.kind, "fast"),
        gte(insightReports.createdAt, new Date(now.getTime() - FAST_REALERT_DAYS * DAY_MS)),
      ),
    );
  const ids = new Set<number>();
  for (const r of rows) for (const id of (r.payload.emailedIds as number[] | undefined) ?? []) ids.add(id);
  return ids;
}

export type ReportRun = { kind: InsightKind; periodKey: string; summary: string; email: SendResult | null };

/**
 * Builds a report, saves it with its AI summary, and emails it when the
 * business has that email turned on and this period hasn't been emailed yet.
 * `force` (Settings → Send now) always emails and ignores the fast-alert cool-down.
 */
export async function runInsightReport(kind: InsightKind, opts: { force?: boolean; now?: Date } = {}): Promise<ReportRun> {
  const now = opts.now ?? new Date();
  const [insights, profile, business] = await Promise.all([computeInsights(now), findBusinessProfile(), findBusinessContext()]);
  const periodKey = periodKeyFor(kind, insights, now);
  const existing = await findReport(kind, periodKey);

  let fastItems = insights.fastMovers;
  if (kind === "fast" && !opts.force) {
    const alerted = await recentlyAlertedIds(now);
    fastItems = fastItems.filter((f) => !alerted.has(f.productId));
  }

  const hasContent =
    kind === "weekly"
      ? insights.bestSellers.length > 0
      : kind === "monthly"
        ? insights.slowMovers.length + insights.priceReminders.length > 0
        : fastItems.length > 0;
  if (!hasContent) return { kind, periodKey, summary: existing?.summary ?? "", email: null };

  const enabled = kind === "weekly" ? profile.weeklyReportEmail : kind === "monthly" ? profile.monthlyReportEmail : profile.fastMoverAlertEmail;
  const shouldEmail = opts.force || (enabled && (kind === "fast" || !existing?.emailedAt));

  const view = kind === "fast" ? { ...insights, fastMovers: fastItems } : insights;
  const summary = await writeInsightSummary(kind, factsFor(kind, view), business);

  let email: SendResult | null = null;
  if (shouldEmail) {
    email = await sendInsightReportEmail(profile, {
      subject: SUBJECTS[kind](insights, fastItems),
      heading: HEADINGS[kind],
      summary,
      sections: sectionsFor(kind, insights, fastItems),
    });
  }

  const emailedIds = [
    ...new Set([
      ...(((existing?.payload.emailedIds as number[] | undefined) ?? [])),
      ...(email?.ok && kind === "fast" ? fastItems.map((f) => f.productId) : []),
    ]),
  ];
  const payload = {
    counts: {
      bestSellers: insights.bestSellers.length,
      slowMovers: insights.slowMovers.length,
      fastMovers: insights.fastMovers.length,
      priceReminders: insights.priceReminders.length,
    },
    fastOrderTotalCents: insights.fastOrderTotalCents,
    emailedIds,
  };
  const emailed = email?.ok ? { emailedTo: email.to, emailedAt: now } : {};
  await db
    .insert(insightReports)
    .values({ kind, periodKey, summary, payload, ...emailed })
    .onConflictDoUpdate({
      target: [insightReports.kind, insightReports.periodKey],
      set: { summary: summary || existing?.summary || "", payload, ...emailed },
    });

  return { kind, periodKey, summary, email };
}

/** Live insights plus the latest saved AI summary of each kind. */
export async function findInsights(): Promise<Insights> {
  const insights = await computeInsights();
  const latest = async (kind: InsightKind) => {
    const rows = await db
      .select({ summary: insightReports.summary })
      .from(insightReports)
      .where(eq(insightReports.kind, kind))
      .orderBy(desc(insightReports.createdAt))
      .limit(1);
    return rows[0]?.summary ?? "";
  };
  const [weekly, monthly, fast] = await Promise.all([latest("weekly"), latest("monthly"), latest("fast")]);
  return { ...insights, summaries: { weekly, monthly, fast } };
}

/**
 * AI summary for the current period, written on first request (without
 * emailing) so app pop-ups have one even before the scheduled report runs.
 */
export async function ensureInsightSummary(kind: InsightKind) {
  const now = new Date();
  const insights = await computeInsights(now);
  const periodKey = periodKeyFor(kind, insights, now);
  const existing = await findReport(kind, periodKey);
  if (existing?.summary) return existing.summary;
  const business = await findBusinessContext();
  const summary = await writeInsightSummary(kind, factsFor(kind, insights), business);
  if (summary) {
    await db
      .insert(insightReports)
      .values({ kind, periodKey, summary })
      .onConflictDoUpdate({ target: [insightReports.kind, insightReports.periodKey], set: { summary } });
  }
  return summary;
}

export async function insertPriceCheck(data: typeof priceChecks.$inferInsert) {
  const [row] = await db.insert(priceChecks).values(data).returning();
  return row!;
}

export async function findPriceCheck(id: number) {
  const rows = await db.select().from(priceChecks).where(eq(priceChecks.id, id));
  return rows[0] ?? null;
}
