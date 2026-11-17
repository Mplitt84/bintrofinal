/** Color bar and services against a real database. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("color bar", () => {
  const mark = `cb-${Date.now()}`;
  let a = 0;
  let b = 0;
  let cb: typeof import("./color-bar.server.js");
  let inv: typeof import("./inventory.server.js");
  let fm: typeof import("./formulas.server.js");
  let trash: typeof import("./trash.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    cb = await import("./color-bar.server.js");
    inv = await import("./inventory.server.js");
    fm = await import("./formulas.server.js");
    trash = await import("./trash.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}a@example.com`, name: "A", sub: `${mark}a` })).businessId;
    b = (await signup.createBusinessForOwner({ email: `${mark}b@example.com`, name: "B", sub: `${mark}b` })).businessId;
  });

  afterAll(async () => {
    for (const id of [a, b]) {
      for (const t of [schema.trash, schema.colorBowls, schema.services, schema.clientFormulas, schema.priceHistory, schema.movements, schema.products, schema.appUsers, schema.businessProfile]) {
        await db.delete(t).where(eq(t.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("prices a bowl from product costs, writes the visit, and undo removes both", async () => {
    await runForBusiness(a, async () => {
      const tube = await inv.insertProduct({ barcode: `${mark}-t`, name: "EVO 7.1", brand: "Alfaparf", size: "60 ml", category: "Color", qty: 3, unitCostCents: 900 } as never);
      const { services } = await cb.saveService({ name: "Root touch-up", priceCents: 9500, minutes: 90, productCents: 0, active: true });
      const r = await cb.saveBowl({
        dayKey: "2026-11-17", clientName: "Ana R", serviceId: services[0].id, staffName: "Beth",
        lines: [{ productId: tube.id, name: "EVO 7.1", grams: 30 }, { productId: null, name: "Water", grams: 10 }],
        leftoverGrams: 5, chargedCents: 500, note: "", addToRecord: { kind: "hair" },
      });
      expect(r.bowl.costCents).toBe(450);
      expect(r.bowl.serviceName).toBe("Root touch-up");
      expect((await fm.listFormulas("Ana R"))[0].lines[0]).toEqual({ item: "EVO 7.1", amount: "30 g" });
      const loaded = await cb.loadColorBar("2026-11-01");
      expect(loaded.bowls).toHaveLength(1);
      await trash.undo(r.undoId);
      expect((await cb.loadColorBar("2026-11-01")).bowls).toHaveLength(0);
      expect(await fm.listFormulas("Ana R")).toHaveLength(0);
      expect((await inv.findProductByBarcode(`${mark}-t`))!.qty).toBe(3); // stock untouched
    });
  });

  it("refuses duplicate service names, deletes with undo, saves settings, keeps businesses apart", async () => {
    await runForBusiness(a, async () => {
      await expect(cb.saveService({ name: "root touch-up", priceCents: 1, minutes: 1, productCents: 0, active: true })).rejects.toThrow(/already/);
      const id = (await cb.listServices())[0].id;
      const d = await cb.deleteService(id);
      expect(d.services).toHaveLength(0);
      await trash.undo(d.undoId);
      expect(await cb.listServices()).toHaveLength(1);
      expect(await cb.saveColorBarSettings({ laborCentsPerHour: 3000 })).toMatchObject({ laborCentsPerHour: 3000 });
    });
    await runForBusiness(b, async () => {
      expect(await cb.listServices()).toHaveLength(0);
      expect((await cb.colorBarSettings()).laborCentsPerHour).toBe(0);
    });
  });
});
