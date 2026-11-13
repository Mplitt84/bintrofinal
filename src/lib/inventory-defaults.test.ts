import { describe, expect, it } from "vitest";
import {
  casePack,
  clampOrderQty,
  isBelowPar,
  onHandQty,
  orderUpTo,
  reorderPoint,
  selectBelowPar,
  stockStatus,
  suggestedOrderQty,
  unitsToPar,
  vendorGroupKey,
  vendorGroupLabel,
} from "./inventory-defaults";

/** A product row with only the fields the stock rules read. */
const p = (qty: number | null, reorderThreshold: number | null = 2, extra = {}) => ({
  qty,
  reorderThreshold,
  ...extra,
});

describe("on hand and par", () => {
  it("treats blank, missing and fractional counts as whole numbers", () => {
    expect(onHandQty({ qty: null })).toBe(0);
    expect(onHandQty({ qty: undefined })).toBe(0);
    expect(onHandQty({ qty: 4.7 })).toBe(4);
    expect(onHandQty({ qty: -3 })).toBe(-3);
  });

  it("treats a missing or zero reorder point as none", () => {
    expect(reorderPoint({ reorderThreshold: null })).toBe(0);
    expect(reorderPoint({ reorderThreshold: 0 })).toBe(0);
    expect(reorderPoint({ reorderThreshold: 3 })).toBe(3);
  });
});

describe("stock status", () => {
  it("is Out at zero or below, even after over-scanning", () => {
    expect(stockStatus(p(0))).toBe("out");
    expect(stockStatus(p(-2))).toBe("out");
    expect(stockStatus(p(null))).toBe("out");
  });

  it("is Low at or under the reorder point, never above it", () => {
    expect(stockStatus(p(2, 2))).toBe("low");
    expect(stockStatus(p(1, 2))).toBe("low");
    expect(stockStatus(p(3, 2))).toBe("in");
  });

  it("never calls a product Low when it has no reorder point", () => {
    expect(stockStatus(p(1, 0))).toBe("in");
    expect(isBelowPar(p(1, 0))).toBe(false);
  });

  it("counts Out and Low as needing restock", () => {
    expect(isBelowPar(p(0))).toBe(true);
    expect(isBelowPar(p(2, 2))).toBe(true);
    expect(isBelowPar(p(9, 2))).toBe(false);
  });

  it("measures the gap back to par", () => {
    expect(unitsToPar(p(0, 4))).toBe(4);
    expect(unitsToPar(p(3, 4))).toBe(1);
    expect(unitsToPar(p(9, 4))).toBe(0);
  });
});

describe("restock list", () => {
  it("puts the worst shortfall first and breaks ties by name", () => {
    const list = selectBelowPar([
      { name: "Shampoo", ...p(1, 2) },
      { name: "Conditioner", ...p(0, 6) },
      { name: "Gel", ...p(9, 2) },
      { name: "Brush", ...p(1, 2) },
    ]);
    expect(list.map((x) => x.name)).toEqual(["Conditioner", "Brush", "Shampoo"]);
  });
});

describe("order quantities", () => {
  it("fills back up to Fill to, not just par", () => {
    expect(orderUpTo(p(0, 2, { maxQty: 10 }))).toBe(10);
  });

  it("never lets Fill to sit below par", () => {
    expect(orderUpTo(p(0, 6, { maxQty: 2 }))).toBe(6);
  });

  it("falls back to par when Fill to is not set", () => {
    expect(orderUpTo(p(0, 6, { maxQty: 0 }))).toBe(6);
  });

  it("orders in whole cases and never past Fill to", () => {
    // Needs 10, case of 4 → 2 cases (8), so the shelf stays under Fill to.
    expect(suggestedOrderQty(p(0, 2, { maxQty: 10, packSize: 4 }))).toBe(8);
  });

  it("always orders at least one case", () => {
    expect(suggestedOrderQty(p(0, 1, { packSize: 6 }))).toBe(6);
    expect(suggestedOrderQty(p(5, 6, { packSize: 6 }))).toBe(6);
  });

  it("subtracts what is already on an open order", () => {
    expect(suggestedOrderQty(p(0, 12), 12)).toBe(0);
    expect(suggestedOrderQty(p(0, 12), 4)).toBe(8);
  });

  it("reads a missing or silly pack size as one", () => {
    expect(casePack({ packSize: null })).toBe(1);
    expect(casePack({ packSize: 0 })).toBe(1);
    expect(casePack({ packSize: 12 })).toBe(12);
  });

  it("keeps a typed quantity whole and in range", () => {
    expect(clampOrderQty(0)).toBe(1);
    expect(clampOrderQty(-4)).toBe(1);
    expect(clampOrderQty(2.8)).toBe(2);
    expect(clampOrderQty(99999)).toBe(999);
    expect(clampOrderQty(Number.NaN)).toBe(1);
  });
});

describe("vendor grouping", () => {
  it("groups by vendor and brand together", () => {
    expect(vendorGroupKey({ vendor: "Reverie", brand: "Reverie" })).not.toBe(
      vendorGroupKey({ vendor: "Reverie", brand: "Cult & King" }),
    );
  });

  it("heads a block with the vendor and the brand underneath", () => {
    expect(vendorGroupLabel({ vendor: "SalonCentric", brand: "The Doux" })).toEqual({
      vendor: "SalonCentric",
      brand: "The Doux",
    });
  });

  it("falls back to the brand, then to a heading a person can read", () => {
    expect(vendorGroupLabel({ vendor: "", brand: "Hairstory" })).toEqual({
      vendor: "Hairstory",
      brand: "",
    });
    expect(vendorGroupLabel({ vendor: "", brand: "" })).toEqual({
      vendor: "Unassigned",
      brand: "",
    });
  });
});
