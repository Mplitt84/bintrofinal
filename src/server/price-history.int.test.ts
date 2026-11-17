/**
 * Price history against a real database: every cost change is recorded once, an
 * invoice is dated with its own date, a same-price invoice line is a dated check,
 * and Price watch reads it back.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("price history", () => {
  const mark = `ph-${Date.now()}`;
  let a = 0;
  let evo = 0;
  let gloves = 0;
  let inv: typeof import("./inventory.server.js");
  let imp: typeof import("./import.server.js");
  let watch: typeof import("./price-watch.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;

  beforeAll(async () => {
    inv = await import("./inventory.server.js");
    imp = await import("./import.server.js");
    watch = await import("./price-watch.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq, and } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}@example.com`, name: "A", sub: mark })).businessId;
    await runForBusiness(a, async () => {
      evo = (await inv.insertProduct({ barcode: `${mark}-1`, name: "Evo 7N", vendor: "SalonCentric", unitCostCents: 1000 })).id;
      gloves = (await inv.insertProduct({ barcode: `${mark}-2`, name: "Gloves", vendor: "CosmoProf", unitCostCents: 900 })).id;
    });
  });

  afterAll(async () => {
    for (const t of [schema.priceHistory, schema.movements, schema.products, schema.appUsers, schema.businessProfile]) {
      await db.delete(t).where(eq(t.businessId, a));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  const rows = () =>
    runForBusiness(a, () => db.select().from(schema.priceHistory).where(eq(schema.priceHistory.businessId, a)).orderBy(schema.priceHistory.id));

  it("records a new product's cost and each real change, not a rename", async () => {
    await runForBusiness(a, async () => {
      await inv.updateProductFields(evo, { name: "Evo 7N Natural" });
      await inv.updateProductFields(evo, { unitCostCents: 1000 }); // same cost: nothing
    });
    expect((await rows()).filter((r) => r.productId === evo)).toHaveLength(1);
  });

  it("dates invoice prices with the invoice date and records same-price checks", async () => {
    // Pretend both products were priced in September, before the invoice.
    await runForBusiness(a, () =>
      db.update(schema.priceHistory).set({ recordedAt: new Date("2026-09-01T12:00:00Z") }).where(and(eq(schema.priceHistory.businessId, a))),
    );
    await runForBusiness(a, () =>
      imp.applyImportLines({
        mode: "prices",
        staffName: "Minnie",
        source: "Invoice · SalonCentric · 2026-10-02",
        priceDate: "2026-10-02",
        priceSource: "invoice",
        lines: [
          { productId: evo, barcode: "", name: "Evo 7N", brand: "", size: "", category: "", vendor: "SalonCentric", qty: null, unitCostCents: 1080, retailPriceCents: 0 },
          { productId: gloves, barcode: "", name: "Gloves", brand: "", size: "", category: "", vendor: "CosmoProf", qty: null, unitCostCents: 900, retailPriceCents: 0 },
        ],
      }),
    );
    const all = await rows();
    const change = all.find((r) => r.productId === evo && r.unitCostCents === 1080)!;
    expect(change).toMatchObject({ source: "invoice", previousCents: 1000 });
    expect(change.recordedAt.toISOString().slice(0, 10)).toBe("2026-10-02");
    const check = all.filter((r) => r.productId === gloves);
    expect(check.map((r) => [r.unitCostCents, r.previousCents, r.source])).toEqual([
      [900, 0, "new"],
      [900, 900, "invoice"],
    ]);
  });

  it("keeps an older invoice as history without changing today's cost", async () => {
    const res = await runForBusiness(a, () =>
      imp.applyImportLines({
        mode: "prices",
        staffName: "Minnie",
        source: "Invoice · old",
        priceDate: "2026-08-01",
        priceSource: "invoice",
        lines: [{ productId: evo, barcode: "", name: "Evo 7N", brand: "", size: "", category: "", vendor: "SalonCentric", qty: null, unitCostCents: 950, retailPriceCents: 0 }],
      }),
    );
    expect(res.historical).toBe(1);
    const p = await runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, evo))))[0]);
    expect(p.unitCostCents).toBe(1080);
  });

  it("feeds Price watch", async () => {
    const w = await runForBusiness(a, () => watch.computePriceWatch(12));
    // Aug $9.50 (old invoice) → Sep $10.00 → Oct $10.80: up 13.7% over the year.
    expect(w.risers.map((m) => [m.name, m.changePct])).toEqual([["Evo 7N Natural", 13.7]]);
    const history = await runForBusiness(a, () => watch.costHistory(evo));
    expect(history[0].cents).toBe(1080);
  });
});
