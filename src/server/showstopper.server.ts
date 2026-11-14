/**
 * Showstopper's data: one period's sales and client records per team member, handed to
 * `buildShowstopper` in `src/lib/showstopper.ts`, which does the arithmetic. Server-only.
 *
 * Window boundaries come from the device, like Reports, so a month ends when the shop's
 * month ends.
 */
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientFormulas, movements, products, retailGoals, teamMembers } from "../../db/schema.js";
import { buildShowstopper, goalPeriodKey } from "../lib/showstopper.js";
import type { Goal, SaleRow, Showstopper, VisitRow } from "../lib/showstopper.js";
import { findBusinessProfile, findProductCategories } from "./business.server.js";
import { useKindFor } from "./insights.server.js";
import { mine, owned } from "./tenant.js";

/** A prescription movement carries its client in the note: `Prescription: Ada`. */
function clientFromNote(note: string) {
  const match = /^Prescription:\s*(.+)$/.exec(note.trim());
  return match ? match[1].trim() : "";
}

function dateText(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromDateText(text: string) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export type ShowstopperWindow = {
  periodLabel: string;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  /** The month goals are stored under, worked out on the device. */
  goalKey: string;
};

export async function computeShowstopper(w: ShowstopperWindow): Promise<Showstopper> {
  const from = w.prevStart < w.start ? w.prevStart : w.start;

  const [all, categories, profile, rows, visitRows, team, goals] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
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
      .select({
        staffName: clientFormulas.staffName,
        clientName: clientFormulas.clientName,
        serviceDate: clientFormulas.serviceDate,
        retail: clientFormulas.retail,
      })
      .from(clientFormulas)
      .where(and(mine(clientFormulas), gte(clientFormulas.serviceDate, dateText(from)))),
    db
      .select({ name: teamMembers.name, isProvider: teamMembers.isProvider, sellsRetail: teamMembers.sellsRetail })
      .from(teamMembers)
      .where(mine(teamMembers)),
    db
      .select({ staffName: retailGoals.staffName, targetCents: retailGoals.targetCents, focusTips: retailGoals.focusTips })
      .from(retailGoals)
      .where(and(mine(retailGoals), eq(retailGoals.periodKey, w.goalKey))),
  ]);

  const byId = new Map(all.map((p) => [p.id, p]));
  const sales: SaleRow[] = [];
  for (const m of rows) {
    if (m.type !== "out" || m.delta >= 0) continue;
    const p = byId.get(m.productId);
    if (!p) continue;
    if (useKindFor(p, categories, profile.businessType) !== "sold") continue;
    sales.push({
      staffName: m.staffName,
      productId: p.id,
      name: p.name,
      brand: p.brand,
      imageUrl: p.imageUrl,
      units: -m.delta,
      centsEach: p.retailPriceCents,
      costEach: p.unitCostCents,
      at: m.at,
      client: clientFromNote(m.note),
    });
  }

  const visits: VisitRow[] = visitRows.map((v) => {
    const lines = v.retail ?? [];
    return {
      staffName: v.staffName,
      client: v.clientName,
      at: fromDateText(v.serviceDate),
      recommended: lines.length,
      takenHome: lines.filter((l) => l.sold).length,
    };
  });

  return buildShowstopper({
    periodLabel: w.periodLabel,
    start: w.start,
    end: w.end,
    prevStart: w.prevStart,
    prevEnd: w.prevEnd,
    sales,
    visits,
    team,
    goals: goals.map((g) => ({ staffName: g.staffName, targetCents: g.targetCents, focusTips: g.focusTips ?? [] })),
    commissionPct: profile.retailCommissionPct,
    businessType: profile.businessType,
  });
}

/** A goal someone set for themselves, or a manager set with them. */
export async function saveGoal(goal: Goal & { periodKey: string; setBy: string }) {
  const values = {
    targetCents: Math.max(0, Math.round(goal.targetCents)),
    focusTips: goal.focusTips.slice(0, 3),
    setBy: goal.setBy,
    updatedAt: new Date(),
  };
  await db
    .insert(retailGoals)
    .values({ ...owned(), staffName: goal.staffName, periodKey: goal.periodKey, ...values })
    .onConflictDoUpdate({
      target: [retailGoals.businessId, retailGoals.staffName, retailGoals.periodKey],
      set: values,
    });
}

/** This month's key, for a caller with no device clock of its own. */
export function thisGoalPeriod() {
  return goalPeriodKey(new Date());
}
