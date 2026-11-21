/** Re-filing corrections: the note and the count line change, stock doesn't, undo restores. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("corrections", () => {
  const mark = `co-${Date.now()}`;
  let a = 0;
  let b = 0;
  let co: typeof import("./corrections.server.js");
  let counts: typeof import("./counts.server.js");
  let inv: typeof import("./inventory.server.js");
  let trash: typeof import("./trash.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  const day = () => ({ start: new Date(Date.now() - 86_400_000), end: new Date(Date.now() + 86_400_000) });

  beforeAll(async () => {
    co = await import("./corrections.server.js");
    counts = await import("./counts.server.js");
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
      for (const t of [schema.trash, schema.stockCountLines, schema.stockCounts, schema.squareOutbox, schema.priceHistory, schema.movements, schema.products, schema.appUsers, schema.businessProfile]) {
        await db.delete(t).where(eq(t.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("re-files a count correction as a record fix, keeps stock, and undo puts the reason back", async () => {
    await runForBusiness(a, async () => {
      const p = await inv.insertProduct({ barcode: `${mark}-p`, name: "Toner", qty: 10, unitCostCents: 800 } as never);
      await counts.approveCount({ scope: "Everything", blind: true, staffName: "Beth", lines: [{ productId: p.id, counted: 4, reason: "Missing" }] });
      const [row] = await co.listCorrections(day().start, day().end);
      expect(row).toMatchObject({ delta: -6, unitCostCents: 800 });
      expect(row.note).toMatch(/· Missing$/);
      const r = await co.refileCorrections([row.id], "Miscounted before");
      expect(r.changed).toBe(1);
      const [after] = await co.listCorrections(day().start, day().end);
      expect(after.note).toMatch(/· Miscounted before$/);
      const lines = await db.select().from(schema.stockCountLines).where(eq(schema.stockCountLines.businessId, a));
      expect(lines[0].reason).toBe("Miscounted before");
      expect((await inv.findProductByBarcode(`${mark}-p`))!.qty).toBe(4);
      await trash.undo(r.undoId);
      expect((await co.listCorrections(day().start, day().end))[0].note).toMatch(/· Missing$/);
    });
    await runForBusiness(b, async () => expect(await co.listCorrections(day().start, day().end)).toHaveLength(0));
  });
});
