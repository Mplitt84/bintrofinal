/**
 * Settings → Suppliers clean-up: auto-sort into categories (apply + undo), new
 * categories saved with a tax group, and deleting a supplier. Real database; skips
 * unless NETLIFY_DB_URL is set.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("product tidy", () => {
  const mark = `tidy-${Date.now()}`;
  let a = 0;
  let ids: number[] = [];
  let tidy: typeof import("./tidy.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;

  beforeAll(async () => {
    tidy = await import("./tidy.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq, and } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}@example.com`, name: "A", sub: mark })).businessId;
    await runForBusiness(a, async () => {
      const rows = await db
        .insert(schema.products)
        .values([
          { businessId: a, barcode: `${mark}-1`, name: "Nitrile Gloves", vendor: "www.saloncentric.com", category: "" },
          { businessId: a, barcode: `${mark}-2`, name: "CURL CUSTARD", size: "8OZ", vendor: "SalonCentric", category: "" },
          { businessId: a, barcode: `${mark}-3`, name: "Edge Gel", vendor: "Old Shop", category: "Styling" },
        ])
        .returning();
      ids = rows.map((r) => r.id);
    });
  });

  afterAll(async () => {
    for (const t of [schema.products, schema.productCategories, schema.appUsers, schema.businessProfile]) {
      await db.delete(t).where(eq(t.businessId, a));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  const product = (id: number) =>
    runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, id))))[0]);

  it("suggests categories for unfiled products and tidies names", async () => {
    const res = await runForBusiness(a, () => tidy.categorySuggestionsFor(false));
    const custard = res.suggestions.find((s) => s.productId === ids[1])!;
    expect(custard.suggested).toBe("Styling");
    expect(custard.formattedName).toBe("Curl Custard");
    expect(custard.formattedSize).toBe("8 oz");
    expect(res.suggestions.some((s) => s.productId === ids[2])).toBe(false);
  });

  it("applies, saves a new category, and undoes", async () => {
    const res = await runForBusiness(a, () =>
      tidy.applyProductTidy([
        { productId: ids[0], category: "Gloves" },
        { productId: ids[1], category: "Styling", name: "Curl Custard", size: "8 oz" },
      ]),
    );
    expect(res.changed).toBe(2);
    expect((await product(ids[1])).name).toBe("Curl Custard");
    const saved = await runForBusiness(a, () => db.select().from(schema.productCategories).where(eq(schema.productCategories.businessId, a)));
    expect(saved.map((c) => c.name)).toContain("Gloves");
    expect(saved.find((c) => c.name === "Gloves")!.taxGroup).toBe("disposables");

    await runForBusiness(a, () => tidy.applyProductTidy(res.before));
    const back = await product(ids[1]);
    expect([back.name, back.size, back.category]).toEqual(["CURL CUSTARD", "8OZ", ""]);
  });

  it("deletes a supplier, moving its products or clearing them", async () => {
    expect(await runForBusiness(a, () => tidy.deleteVendor("www.saloncentric.com", "SalonCentric"))).toBe(1);
    expect((await product(ids[0])).vendor).toBe("SalonCentric");
    expect(await runForBusiness(a, () => tidy.deleteVendor("Old Shop", ""))).toBe(1);
    expect((await product(ids[2])).vendor).toBe("");
  });
});
