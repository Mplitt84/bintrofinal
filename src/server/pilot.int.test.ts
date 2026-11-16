/**
 * Pilot invites: each invited tester must land in a business of their own, never in
 * the site owner's, and never able to see another tester's email.
 *
 * Needs a real database, so it skips unless NETLIFY_DB_URL is set.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("pilot invites", () => {
  let pilot: typeof import("./pilot.server.js");
  let auth: typeof import("./auth.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let inArray: typeof import("drizzle-orm").inArray;

  const mark = `pilot-test-${Date.now()}`;
  const tester = (n: number) => ({ email: `${mark}-${n}@example.com`, name: `Tester ${n}`, sub: `g-${mark}-${n}` });
  const made: number[] = [];

  beforeEach(async () => {
    pilot ??= await import("./pilot.server.js");
    auth ??= await import("./auth.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    ({ db } = await import("../../db/index.js"));
    schema ??= await import("../../db/schema.js");
    ({ eq, inArray } = await import("drizzle-orm"));
    delete process.env.BINTRO_SIGNUP_OPEN;
  });

  afterAll(async () => {
    const emails = [1, 2, 3, 4].map((n) => tester(n).email);
    await db.delete(schema.pilotInvites).where(inArray(schema.pilotInvites.email, emails));
    await db.delete(schema.signInAttempts).where(inArray(schema.signInAttempts.email, emails));
    for (const id of made) {
      for (const t of [schema.appUsers, schema.account, schema.businessProfile]) await db.delete(t).where(eq(t.businessId, id));
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("refuses an email nobody invited while sign-up is closed, and logs it for the site owner", async () => {
    await expect(auth.userForGoogle(tester(4))).rejects.toThrow("not-allowed");
    await expect(auth.userForGoogle(tester(4))).rejects.toThrow("not-allowed");
    const seen = (await pilot.listRefusedSignIns()).find((r) => r.email === tester(4).email);
    expect(seen?.tries).toBe(2);
    expect(seen?.name).toBe("Tester 4");
  });

  it("gives each invited tester their own business, as its owner", async () => {
    await pilot.addInvite(tester(1).email, "nail studio", "owner@example.com");
    await pilot.addInvite(tester(2).email, "", "owner@example.com");
    const a = await auth.userForGoogle(tester(1));
    const b = await auth.userForGoogle(tester(2));
    made.push(a.businessId, b.businessId);
    expect(a.role).toBe("owner");
    expect(b.role).toBe("owner");
    expect(a.businessId).not.toBe(1);
    expect(b.businessId).not.toBe(1);
    expect(a.businessId).not.toBe(b.businessId);

    // Signing in again finds the same business, not a new one.
    const again = await auth.userForGoogle(tester(1));
    expect(again.businessId).toBe(a.businessId);

    const listed = await pilot.listInvites();
    expect(listed.find((i) => i.email === tester(1).email)?.joinedAt).toBeTruthy();
  });

  it("never shows one tester another tester's email", async () => {
    const [a] = await db.select().from(schema.appUsers).where(eq(schema.appUsers.email, tester(1).email));
    const seen = await runForBusiness(a.businessId, () => auth.listUsers());
    expect(seen.map((u) => u.email)).toEqual([tester(1).email]);
  });

  it("won't pull a tester into another business through the access list", async () => {
    const [b] = await db.select().from(schema.appUsers).where(eq(schema.appUsers.email, tester(2).email));
    // Already in their own business: can't be added (or have their role changed) from tester 1's.
    const [a] = await db.select().from(schema.appUsers).where(eq(schema.appUsers.email, tester(1).email));
    await expect(runForBusiness(a.businessId, () => auth.addUser(tester(2).email, "staff", "x"))).rejects.toThrow();
    const [after] = await db.select().from(schema.appUsers).where(eq(schema.appUsers.id, b.id));
    expect(after.role).toBe("owner");
    expect(after.businessId).toBe(b.businessId);

    // Invited but not signed in yet: can't be added to the site owner's business either.
    await pilot.addInvite(tester(3).email, "", "owner@example.com");
    await expect(runForBusiness(1, () => auth.addUser(tester(3).email, "staff", "x"))).rejects.toThrow();
  });

  it("only takes back an invite nobody has used", async () => {
    const list = await pilot.listInvites();
    const joined = list.find((i) => i.email === tester(1).email)!;
    const waiting = list.find((i) => i.email === tester(3).email)!;
    await expect(pilot.removeInvite(joined.id)).rejects.toThrow();
    await pilot.removeInvite(waiting.id);
    expect((await pilot.listInvites()).some((i) => i.email === tester(3).email)).toBe(false);
  });

  it("knows the site owner from everyone else", () => {
    process.env.BINTRO_OWNER_EMAIL = "boss@example.com";
    expect(auth.isSiteOwner({ email: "boss@example.com", role: "owner", businessId: 1 })).toBe(true);
    expect(auth.isSiteOwner({ email: "boss@example.com", role: "owner", businessId: 7 })).toBe(false);
    expect(auth.isSiteOwner({ email: "boss@example.com", role: "staff", businessId: 1 })).toBe(false);
    expect(auth.isSiteOwner({ email: tester(1).email, role: "owner", businessId: 1 })).toBe(false);
    delete process.env.BINTRO_OWNER_EMAIL;
  });
});
