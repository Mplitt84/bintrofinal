/**
 * Better prices against a real database (the web search is faked): the scan keeps only
 * real savings, marketplaces only for supplies when the shop buys there, switching
 * changes supplier + cost and Undo puts them back, dismissed sellers never come back.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

const calls: { name: string; allowMarketplace: boolean; local: boolean }[] = [];
vi.mock("./product-lookup.server.js", async (orig) => ({
  ...(await orig<typeof import("./product-lookup.server.js")>()),
  findCheaperSellers: async (f: { name: string; unitCostCents: number }, o: { allowMarketplace: boolean; local: boolean }) => {
    calls.push({ name: f.name, allowMarketplace: o.allowMarketplace, local: o.local });
    return {
      ok: true,
      offers: [
        { sellerName: "CosmoProf", sellerUrl: "https://cosmoprof.com/x", sellerType: "distributor", unitCostCents: f.unitCostCents - 200, note: "" },
        { sellerName: "Penny Less", sellerUrl: "https://example.com/y", sellerType: "distributor", unitCostCents: f.unitCostCents - 5, note: "" },
      ],
    };
  },
}));

maybe("better prices", () => {
  const mark = `bp-${Date.now()}`;
  let a = 0;
  let color = 0;
  let foils = 0;
  let bp: typeof import("./better-prices.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;

  beforeAll(async () => {
    bp = await import("./better-prices.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    const biz = await import("./business.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq, and } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}@example.com`, name: "A", sub: mark })).businessId;
    await runForBusiness(a, async () => {
      await biz.saveBusinessProfile({ name: "Test Salon", businessType: "salon", address: "2511 E 6th St, Suite D, Austin, TX 78702", buyingPreference: "marketplace" });
      await biz.upsertProductCategories([
        { name: "Hair color", taxGroup: "service" },
        { name: "Foils", taxGroup: "disposables" },
      ]);
      const rows = await db
        .insert(schema.products)
        .values([
          { businessId: a, barcode: `${mark}-1`, name: "Evo 7N", category: "Hair color", vendor: "SalonCentric", unitCostCents: 1080 },
          { businessId: a, barcode: `${mark}-2`, name: "Foil roll", category: "Foils", vendor: "SalonCentric", unitCostCents: 2400 },
        ])
        .returning();
      [color, foils] = rows.map((r) => r.id);
    });
  });

  afterAll(async () => {
    for (const t of [schema.priceAlternatives, schema.products, schema.productCategories, schema.appUsers, schema.businessProfile]) {
      await db.delete(t).where(eq(t.businessId, a));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  it("reads the city from the address", () => {
    expect(bp.cityFromAddress("2511 E 6th St, Suite D, Austin, TX 78702")).toBe("Austin, TX");
  });

  it("scans, allowing marketplaces only for supplies, and keeps only real savings", async () => {
    const run = await runForBusiness(a, () => bp.runPriceScan(10));
    expect(run.checked).toBe(2);
    expect(calls.find((c) => c.name === "Evo 7N")!.allowMarketplace).toBe(false);
    expect(calls.find((c) => c.name === "Foil roll")!.allowMarketplace).toBe(true);
    const state = await runForBusiness(a, () => bp.betterPricesState());
    expect(state.offers.map((o) => o.sellerName)).toEqual(["CosmoProf", "CosmoProf"]);
    // Nothing is checked twice in a week.
    expect((await runForBusiness(a, () => bp.runPriceScan(10))).checked).toBe(0);
  });

  it("switches supplier and cost, and undoes", async () => {
    const state = await runForBusiness(a, () => bp.betterPricesState());
    const offer = state.offers.find((o) => o.productId === foils)!;
    const before = await runForBusiness(a, () => bp.switchToOffer(offer.id, "Minnie"));
    const product = async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, foils))))[0];
    expect((await product()).vendor).toBe("CosmoProf");
    expect((await product()).unitCostCents).toBe(2200);
    await runForBusiness(a, () => bp.undoSwitch(offer.id, before));
    expect([(await product()).vendor, (await product()).unitCostCents]).toEqual(["SalonCentric", 2400]);
  });

  it("never offers a dismissed seller again", async () => {
    const state = await runForBusiness(a, () => bp.betterPricesState());
    const offer = state.offers.find((o) => o.productId === color)!;
    await runForBusiness(a, () => bp.setOfferStatus(offer.id, "dismissed", "Minnie"));
    await runForBusiness(a, () => db.update(schema.products).set({ sellerScanAt: null }).where(and(eq(schema.products.businessId, a), eq(schema.products.id, color))));
    await runForBusiness(a, () => bp.runPriceScan(10));
    const after = await runForBusiness(a, () => bp.betterPricesState());
    expect(after.offers.some((o) => o.productId === color)).toBe(false);
  });
});
