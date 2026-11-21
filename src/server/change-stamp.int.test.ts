/** The catch-up fingerprint changes whenever products or the newest movements do. Skips without NETLIFY_DB_URL. */
import { afterAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("change stamp", () => {
  const biz = 990_101;
  afterAll(async () => {
    const { db } = await import("../../db/index.js");
    const { products } = await import("../../db/schema.js");
    const { eq } = await import("drizzle-orm");
    await db.delete(products).where(eq(products.businessId, biz));
  });

  it("is stable until something changes, and per shop", async () => {
    const { db } = await import("../../db/index.js");
    const { products } = await import("../../db/schema.js");
    const { and, eq } = await import("drizzle-orm");
    const inv = await import("./inventory.server.js");
    const { runForBusiness } = await import("./tenant.js");
    const stamp = () => runForBusiness(biz, () => inv.changeStamp());
    const empty = await stamp();
    expect(empty).toMatch(/^[0-9a-f]{32}$/);
    const [p] = await db.insert(products).values({ businessId: biz, barcode: `stamp-${Date.now()}`, name: "Stamp test", qty: 1 }).returning();
    const one = await stamp();
    expect(one).not.toBe(empty);
    expect(await stamp()).toBe(one);
    await db.update(products).set({ qty: 2 }).where(and(eq(products.businessId, biz), eq(products.id, p.id)));
    expect(await stamp()).not.toBe(one);
    expect(await runForBusiness(1, () => inv.changeStamp())).not.toBe(one);
  });
});
