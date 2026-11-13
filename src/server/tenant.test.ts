import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_ID,
  businessId,
  hasBusinessScope,
  runForBusiness,
} from "./tenant";

describe("which business the code is running for", () => {
  it("falls back to the original business outside any scope", () => {
    expect(businessId()).toBe(DEFAULT_BUSINESS_ID);
    expect(hasBusinessScope()).toBe(false);
  });

  it("answers for the business the scope was opened with", () => {
    runForBusiness(7, () => {
      expect(businessId()).toBe(7);
      expect(hasBusinessScope()).toBe(true);
    });
  });

  it("closes the scope again afterwards", () => {
    runForBusiness(7, () => businessId());
    expect(hasBusinessScope()).toBe(false);
  });

  it("refuses a nonsense business id rather than guessing", () => {
    expect(() => runForBusiness(0, () => 1)).toThrow();
    expect(() => runForBusiness(-3, () => 1)).toThrow();
    expect(() => runForBusiness(1.5, () => 1)).toThrow();
  });
});

describe("the scope survives the way a request actually runs", () => {
  it("holds across awaits, which is how a server function reads the database", async () => {
    await runForBusiness(42, async () => {
      expect(businessId()).toBe(42);
      await new Promise((r) => setTimeout(r, 5));
      expect(businessId()).toBe(42);
      await Promise.all([
        (async () => expect(businessId()).toBe(42))(),
        (async () => {
          await new Promise((r) => setTimeout(r, 1));
          expect(businessId()).toBe(42);
        })(),
      ]);
    });
  });

  it("holds inside a helper called further down, with no id passed to it", async () => {
    // Nothing threads the id through: the helpers simply ask.
    const deep = async () => {
      await new Promise((r) => setTimeout(r, 1));
      return businessId();
    };
    const middle = async () => deep();
    expect(await runForBusiness(9, () => middle())).toBe(9);
  });

  it("keeps two businesses apart when their work overlaps", async () => {
    // This is the shape of two requests being served at the same time.
    const work = (id: number, delay: number) =>
      runForBusiness(id, async () => {
        await new Promise((r) => setTimeout(r, delay));
        return businessId();
      });
    expect(await Promise.all([work(1, 20), work(2, 5), work(3, 12)])).toEqual([1, 2, 3]);
  });

  it("gives an inner scope back to the outer one when it ends", async () => {
    await runForBusiness(1, async () => {
      expect(await runForBusiness(2, async () => businessId())).toBe(2);
      expect(businessId()).toBe(1);
    });
  });

  it("passes the value back, the way the middleware returns the response", async () => {
    expect(await runForBusiness(5, async () => "the response")).toBe("the response");
  });
});
