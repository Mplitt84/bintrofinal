/**
 * "Ask Bintro": answers questions about the business's own Bintro data.
 * Builds a compact text snapshot (products, usage, recent activity, open orders,
 * counts, spending) and sends it with the question. Server-only.
 */
import { and, desc, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, movements, products, purchaseOrderLines, purchaseOrders, stockCounts } from "../../db/schema.js";
import { stockStatus, suggestedOrderQty } from "../lib/inventory-defaults.js";
import { findBusinessProfile, findProductCategories } from "./business.server.js";
import { useKindFor } from "./insights.server.js";
import { chatWithClaude } from "./product-lookup.server.js";

const DAY = 86_400_000;
const money = (cents: number) => (cents ? `$${(cents / 100).toFixed(2)}` : "");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export type AskTurn = { role: "user" | "assistant"; content: string };

async function snapshot(timeZone: string) {
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY);
  const day = (d: Date) => d.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });
  const time = (d: Date) => d.toLocaleString("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const [profile, categories, all, usage, recent, openOrders, counts, spend] = await Promise.all([
    findBusinessProfile(),
    findProductCategories(),
    db.select().from(products),
    db
      .select({
        productId: movements.productId,
        out7: sql<number>`coalesce(sum(case when ${movements.type} = 'out' and ${movements.createdAt} >= ${new Date(now - 7 * DAY)} then -${movements.delta} end), 0)`,
        out30: sql<number>`coalesce(sum(case when ${movements.type} = 'out' and ${movements.createdAt} >= ${new Date(now - 30 * DAY)} then -${movements.delta} end), 0)`,
        out90: sql<number>`coalesce(sum(case when ${movements.type} = 'out' then -${movements.delta} end), 0)`,
        in30: sql<number>`coalesce(sum(case when ${movements.type} in ('in', 'receive') and ${movements.delta} > 0 and ${movements.createdAt} >= ${new Date(now - 30 * DAY)} then ${movements.delta} end), 0)`,
        lastAt: sql<Date>`max(${movements.createdAt})`,
      })
      .from(movements)
      .where(gte(movements.createdAt, since90))
      .groupBy(movements.productId),
    db
      .select({
        productId: movements.productId,
        type: movements.type,
        delta: movements.delta,
        staffName: movements.staffName,
        note: movements.note,
        createdAt: movements.createdAt,
      })
      .from(movements)
      .orderBy(desc(movements.id))
      .limit(40),
    db.select().from(purchaseOrders).where(inArray(purchaseOrders.status, ["open", "partial"])).orderBy(desc(purchaseOrders.id)).limit(15),
    db.select().from(stockCounts).orderBy(desc(stockCounts.id)).limit(8),
    db
      .select({ spentOn: expenses.spentOn, amountCents: expenses.amountCents, category: expenses.category, vendor: expenses.vendor })
      .from(expenses)
      .where(and(gte(expenses.spentOn, new Date(now - 62 * DAY).toISOString().slice(0, 10))))
      .orderBy(desc(expenses.spentOn))
      .limit(80),
  ]);

  const byId = new Map(all.map((p) => [p.id, p]));
  const use = new Map(usage.map((u) => [u.productId, u]));
  const orderLines = openOrders.length
    ? await db.select().from(purchaseOrderLines).where(inArray(purchaseOrderLines.orderId, openOrders.map((o) => o.id)))
    : [];

  const lines: string[] = [];
  lines.push(`BUSINESS: ${profile.name || "(no name set)"} · type ${profile.businessType} · orders placed about every ${profile.orderEveryDays ?? 7} days`);

  let units = 0;
  let value = 0;
  let low = 0;
  let out = 0;
  for (const p of all) {
    units += Math.max(0, p.qty);
    value += Math.max(0, p.qty) * p.unitCostCents;
    const st = stockStatus(p);
    if (st === "low") low++;
    if (st === "out") out++;
  }
  lines.push(`TOTALS: ${all.length} products · ${units} units on hand · stock value at cost ${money(value) || "$0"} · ${low} low · ${out} out`);

  lines.push(
    "",
    "PRODUCTS (name | brand | size | category | sold-or-used | vendor | on hand | status | order at | fill to | case pack | to order now | cost | retail | out last 7d/30d/90d | received 30d | last activity | last counted | expires | barcode)",
  );
  const rows = [...all].sort((a, b) => (use.get(b.id)?.out90 ?? 0) - (use.get(a.id)?.out90 ?? 0) || a.name.localeCompare(b.name));
  for (const p of rows.slice(0, 600)) {
    const u = use.get(p.id);
    const st = stockStatus(p);
    lines.push(
      [
        clip(p.name, 70),
        clip(p.brand, 30),
        p.size,
        p.category,
        useKindFor(p, categories, profile.businessType),
        clip(p.vendor, 30),
        p.qty,
        st,
        p.reorderThreshold,
        p.maxQty || "",
        p.packSize > 1 ? p.packSize : "",
        st === "in" ? "" : suggestedOrderQty(p),
        money(p.unitCostCents) || "no cost",
        money(p.retailPriceCents),
        u ? `${Number(u.out7)}/${Number(u.out30)}/${Number(u.out90)}` : "0/0/0",
        u ? Number(u.in30) : 0,
        u?.lastAt ? day(new Date(u.lastAt)) : "",
        p.lastCountedAt ? `${day(p.lastCountedAt)}${p.lastCountedBy ? ` by ${p.lastCountedBy}` : ""}` : "never",
        p.expiresOn === "none" ? "no expiry" : p.expiresOn,
        p.barcode,
      ].join(" | "),
    );
  }

  lines.push("", "RECENT ACTIVITY, newest first (time | product | kind | change | who | note)");
  for (const m of recent) {
    const p = byId.get(m.productId);
    const kind = m.type === "adjust" ? "count correction" : m.type === "out" ? (m.staffName === "Square POS" ? "Square sale" : "out") : "received";
    lines.push([time(m.createdAt), p ? clip(p.name, 60) : `#${m.productId}`, kind, m.delta > 0 ? `+${m.delta}` : m.delta, m.staffName, clip(m.note, 60)].join(" | "));
  }

  lines.push("", "OPEN ORDERS (vendor | sent | status | items ordered/received)");
  if (!openOrders.length) lines.push("none");
  for (const o of openOrders) {
    const ls = orderLines.filter((l) => l.orderId === o.id);
    lines.push(
      `${o.vendor || "No vendor"} | ${day(o.createdAt)} | ${o.status} | ${ls.map((l) => `${clip(l.name, 40)} ${l.qtyReceived}/${l.qtyOrdered}`).join("; ")}`,
    );
  }

  lines.push("", "RECENT COUNTS (date | who | scope | counted | changed | net $ | undone?)");
  if (!counts.length) lines.push("none");
  for (const c of counts) {
    lines.push(
      [day(c.createdAt), c.staffName, c.scope, c.itemsCounted, c.itemsChanged, money(Math.abs(c.valueDiffCents)) ? `${c.valueDiffCents < 0 ? "-" : ""}${money(Math.abs(c.valueDiffCents))}` : "$0", c.undoneAt ? "undone" : ""].join(" | "),
    );
  }

  lines.push("", "EXPENSES LOGGED, last ~2 months (date | amount | category | vendor)");
  if (!spend.length) lines.push("none");
  for (const e of spend) lines.push([e.spentOn, money(e.amountCents), e.category, e.vendor].join(" | "));

  return lines.join("\n");
}

export async function askBintro(question: string, history: AskTurn[], timeZone: string, localNow: string) {
  let tz = "America/Chicago";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    tz = timeZone;
  } catch {
    // Keep the default.
  }
  const data = await snapshot(tz);
  const system = `You are Bintro, the friendly helper inside the Bintro inventory app. You answer questions about THIS business's own data, shown below.

Rules:
- Use only the data below. If the answer isn't in it, say so plainly and say where in Bintro they could look or what to scan or count. Never make up numbers, prices or dates.
- Write simply, so anyone can follow (about a third-grade reading level). Short sentences. Answer first, then a few short bullet points if they help. Keep it under about 150 words unless they ask for a full list.
- Use the business's words: "Order at" (when to reorder), "Fill to" (how many to have after an order), "on hand", "Scan in", "Scan out", "Check".
- "sold" products are retail sales; "used" products are used on clients or in services. Count corrections are not sales or use.
- Money: cost is what the business pays; retail is what it sells for. Don't invent a retail price that isn't there.
- You can't change anything in the app. If they ask you to, tell them which screen does it (Scan, Products, Restock, Calendar, Budget, Activity, Settings).
- Today is ${localNow} (time zone ${tz}).

DATA:
${data}`;
  const turns = [...history.slice(-8), { role: "user" as const, content: question }];
  return chatWithClaude(system, turns, 900);
}
