/**
 * The test this whole change exists for: two businesses in one database must never
 * see each other's products, clients, money or settings.
 *
 * It runs against a real Postgres, so it is skipped unless NETLIFY_DB_URL is set:
 *
 *   NETLIFY_DB_URL=postgres://postgres@127.0.0.1:5433/bintro NETLIFY_DB_DRIVER=server \
 *     npx vitest run src/server/tenancy.int.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("two businesses in one database", () => {
  // Imported lazily so the suite skips cleanly with no database configured.
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let inventory: typeof import("./inventory.server.js");
  let business: typeof import("./business.server.js");
  let formulas: typeof import("./formulas.server.js");
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  const A = 1; // the business that was already here
  let B = 0; // a second business, created by this test
  const mark = `tenancy-test-${Date.now()}`;

  beforeAll(async () => {
    ({ runForBusiness } = await import("./tenant.js"));
    inventory = await import("./inventory.server.js");
    business = await import("./business.server.js");
    formulas = await import("./formulas.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));

    const [row] = await db
      .insert(schema.businesses)
      .values({ name: `Second salon (${mark})`, createdByEmail: "" })
      .returning();
    B = row.id;
  });

  afterAll(async () => {
    if (!B) return;
    for (const table of [
      schema.movements,
      schema.products,
      schema.clientFormulas,
      schema.teamMembers,
      schema.businessProfile,
    ]) {
      await db.delete(table).where(eq(table.businessId, B));
    }
    await db.delete(schema.businesses).where(eq(schema.businesses.id, B));
  });

  it("keeps each business's products to itself", async () => {
    const theirs = await runForBusiness(B, () =>
      inventory.insertProduct({ barcode: `${mark}-B`, name: "Second salon shampoo" }),
    );
    expect(theirs.businessId).toBe(B);

    const seenByB = await runForBusiness(B, () => inventory.findAllProducts());
    const seenByA = await runForBusiness(A, () => inventory.findAllProducts());

    expect(seenByB.map((p) => p.id)).toContain(theirs.id);
    expect(seenByA.map((p) => p.id)).not.toContain(theirs.id);
    expect(seenByA.every((p) => p.businessId === A)).toBe(true);
  });

  it("does not let one business read another's product by its id", async () => {
    const theirs = await runForBusiness(B, () =>
      inventory.insertProduct({ barcode: `${mark}-B2`, name: "Private to B" }),
    );
    expect(await runForBusiness(A, () => inventory.findProductById(theirs.id))).toBeNull();
    expect(await runForBusiness(B, () => inventory.findProductById(theirs.id))).not.toBeNull();
  });

  it("does not let one business change another's product", async () => {
    const theirs = await runForBusiness(B, () =>
      inventory.insertProduct({ barcode: `${mark}-B3`, name: "Do not touch", qty: 5 }),
    );
    await runForBusiness(A, () => inventory.updateProductFields(theirs.id, { name: "Hijacked" }));
    const after = await runForBusiness(B, () => inventory.findProductById(theirs.id));
    expect(after?.name).toBe("Do not touch");
  });

  it("does not let one business delete another's product", async () => {
    const theirs = await runForBusiness(B, () =>
      inventory.insertProduct({ barcode: `${mark}-B4`, name: "Still here" }),
    );
    await runForBusiness(A, () => inventory.deleteProductById(theirs.id));
    expect(await runForBusiness(B, () => inventory.findProductById(theirs.id))).not.toBeNull();
  });

  it("lets two businesses use the same barcode for different products", async () => {
    const shared = `${mark}-shared`;
    const forA = await runForBusiness(A, () =>
      inventory.insertProduct({ barcode: shared, name: "A's own product" }),
    );
    const forB = await runForBusiness(B, () =>
      inventory.insertProduct({ barcode: shared, name: "B's own product" }),
    );
    expect(forA.id).not.toBe(forB.id);
    expect((await runForBusiness(A, () => inventory.findProductByBarcode(shared)))?.name).toBe("A's own product");
    expect((await runForBusiness(B, () => inventory.findProductByBarcode(shared)))?.name).toBe("B's own product");
    await runForBusiness(A, () => inventory.deleteProductById(forA.id));
  });

  it("keeps the two businesses' stock counts apart", async () => {
    const statsBefore = await runForBusiness(A, () => inventory.computeStats());
    await runForBusiness(B, async () => {
      const p = await inventory.insertProduct({ barcode: `${mark}-B5`, name: "Counts for B only", qty: 0 });
      await inventory.applyMovement({
        productId: p.id,
        type: "in",
        delta: 40,
        staffName: "Tester",
        square: "later",
      });
    });
    const statsAfter = await runForBusiness(A, () => inventory.computeStats());
    expect(statsAfter).toEqual(statsBefore);
  });

  it("keeps client records apart", async () => {
    await runForBusiness(B, () =>
      formulas.saveFormula({
        kind: "hair",
        clientName: `${mark}-client`,
        serviceDate: "2026-11-12",
        service: "Root touch-up",
        lines: [{ item: "7N", amount: "30 g" }],
        tags: [],
        retail: [],
        developer: "",
        ratio: "",
        processingMinutes: 0,
        leftover: "",
        aftercare: "",
        followUpOn: "",
        notes: "",
        staffName: "Tester",
      }),
    );
    const bSees = await runForBusiness(B, () => formulas.allFormulas());
    const aSees = await runForBusiness(A, () => formulas.allFormulas());
    expect(bSees.some((f) => f.clientName === `${mark}-client`)).toBe(true);
    expect(aSees.some((f) => f.clientName === `${mark}-client`)).toBe(false);
  });

  it("gives each business its own settings and team", async () => {
    await runForBusiness(B, () => business.saveBusinessProfile({ name: "Second Salon" }));
    await runForBusiness(B, () => business.insertTeamMember("Only at B"));

    expect((await runForBusiness(B, () => business.findBusinessProfile())).name).toBe("Second Salon");
    expect((await runForBusiness(A, () => business.findBusinessProfile())).name).not.toBe("Second Salon");

    const teamA = await runForBusiness(A, () => business.findTeamMembers());
    const teamB = await runForBusiness(B, () => business.findTeamMembers());
    expect(teamB.map((t) => t.name)).toContain("Only at B");
    expect(teamA.map((t) => t.name)).not.toContain("Only at B");
  });

  it("keeps the money apart", async () => {
    const monthKey = "2099-01";
    const window = [{ key: monthKey, start: "2099-01-01T00:00:00Z", end: "2099-02-01T00:00:00Z" }];
    await runForBusiness(B, () =>
      business.insertExpense({ spentOn: "2099-01-15", amountCents: 12_345, vendor: mark }),
    );
    const [monthB] = await runForBusiness(B, () => business.computeBudgetOverview(window));
    const [monthA] = await runForBusiness(A, () => business.computeBudgetOverview(window));
    expect(monthB.expenseCents).toBe(12_345);
    expect(monthA.expenseCents).toBe(0);
    await runForBusiness(B, async () => {
      const rows = await business.findExpensesForMonth(monthKey);
      for (const r of rows) await business.deleteExpense(r.id);
    });
  });
});
