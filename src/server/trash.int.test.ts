/** Undo and Recently deleted against a real database. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("undo", () => {
  const mark = `undo-${Date.now()}`;
  let a = 0;
  let inv: typeof import("./inventory.server.js");
  let trash: typeof import("./trash.server.js");
  let tidy: typeof import("./tidy.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;

  beforeAll(async () => {
    inv = await import("./inventory.server.js");
    trash = await import("./trash.server.js");
    tidy = await import("./tidy.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq, and } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}@example.com`, name: "A", sub: mark })).businessId;
  });

  afterAll(async () => {
    for (const t of [schema.trash, schema.priceHistory, schema.movements, schema.products, schema.productCategories, schema.calendarEvents, schema.appUsers, schema.businessProfile]) {
      await db.delete(t).where(eq(t.businessId, a));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  const product = (id: number) =>
    runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, id))))[0]);
  const moves = (id: number) =>
    runForBusiness(a, () => db.select().from(schema.movements).where(and(eq(schema.movements.businessId, a), eq(schema.movements.productId, id))));

  it("restores a deleted product with its history and count", async () => {
    const p = await runForBusiness(a, () => inv.insertProduct({ barcode: `${mark}-1`, name: "Gloss 7N", unitCostCents: 836 }));
    await runForBusiness(a, () => inv.applyMovement({ productId: p.id, type: "in", delta: 5, staffName: "Minnie" }));
    const snap = await runForBusiness(a, () => trash.productSnapshot([p.id]));
    await runForBusiness(a, () => inv.deleteProductById(p.id));
    const id = await runForBusiness(a, () => trash.saveSnapshot("product", "Deleted Gloss 7N", snap));
    expect(await product(p.id)).toBeUndefined();
    const listed = await runForBusiness(a, () => trash.recentlyDeleted());
    expect(listed.map((l) => l.label)).toContain("Deleted Gloss 7N");
    await runForBusiness(a, () => trash.undo(id));
    expect((await product(p.id))?.qty).toBe(5);
    expect(await moves(p.id)).toHaveLength(1);
    expect((await runForBusiness(a, () => trash.undo(id))).already).toBe(true);
  });

  it("undoes a merge: the duplicate and its scans come back, the kept product's count goes back", async () => {
    const keep = await runForBusiness(a, () => inv.insertProduct({ barcode: `${mark}-k`, name: "Evo 6N" }));
    const dup = await runForBusiness(a, () => inv.insertProduct({ barcode: `${mark}-d`, name: "EVO 6N", brand: "Alfaparf" }));
    await runForBusiness(a, () => inv.applyMovement({ productId: keep.id, type: "in", delta: 2, staffName: "M" }));
    await runForBusiness(a, () => inv.applyMovement({ productId: dup.id, type: "in", delta: 3, staffName: "M" }));
    const { snap, targetQty } = await runForBusiness(a, () => trash.mergeSnapshot(dup.id, keep.id));
    const res = await runForBusiness(a, () => inv.mergeProductsInto(dup.id, keep.id));
    expect(res.product?.qty).toBe(5);
    snap.qty = [{ productId: keep.id, delta: targetQty - (res.product?.qty ?? 0) }];
    const id = await runForBusiness(a, () => trash.saveSnapshot("merge", "Merged", snap));
    await runForBusiness(a, () => trash.undo(id));
    expect((await product(dup.id))?.qty).toBe(3);
    expect(await moves(dup.id)).toHaveLength(1);
    const k = await product(keep.id);
    expect([k?.qty, k?.brand, k?.extraBarcodes]).toEqual([2, "", []]);
  });

  it("undoes a category delete: products and the saved category come back", async () => {
    await runForBusiness(a, async () => {
      await db.insert(schema.productCategories).values({ businessId: a, name: "Gloss", taxGroup: "service" });
      await inv.insertProduct({ barcode: `${mark}-c`, name: "Gloss 9V", category: "Gloss" });
    });
    const snap = await runForBusiness(a, () => trash.categorySnapshot(["Gloss"]));
    await runForBusiness(a, () => tidy.deleteCategoryName("Gloss", ""));
    const id = await runForBusiness(a, () => trash.saveSnapshot("category", "Deleted category Gloss", snap));
    await runForBusiness(a, () => trash.undo(id));
    const cats = await runForBusiness(a, () => db.select().from(schema.productCategories).where(eq(schema.productCategories.businessId, a)));
    expect(cats.map((c) => c.name)).toContain("Gloss");
    const all = await runForBusiness(a, () => db.select().from(schema.products).where(eq(schema.products.businessId, a)));
    expect(all.find((p) => p.name === "Gloss 9V")?.category).toBe("Gloss");
  });

  it("never touches another business", async () => {
    const id = await runForBusiness(a, () => trash.saveSnapshot("edit", "x", {}, { listed: false }));
    await expect(runForBusiness(1, () => trash.undo(id))).rejects.toThrow();
  });
});
