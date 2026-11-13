import { describe, expect, it } from "vitest";
import {
  DEAD_STOCK_DAYS,
  THIN_MARGIN_PCT,
  profitMoney,
  profitRowsFor,
  type ProfitListKey,
  type ProfitProduct,
} from "./profit";

/** A plain product: sold, priced, nothing wrong with it. */
const product = (over: Partial<ProfitProduct> = {}): ProfitProduct => ({
  productId: 1,
  name: "Curl Cream",
  brand: "The Doux",
  size: "8 oz",
  vendor: "SalonCentric",
  imageUrl: "",
  useKind: "sold",
  unitsOut: 10,
  onHand: 4,
  costCents: 1000,
  retailCents: 2400,
  expiryDays: null,
  oldEnough: false,
  lastOutAt: new Date(2026, 10, 1),
  noRecentOut: false,
  fillTo: 0,
  ...over,
});

const kinds = (p: ProfitProduct, removed?: (k: ProfitListKey) => boolean) =>
  profitRowsFor(p, removed).losers.map((l) => l.kind);

describe("making money", () => {
  it("counts profit as units × (retail − cost), at today's prices", () => {
    const { maker, totals } = profitRowsFor(product());
    expect(maker?.profitCents).toBe(14_000);
    expect(maker?.revenueCents).toBe(24_000);
    expect(maker?.costCents).toBe(10_000);
    expect(totals.profitCents).toBe(14_000);
    expect(totals.soldUnits).toBe(10);
  });

  it("reports the margin the business keeps", () => {
    expect(profitRowsFor(product()).maker?.marginPct).toBe(58);
  });

  it("leaves a product nobody bought off the list", () => {
    expect(profitRowsFor(product({ unitsOut: 0 })).maker).toBeNull();
  });

  it("never counts backbar product as a sale", () => {
    const rows = profitRowsFor(product({ useKind: "used" }));
    expect(rows.maker).toBeNull();
    expect(rows.serviceCost?.costCents).toBe(10_000);
    expect(rows.totals.revenueCents).toBe(0);
    expect(rows.totals.usedCostCents).toBe(10_000);
  });
});

describe("costing money", () => {
  it("flags a product that sells for less than it costs", () => {
    const rows = profitRowsFor(product({ costCents: 2000, retailCents: 1500 }));
    expect(rows.losers[0].kind).toBe("loss");
    expect(rows.losers[0].amountCents).toBe(5_000); // 10 × $5 lost
    expect(rows.maker).toBeNull();
  });

  it("counts a break-even price as a loss, not a win", () => {
    expect(kinds(product({ costCents: 2000, retailCents: 2000 }))).toContain("loss");
  });

  it("flags a thin margin and names a price that would fix it", () => {
    // $10 cost, $12 retail = 17% margin.
    const rows = profitRowsFor(product({ costCents: 1000, retailCents: 1200 }));
    expect(rows.losers[0].kind).toBe("thin");
    expect(rows.losers[0].fix).toContain(profitMoney(1429));
    expect(rows.maker).not.toBeNull(); // it still makes money, just not enough
  });

  it("leaves a healthy margin alone", () => {
    expect(kinds(product())).toEqual([]);
  });

  it("flags the margin just under the line and not the one on it", () => {
    // 29% margin is thin; 30% is not.
    expect(kinds(product({ costCents: 710, retailCents: 1000 }))).toContain("thin");
    expect(kinds(product({ costCents: 700, retailCents: 1000 }))).toEqual([]);
    expect(THIN_MARGIN_PCT).toBe(30);
  });

  it("calls stock expired and does not also call it dead", () => {
    const rows = profitRowsFor(
      product({ expiryDays: -5, oldEnough: true, noRecentOut: true }),
    );
    expect(rows.losers.map((l) => l.kind)).toEqual(["expired"]);
    expect(rows.totals.expiredCents).toBe(4_000);
    expect(rows.totals.deadStockCents).toBe(0);
  });

  it("warns before the date, counting the days", () => {
    const rows = profitRowsFor(product({ expiryDays: 14 }));
    expect(rows.losers[0].kind).toBe("expiring");
    expect(rows.losers[0].why).toContain("14 days");
  });

  it("writes one day in the singular", () => {
    expect(profitRowsFor(product({ expiryDays: 1 })).losers[0].why).toContain("1 day.");
  });

  it("flags stock that has not moved, and says when it last did", () => {
    const rows = profitRowsFor(
      product({ unitsOut: 0, oldEnough: true, noRecentOut: true }),
    );
    expect(rows.losers[0].kind).toBe("dead");
    expect(rows.losers[0].amountCents).toBe(4_000);
    expect(rows.losers[0].why).toContain("Nov 1");
  });

  it("says plainly when a product has never gone out", () => {
    const rows = profitRowsFor(
      product({ unitsOut: 0, oldEnough: true, noRecentOut: true, lastOutAt: null }),
    );
    expect(rows.losers[0].why).toContain("Never sold");
  });

  it("gives new stock time before calling it dead", () => {
    expect(kinds(product({ unitsOut: 0, oldEnough: false, noRecentOut: true }))).toEqual([]);
    expect(DEAD_STOCK_DAYS).toBe(90);
  });

  it("flags too much on hand only once Fill to is set", () => {
    expect(kinds(product({ onHand: 20, fillTo: 0 }))).toEqual([]);
    const rows = profitRowsFor(product({ onHand: 20, fillTo: 4 }));
    expect(rows.losers[0].kind).toBe("overstock");
    expect(rows.losers[0].amountCents).toBe(16_000); // 16 extra × $10
  });

  it("allows a reasonable cushion over Fill to", () => {
    expect(kinds(product({ onHand: 6, fillTo: 4 }))).toEqual([]); // 1.5 × is fine
    expect(kinds(product({ onHand: 7, fillTo: 4 }))).toContain("overstock");
  });
});

describe("gaps in the records", () => {
  it("leaves a sold product with no cost out and lists it instead", () => {
    const rows = profitRowsFor(product({ costCents: 0 }));
    expect(rows.gapNoCost).toBe(true);
    expect(rows.maker).toBeNull();
    expect(rows.totals.revenueCents).toBe(0);
  });

  it("leaves a sold product with no retail price out", () => {
    const rows = profitRowsFor(product({ retailCents: 0 }));
    expect(rows.gapNoRetail).toBe(true);
    expect(rows.maker).toBeNull();
  });

  it("does not ask backbar product for a retail price", () => {
    const rows = profitRowsFor(product({ useKind: "used", retailCents: 0 }));
    expect(rows.gapNoRetail).toBe(false);
    expect(rows.serviceCost).not.toBeNull();
  });

  it("says nothing about an empty shelf", () => {
    expect(kinds(product({ onHand: 0, unitsOut: 0, oldEnough: true, noRecentOut: true }))).toEqual([]);
  });
});

describe("rows the business removed as incorrect", () => {
  const removing = (key: ProfitListKey) => (k: ProfitListKey) => k === key;

  it("takes a removed money-maker out of the list and the totals", () => {
    const rows = profitRowsFor(product(), removing("maker"));
    expect(rows.maker).toBeNull();
    expect(rows.totals.profitCents).toBe(0);
    expect(rows.totals.soldUnits).toBe(0);
  });

  it("takes a removed loss out of the list", () => {
    const p = product({ costCents: 2000, retailCents: 1500 });
    expect(kinds(p, removing("loss"))).toEqual([]);
  });

  it("takes a removed service cost out of the totals", () => {
    const rows = profitRowsFor(product({ useKind: "used" }), removing("service"));
    expect(rows.serviceCost).toBeNull();
    expect(rows.totals.usedCostCents).toBe(0);
  });

  it("removes one reason without hiding the others", () => {
    // Expiring soon and too much on hand are two separate problems.
    const p = product({ expiryDays: 10, onHand: 20, fillTo: 4 });
    expect(kinds(p)).toEqual(["expiring", "overstock"]);
    expect(kinds(p, removing("expiring"))).toEqual(["overstock"]);
    expect(kinds(p, removing("overstock"))).toEqual(["expiring"]);
  });

  it("keeps a removed row from counting toward cash tied up", () => {
    const p = product({ unitsOut: 0, oldEnough: true, noRecentOut: true });
    expect(profitRowsFor(p, removing("dead")).totals.deadStockCents).toBe(0);
    expect(profitRowsFor(p).totals.deadStockCents).toBe(4_000);
  });
});

describe("money on the page", () => {
  it("writes cents the way a receipt does", () => {
    expect(profitMoney(0)).toBe("$0.00");
    expect(profitMoney(1250)).toBe("$12.50");
    expect(profitMoney(100_000)).toBe("$1000.00");
  });
});
