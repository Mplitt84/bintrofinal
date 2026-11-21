/** The help line: a shop writes, the site owner sees and replies, shops never see each other. Skips without NETLIFY_DB_URL. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("support messages", () => {
  const mark = `sp-${Date.now()}`;
  let a = 0;
  let b = 0;
  let sp: typeof import("./support.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    sp = await import("./support.server.js");
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
      await db.delete(schema.supportMessages).where(eq(schema.supportMessages.businessId, id));
      for (const t of [schema.appUsers, schema.businessProfile]) await db.delete(t).where(eq(t.businessId, id));
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("a shop writes, the owner sees it unread, replies, and the shop sees the reply", async () => {
    await runForBusiness(a, () => sp.sendSupport({ kind: "problem", body: "Scanner won't open", page: "scan", device: "iPhone", fromName: "Beth", fromEmail: "beth@example.com" }));
    expect((await sp.ownerUnread()).some((u) => u.body === "Scanner won't open")).toBe(true);
    expect((await sp.ownerInbox()).find((m) => m.businessId === a)).toMatchObject({ kind: "problem", direction: "in" });
    await sp.ownerReply(a, "Try reloading — fixed now", "Minnie");
    expect((await sp.ownerUnread()).some((u) => u.body === "Scanner won't open")).toBe(false);
    await runForBusiness(a, async () => {
      expect(await sp.myUnread()).toBe(1);
      const t = await sp.myThread();
      expect(t.map((m) => m.direction)).toEqual(["in", "out"]);
      expect(await sp.myUnread()).toBe(0);
    });
    await runForBusiness(b, async () => expect(await sp.myThread()).toHaveLength(0));
  });

  it("raises one automatic problem per shop per hour, never for business 1", async () => {
    await runForBusiness(b, async () => {
      expect(await sp.autoReportProblem({ message: "boom", where: "reports", staffName: "", device: "" })).toBe(true);
      expect(await sp.autoReportProblem({ message: "boom again", where: "reports", staffName: "", device: "" })).toBe(false);
      expect((await sp.myThread()).filter((m) => m.kind === "auto-error")).toHaveLength(1);
    });
    expect(await runForBusiness(1, () => sp.autoReportProblem({ message: "x", where: "", staffName: "", device: "" }))).toBe(false);
  });
});
