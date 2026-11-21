/** The per-shop daily AI allowance. Skips without NETLIFY_DB_URL. */
import { afterAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("AI daily cap", () => {
  const a = 990_001;
  const b = 990_002;
  afterAll(async () => {
    const { db } = await import("../../db/index.js");
    const { aiUsage } = await import("../../db/schema.js");
    const { inArray } = await import("drizzle-orm");
    await db.delete(aiUsage).where(inArray(aiUsage.businessId, [a, b]));
    delete process.env.BINTRO_AI_DAILY_CAP;
  });

  it("counts per shop and refuses past the cap", async () => {
    process.env.BINTRO_AI_DAILY_CAP = "2";
    const u = await import("./ai-usage.server.js");
    const { runForBusiness } = await import("./tenant.js");
    expect(await runForBusiness(a, () => u.takeAiCall())).toBe(true);
    expect(await runForBusiness(a, () => u.takeAiCall())).toBe(true);
    expect(await runForBusiness(a, () => u.takeAiCall())).toBe(false);
    // Another shop has its own allowance.
    expect(await runForBusiness(b, () => u.takeAiCall())).toBe(true);
    expect(await runForBusiness(a, () => u.aiCallsToday())).toBe(3);
  });
});
