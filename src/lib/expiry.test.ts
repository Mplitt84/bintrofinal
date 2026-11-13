import { describe, expect, it } from "vitest";
import {
  daysToExpiry,
  expiryLabel,
  expiryState,
  isExpiryDate,
  monthsFromToday,
} from "./expiry";

// Noon avoids any midnight rounding argument in the day maths.
const today = new Date(2026, 10, 12, 12, 0, 0);

describe("expiry dates", () => {
  it("recognises only full YYYY-MM-DD dates", () => {
    expect(isExpiryDate("2027-03-01")).toBe(true);
    expect(isExpiryDate("2027-3-1")).toBe(false);
    expect(isExpiryDate("none")).toBe(false);
    expect(isExpiryDate("")).toBe(false);
  });

  it("counts whole days, and goes negative once past", () => {
    expect(daysToExpiry("2026-11-12", today)).toBe(0);
    expect(daysToExpiry("2026-11-22", today)).toBe(10);
    expect(daysToExpiry("2026-11-02", today)).toBe(-10);
    expect(daysToExpiry("", today)).toBeNull();
  });

  it("counts across a month and a year end", () => {
    expect(daysToExpiry("2026-12-12", today)).toBe(30);
    expect(daysToExpiry("2027-01-12", today)).toBe(61);
  });

  it("is not thrown off by daylight saving", () => {
    // US clocks changed on 2026-11-01, a week before "today".
    expect(daysToExpiry("2026-10-29", today)).toBe(-14);
  });
});

describe("expiry state", () => {
  it("names each state the product rows show", () => {
    expect(expiryState("", today)).toBe("unset");
    expect(expiryState("none", today)).toBe("none");
    expect(expiryState("2026-11-02", today)).toBe("expired");
    expect(expiryState("2026-12-12", today)).toBe("soon");
    expect(expiryState("2028-01-01", today)).toBe("ok");
  });

  it("warns on the 60th day but not the 61st", () => {
    expect(expiryState("2027-01-11", today)).toBe("soon");
    expect(expiryState("2027-01-12", today)).toBe("ok");
  });

  it("calls today's date due, not expired", () => {
    expect(expiryState("2026-11-12", today)).toBe("soon");
  });
});

describe("shelf life", () => {
  it("counts months from today", () => {
    expect(monthsFromToday(18, today)).toBe("2028-05-12");
    expect(monthsFromToday(24, today)).toBe("2028-11-12");
  });

  it("pads single-digit months and days", () => {
    expect(monthsFromToday(1, new Date(2026, 7, 5))).toBe("2026-09-05");
  });
});

describe("label", () => {
  it("says it plainly when a product does not expire", () => {
    expect(expiryLabel("none")).toBe("No expiration");
    expect(expiryLabel("")).toBe("");
  });
});
