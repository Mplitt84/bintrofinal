/**
 * Starting a new business: it must be shut unless the deployment opens it, and a
 * business created this way must begin empty and completely separate.
 *
 * Needs a real database, so it skips unless NETLIFY_DB_URL is set.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("starting a new business", () => {
  let signup: typeof import("./signup.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let inventory: typeof import("./inventory.server.js");
  let business: typeof import("./business.server.js");
  let auth: typeof import("./auth.server.js");
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  const made: number[] = [];
  const mark = `signup-test-${Date.now()}`;
  const someone = (n: number) => ({
    email: `${mark}-${n}@example.com`,
    name: `Owner ${n}`,
    sub: `google-${mark}-${n}`,
  });

  beforeEach(async () => {
    signup ??= await import("./signup.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    inventory ??= await import("./inventory.server.js");
    business ??= await import("./business.server.js");
    auth ??= await import("./auth.server.js");
    ({ db } = await import("../../db/index.js"));
    schema ??= await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    delete process.env.BINTRO_SIGNUP_OPEN;
  });

  afterAll(async () => {
    for (const id of made) {
      for (const table of [
        schema.products,
        schema.appUsers,
        schema.account,
        schema.businessProfile,
      ]) {
        await db.delete(table).where(eq(table.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
    delete process.env.BINTRO_SIGNUP_OPEN;
  });

  const create = async (n: number) => {
    const user = await signup.createBusinessForOwner(someone(n));
    made.push(user.businessId);
    return user;
  };

  describe("the switch", () => {
    it("is off unless the deployment turns it on", () => {
      expect(signup.signupOpen()).toBe(false);
      process.env.BINTRO_SIGNUP_OPEN = "false";
      expect(signup.signupOpen()).toBe(false);
      process.env.BINTRO_SIGNUP_OPEN = "yes";
      expect(signup.signupOpen()).toBe(false);
      process.env.BINTRO_SIGNUP_OPEN = "1";
      expect(signup.signupOpen()).toBe(false);
    });

    it("is on only for exactly true", () => {
      process.env.BINTRO_SIGNUP_OPEN = "true";
      expect(signup.signupOpen()).toBe(true);
      process.env.BINTRO_SIGNUP_OPEN = "TRUE";
      expect(signup.signupOpen()).toBe(true);
    });

    it("turns a stranger away while it is off", async () => {
      await expect(auth.userForGoogle(someone(99))).rejects.toThrow("not-allowed");
    });
  });

  describe("what a new business gets", () => {
    it("makes the person who signed up its owner", async () => {
      const user = await create(1);
      expect(user.role).toBe("owner");
      expect(user.businessId).toBeGreaterThan(1);
    });

    it("starts with nothing in it", async () => {
      const user = await create(2);
      const products = await runForBusiness(user.businessId, () => inventory.findAllProducts());
      const team = await runForBusiness(user.businessId, () => business.findTeamMembers());
      expect(products).toEqual([]);
      expect(team).toEqual([]);
    });

    it("cannot see the business that was already here", async () => {
      const user = await create(3);
      await runForBusiness(1, () =>
        inventory.insertProduct({ barcode: `${mark}-A`, name: "Business 1 only" }),
      );
      const theirs = await runForBusiness(user.businessId, () => inventory.findAllProducts());
      expect(theirs.some((p) => p.name === "Business 1 only")).toBe(false);
      await runForBusiness(1, async () => {
        const p = await inventory.findProductByBarcode(`${mark}-A`);
        if (p) await inventory.deleteProductById(p.id);
      });
    });

    it("needs the welcome screen until it has a name", async () => {
      const user = await create(4);
      expect(await signup.needsWelcome(user.businessId)).toBe(true);
      await runForBusiness(user.businessId, () =>
        business.saveBusinessProfile({ name: "A Brand New Salon" }),
      );
      expect(await signup.needsWelcome(user.businessId)).toBe(false);
    });

    it("gives two new businesses their own separate homes", async () => {
      const one = await create(5);
      const two = await create(6);
      expect(one.businessId).not.toBe(two.businessId);
      await runForBusiness(one.businessId, () =>
        inventory.insertProduct({ barcode: `${mark}-shared`, name: "One's product" }),
      );
      await runForBusiness(two.businessId, () =>
        inventory.insertProduct({ barcode: `${mark}-shared`, name: "Two's product" }),
      );
      const seenByTwo = await runForBusiness(two.businessId, () => inventory.findAllProducts());
      expect(seenByTwo).toHaveLength(1);
      expect(seenByTwo[0].name).toBe("Two's product");
    });

    it("lets a stranger in once the switch is on, as their own business", async () => {
      process.env.BINTRO_SIGNUP_OPEN = "true";
      const profile = someone(7);
      const user = await auth.userForGoogle(profile);
      made.push(user.businessId);
      expect(user.email).toBe(profile.email);
      expect(user.role).toBe("owner");
      expect(user.businessId).toBeGreaterThan(1);

      // Signing in again finds the same business rather than making another.
      const again = await auth.userForGoogle(profile);
      expect(again.businessId).toBe(user.businessId);
    });
  });
});
