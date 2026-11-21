/**
 * Daily AI allowance per shop. Every Claude call (labels, receipts, Ask Bintro, price
 * searches, insight summaries) goes through postToClaude, which takes one call from
 * here first. Over the cap the call isn't made and the person is told it resets tomorrow.
 * Set BINTRO_AI_DAILY_CAP on Netlify to change it (default 300 calls per shop per day).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { aiUsage } from "../../db/schema.js";
import { businessId, hasBusinessScope } from "./tenant.js";

export const AI_LIMIT_MESSAGE = "This shop has used today's AI allowance. It resets at 6 pm Central (midnight UTC) — everything else still works.";

export function aiDailyCap() {
  const n = Number(process.env.BINTRO_AI_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Counts one AI call for the current shop. False when the shop is over today's cap. Fails open. */
export async function takeAiCall(): Promise<boolean> {
  if (!hasBusinessScope()) return true;
  try {
    const [row] = await db
      .insert(aiUsage)
      .values({ businessId: businessId(), day: today(), calls: 1 })
      .onConflictDoUpdate({ target: [aiUsage.businessId, aiUsage.day], set: { calls: sql`${aiUsage.calls} + 1` } })
      .returning({ calls: aiUsage.calls });
    return (row?.calls ?? 0) <= aiDailyCap();
  } catch (error) {
    // A counting hiccup must never take AI features down.
    console.error("AI usage count failed", error);
    return true;
  }
}

/** Today's count for the current shop (Settings / tests). */
export async function aiCallsToday(): Promise<number> {
  const [row] = await db
    .select({ calls: aiUsage.calls })
    .from(aiUsage)
    .where(and(eq(aiUsage.businessId, businessId()), eq(aiUsage.day, today())));
  return row?.calls ?? 0;
}
