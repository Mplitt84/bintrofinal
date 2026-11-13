import { describe, expect, it } from "vitest";
import { countIdFromNote, needsRecount } from "./counts";

describe("when a count difference needs a second look", () => {
  it("lets an exact count through", () => {
    expect(needsRecount(10, 10, 1000)).toBe(false);
  });

  it("asks again once three or more units are off", () => {
    expect(needsRecount(10, 7, 100)).toBe(true);
    expect(needsRecount(10, 8, 100)).toBe(false);
  });

  it("asks again when the money is big, even for one unit", () => {
    expect(needsRecount(10, 9, 2500)).toBe(true);
    expect(needsRecount(10, 9, 2499)).toBe(false);
  });

  it("asks again when a quarter of the shelf is missing", () => {
    expect(needsRecount(8, 6, 100)).toBe(true);
  });

  it("does not fuss over one unit on a small count", () => {
    expect(needsRecount(2, 1, 100)).toBe(false);
  });

  it("treats a negative on-hand as zero, so counting stock in is fine", () => {
    expect(needsRecount(-5, 1, 100)).toBe(false);
    expect(needsRecount(-5, 4, 100)).toBe(true);
  });
});

describe("count notes on movements", () => {
  it("reads the count id back off a movement", () => {
    expect(countIdFromNote("Count #12 · Damaged")).toBe(12);
    expect(countIdFromNote("Count #7")).toBe(7);
  });

  it("returns nothing for an ordinary scan note", () => {
    expect(countIdFromNote("Prescription: Dana")).toBeNull();
    expect(countIdFromNote("")).toBeNull();
  });
});
