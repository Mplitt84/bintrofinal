/**
 * Square sales against a real database, with Square's API stubbed: two syncs running at
 * once log each order once, and the double-count cleanup takes out only the extras
 * (checked against Square's own copy of the order), putting the units back on the shelf.
 *
 * Needs a real database, so it skips unless NETLIFY_DB_URL is set.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("square sales sync", () => {
  let integ: typeof import("./integrations.server.js");
  let inv: typeof import("./inventory.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let signup: typeof import("./signup.server.js");
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;
  let a = 0;
  let shampoo = 0;
  let cream = 0;
  const mark = `sq-${Date.now()}`;
  const closed = new Date(Date.now() - 60_000).toISOString();

  // Square's answers: one order selling 2 shampoo, and 1 cream on each of two lines (a real repeat line).
  const order = {
    id: `${mark}-o1`,
    closed_at: closed,
    line_items: [
      { catalog_object_id: `${mark}-v-shampoo`, quantity: "2", name: "Shampoo" },
      { catalog_object_id: `${mark}-v-cream`, quantity: "1", name: "Cream" },
      { catalog_object_id: `${mark}-v-cream`, quantity: "1", name: "Cream" },
    ],
  };
  const fakeFetch = vi.fn(async (url: string) => {
    const body = url.includes("/v2/locations")
      ? { locations: [{ id: "L1", status: "ACTIVE", timezone: "America/Chicago" }] }
      : url.includes("/v2/orders/search")
        ? { orders: [order] }
        : url.includes("/v2/orders/batch-retrieve")
          ? { orders: [order] }
          : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  });

  beforeAll(async () => {
    integ = await import("./integrations.server.js");
    inv = await import("./inventory.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq, and } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}@example.com`, name: "A", sub: mark })).businessId;
    await runForBusiness(a, async () => {
      const [p1] = await db
        .insert(schema.products)
        .values({ businessId: a, barcode: `${mark}-1`, name: "Shampoo", qty: 20, retailPriceCents: 3000, squareVariationId: `${mark}-v-shampoo` })
        .returning();
      const [p2] = await db
        .insert(schema.products)
        .values({ businessId: a, barcode: `${mark}-2`, name: "Cream", qty: 20, retailPriceCents: 2500, squareVariationId: `${mark}-v-cream` })
        .returning();
      shampoo = p1.id;
      cream = p2.id;
      await db.insert(schema.integrations).values({
        businessId: a,
        provider: "square",
        accessToken: "test",
        refreshToken: "",
        expiresAt: new Date(Date.now() + 86_400_000),
        lastSyncAt: new Date(Date.now() - 3_600_000),
        meta: {},
      });
    });
    vi.stubGlobal("fetch", fakeFetch);
  });

  afterEach(() => fakeFetch.mockClear());

  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const t of [schema.movements, schema.squareSyncedOrders, schema.squareOutbox, schema.integrations, schema.products, schema.housekeepingReminders, schema.appUsers, schema.businessProfile]) {
      await db.delete(t).where(eq(t.businessId, a));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  const qtyOf = (id: number) => runForBusiness(a, async () => (await db.select().from(schema.products).where(and(eq(schema.products.businessId, a), eq(schema.products.id, id))))[0].qty);
  const sold = () =>
    runForBusiness(a, async () =>
      db.select().from(schema.movements).where(and(eq(schema.movements.businessId, a), eq(schema.movements.note, `Square sale ${order.id}`))),
    );

  it("logs an order once even when two syncs run at the same time", async () => {
    await runForBusiness(a, () => Promise.all([integ.syncSquareSales(), integ.syncSquareSales()]));
    expect(await qtyOf(shampoo)).toBe(18);
    expect(await qtyOf(cream)).toBe(18);
    // Shampoo once, cream once per line.
    expect(await sold()).toHaveLength(3);
    // A later sync that starts over never logs it again.
    await runForBusiness(a, async () => {
      await db.update(schema.integrations).set({ lastSyncAt: new Date(Date.now() - 3_600_000) }).where(eq(schema.integrations.businessId, a));
      const r = await integ.syncSquareSales();
      expect(r.sales).toBe(0);
      expect(r.alreadyLogged).toBe(1);
    });
    expect(await sold()).toHaveLength(3);
  });

  it("takes out double-counted sales (checked with Square) and puts the units back", async () => {
    // What the old sync did: the same order logged a second and a third time.
    await runForBusiness(a, async () => {
      for (let i = 0; i < 2; i++) {
        await inv.applyMovement({ productId: shampoo, type: "out", delta: -2, staffName: inv.SQUARE_STAFF_NAME, note: `Square sale ${order.id}` });
        await inv.applyMovement({ productId: cream, type: "out", delta: -1, staffName: inv.SQUARE_STAFF_NAME, note: `Square sale ${order.id}` });
        await inv.applyMovement({ productId: cream, type: "out", delta: -1, staffName: inv.SQUARE_STAFF_NAME, note: `Square sale ${order.id}` });
      }
    });
    expect(await qtyOf(shampoo)).toBe(14);
    const r = await runForBusiness(a, () => integ.removeDuplicateSquareSales());
    expect(r).toMatchObject({ ordersChecked: 1, ordersFixed: 1, removed: 6, units: 8, valueCents: 4 * 3000 + 4 * 2500 });
    expect(await qtyOf(shampoo)).toBe(18);
    expect(await qtyOf(cream)).toBe(18);
    expect(await sold()).toHaveLength(3);
    // Checked once: the real repeat line isn't looked at again.
    expect(await runForBusiness(a, () => integ.removeDuplicateSquareSales())).toBeNull();
    const status = await runForBusiness(a, () => integ.integrationStatus());
    expect(status.find((s) => s.provider === "square")?.salesCleanup?.removed).toBe(6);
  });
});
