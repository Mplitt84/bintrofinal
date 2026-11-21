/** Paid plans need the owner's agreement to automatic renewal, recorded with the date. Skips without NETLIFY_DB_URL. */
import { afterAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("auto-renewal consent", () => {
  const biz = 990_201;
  afterAll(async () => {
    const { db } = await import("../../db/index.js");
    const { account, billingEvents } = await import("../../db/schema.js");
    const { eq } = await import("drizzle-orm");
    await db.delete(billingEvents).where(eq(billingEvents.businessId, biz));
    await db.delete(account).where(eq(account.businessId, biz));
  });

  it("refuses a paid plan without consent, records it with consent, and allows Free without it", async () => {
    const a = await import("./account.server.js");
    const { runForBusiness } = await import("./tenant.js");
    await expect(runForBusiness(biz, () => a.changePlan("plus", "year", "https://example.test"))).rejects.toThrow(/renews automatically/);
    const ok = await runForBusiness(biz, () => a.changePlan("plus", "year", "https://example.test", true));
    expect(ok.account.plan).toBe("plus");
    const history = await runForBusiness(biz, () => a.listBillingHistory());
    expect(history.some((e) => /renews automatically every year at \$490/.test(e.detail))).toBe(true);
    // No Stripe keys in tests: no founding offer, and no renewal emails to send.
    expect(ok.account.foundingOffer ?? null).toBeNull();
    expect(await runForBusiness(biz, () => a.sendRenewalNotice("https://example.test"))).toBeNull();
    const free = await runForBusiness(biz, () => a.changePlan("free", "month", "https://example.test"));
    expect(free.account.plan === "free" || free.account.cancelAtPeriodEnd).toBe(true);
  });
});
