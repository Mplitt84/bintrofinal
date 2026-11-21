/** Inviting team members: linked team names, roles, last-owner guard, own reminders. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { staffMayChangeProfile } from "../lib/auth.js";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

describe("what staff may change on the profile", () => {
  it("only the order cycle and tax state", () => {
    expect(staffMayChangeProfile(["orderEveryDays"])).toBe(true);
    expect(staffMayChangeProfile(["taxState", "orderEveryDays"])).toBe(true);
    expect(staffMayChangeProfile(["palette"])).toBe(false);
    expect(staffMayChangeProfile(["orderEveryDays", "hours"])).toBe(false);
  });
});

maybe("staff access", () => {
  const mark = `sa-${Date.now()}`;
  let a = 0;
  let auth: typeof import("./auth.server.js");
  let biz: typeof import("./business.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    auth = await import("./auth.server.js");
    biz = await import("./business.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    const signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}-owner@example.com`, name: "Owner", sub: `${mark}o` })).businessId;
  });

  afterAll(async () => {
    for (const t of [schema.teamMembers, schema.appUsers, schema.businessProfile]) await db.delete(t).where(eq(t.businessId, a));
    await db.delete(schema.businesses).where(eq(schema.businesses.id, a));
  });

  it("invites a team member linked to their team name, and changes it later", async () => {
    await runForBusiness(a, async () => {
      await auth.addUser(`${mark}-beth@example.com`, "staff", "test", "Beth E");
      const beth = (await auth.listUsers()).find((u) => u.email === `${mark}-beth@example.com`)!;
      expect(beth).toMatchObject({ role: "staff", teamName: "Beth E", remindersOn: true });
      await auth.updateUser(beth.id, { teamName: "Beth Englert" });
      expect((await auth.listUsers()).find((u) => u.id === beth.id)!.teamName).toBe("Beth Englert");
      const { token } = await auth.createSession(beth.id, "test");
      expect(await auth.userForToken(token)).toMatchObject({ role: "staff", teamName: "Beth Englert", businessId: a });
      await auth.endSession(token);
      await auth.setOwnReminders(beth.id, false);
      expect((await auth.listUsers()).find((u) => u.id === beth.id)!.remindersOn).toBe(false);
    });
  });

  it("keeps at least one owner", async () => {
    await runForBusiness(a, async () => {
      const owner = (await auth.listUsers()).find((u) => u.role === "owner")!;
      await expect(auth.updateUser(owner.id, { role: "staff" })).rejects.toThrow(/at least one owner/);
    });
  });

  it("saves shop hours on the profile", async () => {
    await runForBusiness(a, async () => {
      const p = await biz.saveBusinessProfile({ hours: { "1": { open: "10:00", close: "18:00" } } });
      expect(p.hours).toEqual({ "1": { open: "10:00", close: "18:00" } });
    });
  });
});
