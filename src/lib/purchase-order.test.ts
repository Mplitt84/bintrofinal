import { describe, expect, it } from "vitest";
import {
  buildPurchaseOrderCsv,
  groupPurchaseOrderLines,
  lineTotalCents,
  purchaseOrderFilename,
  purchaseOrderTotals,
  type PurchaseOrderLine,
} from "./purchase-order";

const line = (over: Partial<PurchaseOrderLine> = {}): PurchaseOrderLine => ({
  productId: 1,
  barcode: "012345678905",
  name: "Curl Cream",
  brand: "The Doux",
  vendor: "SalonCentric",
  size: "8 oz",
  category: "Retail",
  qty: 2,
  onHand: 1,
  reorderThreshold: 4,
  unitCostCents: 1250,
  ...over,
});

describe("line and order totals", () => {
  it("multiplies the edited quantity by cost", () => {
    expect(lineTotalCents(line({ qty: 3, unitCostCents: 999 }))).toBe(2997);
  });

  it("clamps a silly quantity before charging for it", () => {
    expect(lineTotalCents(line({ qty: 0, unitCostCents: 500 }))).toBe(500);
    expect(lineTotalCents(line({ qty: -5, unitCostCents: 500 }))).toBe(500);
  });

  it("adds up items, units and dollars", () => {
    const totals = purchaseOrderTotals([
      line({ qty: 2, unitCostCents: 1000 }),
      line({ productId: 2, qty: 3, unitCostCents: 500 }),
    ]);
    expect(totals).toEqual({ itemCount: 2, unitCount: 5, totalCents: 3500 });
  });

  it("is zero for an empty order", () => {
    expect(purchaseOrderTotals([])).toEqual({
      itemCount: 0,
      unitCount: 0,
      totalCents: 0,
    });
  });
});

describe("grouping for the printed order", () => {
  it("makes one block per vendor and brand", () => {
    const groups = groupPurchaseOrderLines([
      line({ productId: 1, vendor: "SalonCentric", brand: "The Doux" }),
      line({ productId: 2, vendor: "SalonCentric", brand: "Cult & King" }),
      line({ productId: 3, vendor: "SalonCentric", brand: "The Doux" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.flatMap((g) => g.lines)).toHaveLength(3);
  });

  it("keeps two vendors apart even when the brand matches", () => {
    const groups = groupPurchaseOrderLines([
      line({ productId: 1, vendor: "SalonCentric", brand: "Reverie" }),
      line({ productId: 2, vendor: "Reverie", brand: "Reverie" }),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("order CSV", () => {
  it("keeps a comma in a product name inside its own cell", () => {
    expect(buildPurchaseOrderCsv([line({ name: "Cream, rich" })])).toContain(
      '"Cream, rich"',
    );
  });

  it("escapes a quote in a product name", () => {
    expect(buildPurchaseOrderCsv([line({ name: '6" clips' })])).toContain('6""');
  });

  it("writes a header, one row per line, then a total", () => {
    const rows = buildPurchaseOrderCsv([line(), line({ productId: 2 })])
      .trim()
      .split("\r\n");
    expect(rows).toHaveLength(4);
    expect(rows.at(-1)).toContain("TOTAL (2 items)");
  });

  it("totals the dollars at the bottom the way the vendor will add them up", () => {
    const csv = buildPurchaseOrderCsv([
      line({ qty: 2, unitCostCents: 1000 }),
      line({ productId: 2, qty: 1, unitCostCents: 550 }),
    ]);
    expect(csv.trim().split("\r\n").at(-1)).toContain("25.50");
  });
});

describe("filename", () => {
  it("carries the date so saved orders sort", () => {
    expect(purchaseOrderFilename("bintro", new Date(2026, 10, 12))).toBe(
      "bintro-purchase-order-2026-11-12.csv",
    );
  });
});
