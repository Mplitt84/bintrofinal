/** Sustainability against a real database: partners and monthly waste stay per business, one weight per month. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("sustainability", () => {
  let sus: typeof import("./sustainability.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let a = 0;
  let b = 0;
  const mark = `sus-${Date.now()}`;

  beforeAll(async () => {
    sus = await import("./sustainability.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    const signup = await import("./signup.server.js");
    a = (await signup.createBusinessForOwner({ email: `${mark}-a@example.com`, name: "A", sub: `${mark}-a` })).businessId;
    b = (await signup.createBusinessForOwner({ email: `${mark}-b@example.com`, name: "B", sub: `${mark}-b` })).businessId;
  });

  afterAll(async () => {
    for (const id of [a, b]) {
      for (const t of [schema.sustainabilityPartners, schema.colorWasteLogs, schema.appUsers, schema.businessProfile]) {
        await db.delete(t).where(eq(t.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("keeps partners unique per shop and tidies the website", async () => {
    await runForBusiness(a, async () => {
      const list = await sus.savePartner({ name: "Green Circle Salons", kind: "recycling", contact: "", website: "greencirclesalons.com", since: "2024-03", notes: "" }, "Minnie");
      expect(list[0].website).toBe("https://greencirclesalons.com");
      await expect(sus.savePartner({ name: "green circle salons", kind: "other", contact: "", website: "", since: "", notes: "" }, "x")).rejects.toThrow();
    });
    expect(await runForBusiness(b, () => sus.listPartners())).toHaveLength(0);
  });

  it("stores one weight per month and replaces it when logged again", async () => {
    await runForBusiness(a, async () => {
      await sus.saveWasteLog({ month: "2026-10", grams: 1200, costCentsPerOz: 125, note: "" }, "Minnie");
      const logs = await sus.saveWasteLog({ month: "2026-10", grams: 900, costCentsPerOz: 125, note: "reweighed" }, "Minnie");
      expect(logs).toHaveLength(1);
      expect(logs[0].grams).toBe(900);
    });
    expect(await runForBusiness(b, () => sus.listWasteLogs())).toHaveLength(0);
  });
});
