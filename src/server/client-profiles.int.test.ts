/** Client profiles: save, rename / merge with undo, delete + restore, tenancy. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("client profiles", () => {
  const mark = `cp-${Date.now()}`;
  let a = 0;
  let b = 0;
  let cp: typeof import("./client-profiles.server.js");
  let fm: typeof import("./formulas.server.js");
  let trash: typeof import("./trash.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  const visit = (clientName: string, serviceDate: string) => ({
    kind: "hair" as const, clientName, serviceDate, service: "Gloss", lines: [], tags: [], retail: [], developer: "", ratio: "",
    processingMinutes: 0, leftover: "", aftercare: "", followUpOn: "", notes: "", staffName: "Beth",
  });
  const blank = { phone: "", email: "", birthday: "", sensitivities: "", preferences: "", notes: "", rebookDays: 0 };

  beforeAll(async () => {
    cp = await import("./client-profiles.server.js");
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
      for (const t of [schema.trash, schema.clientProfiles, schema.clientFormulas, schema.appUsers, schema.businessProfile]) await db.delete(t).where(eq(t.businessId, id));
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("saves one profile per client name, and undo restores the edit", async () => {
    await runForBusiness(a, async () => {
      await cp.saveProfile({ name: "Ana R", ...blank, phone: "512" });
      const { undoId } = await cp.saveProfile({ name: " ana  r ", ...blank, phone: "999", sensitivities: "PPD" });
      expect((await cp.listProfiles()).length).toBe(1);
      expect((await cp.profileFor("ANA R"))!.phone).toBe("999");
      await trash.undo(undoId);
      expect((await cp.profileFor("Ana R"))!.phone).toBe("512");
    });
  });

  it("merges a client typed two ways, and undo splits them back", async () => {
    await runForBusiness(a, async () => {
      await fm.saveFormula(visit("Ana R", "2026-10-01"));
      await fm.saveFormula(visit("Anna R.", "2026-11-01"));
      await cp.saveProfile({ name: "Anna R.", ...blank, email: "ana@example.com" });
      const r = await cp.renameClient("Anna R.", "Ana R");
      expect(r).toMatchObject({ merged: true, visits: 1 });
      expect((await fm.listFormulas("Ana R")).every((v) => v.clientName === "Ana R")).toBe(true);
      expect((await cp.profileFor("Ana R"))!).toMatchObject({ phone: "512", email: "ana@example.com" });
      expect(await cp.profileFor("Anna R.")).toBeNull();
      await trash.undo(r.undoId);
      expect((await fm.listFormulas("Anna")).some((v) => v.clientName === "Anna R.")).toBe(true);
      expect((await cp.profileFor("Anna R."))!.email).toBe("ana@example.com");
      expect((await cp.profileFor("Ana R"))!.email).toBe("");
    });
  });

  it("deletes a client with their visits and restores them", async () => {
    await runForBusiness(a, async () => {
      const r = await cp.deleteClient("Ana R");
      expect(r.visits).toBe(1);
      expect(await cp.profileFor("Ana R")).toBeNull();
      expect((await fm.listFormulas("Ana R")).filter((v) => v.clientName === "Ana R")).toHaveLength(0);
      await trash.undo(r.undoId);
      expect(await cp.profileFor("Ana R")).not.toBeNull();
      expect((await fm.listFormulas("Ana R")).filter((v) => v.clientName === "Ana R")).toHaveLength(1);
    });
  });

  it("keeps businesses apart", async () => {
    await runForBusiness(b, async () => {
      expect(await cp.listProfiles()).toHaveLength(0);
      expect(await cp.profileFor("Ana R")).toBeNull();
      const r = await cp.renameClient("Ana R", "Someone");
      expect(r.visits).toBe(0);
    });
    await runForBusiness(a, async () => expect(await cp.profileFor("Ana R")).not.toBeNull());
  });
});
