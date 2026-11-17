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

  it("moves the rest of a line with a changed cost, leaving shades priced on purpose", async () => {
    const ids = await runForBusiness(a, async () => {
      const mk = (n: string, c: number, i: number) => inv.insertProduct({ barcode: `${mark}-L${i}`, name: n, brand: "Joico", size: "2.5 oz", unitCostCents: c });
      return [(await mk("Lumishine 6N", 900, 1)).id, (await mk("Lumishine 7N", 900, 2)).id, (await mk("Lumishine 9V", 1100, 3)).id, (await mk("Lumishine 8N", 0, 4)).id];
    });
    const lead = await runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, ids[0]))))[0]);
    const summary = await runForBusiness(a, () =>
      imp.applyImportLines({
        mode: "receipt",
        staffName: "Minnie",
        source: "Delivery",
        followLine: true,
        lines: [{ productId: lead.id, barcode: "", name: lead.name, brand: "Joico", size: "2.5 oz", category: "", vendor: "", qty: 1, unitCostCents: 950, retailPriceCents: 0 }],
      }),
    );
    expect(summary.lineUpdated).toBe(2);
    const costs = await runForBusiness(a, async () =>
      (await db.select().from(schema.products).where(eq(schema.products.businessId, a))).filter((p) => ids.includes(p.id)).map((p) => [p.name, p.unitCostCents]),
    );
    expect(Object.fromEntries(costs)).toEqual({ "Lumishine 6N": 950, "Lumishine 7N": 950, "Lumishine 9V": 1100, "Lumishine 8N": 950 });
  });

  it("fixes guessed prices from invoices across the line, with undo", async () => {
    const ids = await runForBusiness(a, async () => {
      const mk = (n: string, c: number, i: number) => inv.insertProduct({ barcode: `${mark}-F${i}`, name: n, brand: "Alfaparf Milano", category: "Color", unitCostCents: c });
      return [(await mk("EVO 7.31 Medium Blonde Golden Ash", 1104, 1)).id, (await mk("EVO 8.1 Light Ash Blonde", 1500, 2)).id, (await mk("EVO 4 Medium Brown", 0, 3)).id];
    });
    // An invoice confirmed 7.31 at $11.04; the other two were guesses.
    await runForBusiness(a, () =>
      imp.applyImportLines({
        mode: "prices",
        staffName: "Minnie",
        source: "Invoice · SSG",
        priceDate: "2026-11-10",
        priceSource: "invoice",
        lines: [{ productId: ids[0], barcode: "", name: "EVO 7.31", brand: "Alfaparf Milano", size: "", category: "Color", vendor: "Salon Service Group", qty: null, unitCostCents: 1104, retailPriceCents: 0 }],
      }),
    );
    const fixes = await runForBusiness(a, () => watch.priceFixes());
    const evo = fixes.groups.find((g) => g.line === "Alfaparf Milano · EVO")!;
    expect(evo.fixes.map((f) => [f.productId, f.cents]).sort()).toEqual([[ids[1], 1104], [ids[2], 1104]].sort());
    const before = await runForBusiness(a, () => watch.applyPriceFixes(evo.fixes.map((f) => ({ productId: f.productId, cents: f.cents }))));
    expect((await runForBusiness(a, () => watch.priceFixes())).groups.some((g) => g.line === "Alfaparf Milano · EVO")).toBe(false);
    await runForBusiness(a, () => watch.applyPriceFixes(before, true));
    const back = await runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, ids[1]))))[0]);
    expect(back.unitCostCents).toBe(1500);
  });

  it("feeds Price watch", async () => {
    const w = await runForBusiness(a, () => watch.computePriceWatch(12));
    // Aug $9.50 (old invoice) → Sep $10.00 → Oct $10.80: up 13.7% over the year.
    expect(w.risers.find((m) => m.name === "Evo 7N Natural")!.changePct).toBe(13.7);
    // One delivery price each, and copies across a line don't count: no trend yet.
    expect(w.risers.some((m) => m.name.startsWith("Lumishine"))).toBe(false);
    const history = await runForBusiness(a, () => watch.costHistory(evo));
    expect(history[0].cents).toBe(1080);
  });
});
