/** Schedules, signed-in scans and reassigning, against a real database. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("scan check", () => {
  const mark = `sc-${Date.now()}`;
  let a = 0;
  let b = 0;
  let sc: typeof import("./scan-check.server.js");
  let inv: typeof import("./inventory.server.js");
  let trash: typeof import("./trash.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    sc = await import("./scan-check.server.js");
    inv = await import("./inventory.server.js");
    trash = await import("./trash.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}a@example.com`, name: "A", sub: `${mark}a` })).businessId;
    b = (await signup.createBusinessForOwner({ email: `${mark}b@example.com`, name: "B", sub: `${mark}b` })).businessId;
  });

  afterAll(async () => {
    for (const id of [a, b]) {
      for (const t of [schema.trash, schema.staffSchedules, schema.squareOutbox, schema.priceHistory, schema.movements, schema.products, schema.appUsers, schema.businessProfile]) {
        await db.delete(t).where(eq(t.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("saves a schedule, replacing the old one", async () => {
    await runForBusiness(a, async () => {
      await sc.saveSchedule("Beth E", [{ weekday: 1, start: "10:00", end: "18:00" }]);
      const s = await sc.saveSchedule("Beth E", [{ weekday: 2, start: "11:00", end: "17:00" }, { weekday: 2, start: "09:00", end: "10:00" }]);
      expect(s).toEqual([{ staffName: "Beth E", days: [{ weekday: 2, start: "11:00", end: "17:00" }] }]);
    });
    await runForBusiness(b, async () => expect(await sc.listSchedules()).toEqual([]));
  });

  it("stamps who was signed in on each scan, and moves scans to the right person with undo", async () => {
    await runForBusiness(
      a,
      async () => {
        const p = await inv.insertProduct({ barcode: `${mark}-p`, name: "Curl cream", qty: 5 } as never);
        await inv.applyMovement({ productId: p.id, type: "out", delta: -1, staffName: "Beth E" });
        const [row] = await sc.scanRows(new Date(Date.now() - 86_400_000));
        expect(row).toMatchObject({ staffName: "Beth E", signedInAs: "KaNesha H", productName: "Curl cream" });
        const r = await sc.reassignScans([row.id], "KaNesha H");
        expect(r.moved).toBe(1);
        expect((await sc.scanRows(new Date(Date.now() - 86_400_000)))[0].staffName).toBe("KaNesha H");
        await trash.undo(r.undoId);
        expect((await sc.scanRows(new Date(Date.now() - 86_400_000)))[0].staffName).toBe("Beth E");
      },
      "KaNesha H",
    );
    await runForBusiness(b, async () => expect(await sc.scanRows(new Date(Date.now() - 86_400_000))).toHaveLength(0));
  });
});
