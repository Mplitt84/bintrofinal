/**
 * Housekeeping against a real database: the defaults appear once, once-a-day jobs
 * count once, shop jobs are covered by one person, checkout reminders never double,
 * and a second business sees none of it.
 *
 * Needs a real database, so it skips unless NETLIFY_DB_URL is set.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("housekeeping", () => {
  let hk: typeof import("./housekeeping.server.js");
  let runForBusiness: typeof import("./tenant.js").runForBusiness;
  let signup: typeof import("./signup.server.js");
  let db: typeof import("../../db/index.js").db;
  let schema: typeof import("../../db/schema.js");
  let eq: typeof import("drizzle-orm").eq;
  let a = 0;
  let b = 0;
  const mark = `hk-${Date.now()}`;
  const day = "2026-11-16";

  beforeAll(async () => {
    hk = await import("./housekeeping.server.js");
    ({ runForBusiness } = await import("./tenant.js"));
    signup = await import("./signup.server.js");
    ({ db } = await import("../../db/index.js"));
    schema = await import("../../db/schema.js");
    ({ eq } = await import("drizzle-orm"));
    a = (await signup.createBusinessForOwner({ email: `${mark}-a@example.com`, name: "A", sub: `${mark}-a` })).businessId;
    b = (await signup.createBusinessForOwner({ email: `${mark}-b@example.com`, name: "B", sub: `${mark}-b` })).businessId;
  });

  afterAll(async () => {
    for (const id of [a, b]) {
      for (const t of [schema.housekeepingChecks, schema.housekeepingCommitments, schema.housekeepingReminders, schema.housekeepingTasks, schema.appUsers, schema.businessProfile]) {
        await db.delete(t).where(eq(t.businessId, id));
      }
      await db.delete(schema.businesses).where(eq(schema.businesses.id, id));
    }
  });

  it("starts each shop with the defaults, once", async () => {
    const first = await runForBusiness(a, () => hk.listTasks());
    const again = await runForBusiness(a, () => hk.listTasks());
    expect(first.length).toBeGreaterThanOrEqual(12);
    expect(again.map((t) => t.id)).toEqual(first.map((t) => t.id));
  });

  it("counts after-client taps every time, own jobs once, shop jobs once for everyone", async () => {
    await runForBusiness(a, async () => {
      const tasks = await hk.listTasks();
      const station = tasks.find((t) => t.key === "station-client")!;
      const organize = tasks.find((t) => t.key === "organize-station")!;
      const lock = tasks.find((t) => t.key === "lock-doors")!;
      expect(await hk.checkTask({ taskId: station.id, staffName: "Beth", dayKey: day })).toBe(true);
      expect(await hk.checkTask({ taskId: station.id, staffName: "Beth", dayKey: day })).toBe(true);
      expect(await hk.checkTask({ taskId: organize.id, staffName: "Beth", dayKey: day })).toBe(true);
      expect(await hk.checkTask({ taskId: organize.id, staffName: "beth", dayKey: day })).toBe(false);
      expect(await hk.checkTask({ taskId: organize.id, staffName: "Kanesha", dayKey: day })).toBe(true);
      expect(await hk.checkTask({ taskId: lock.id, staffName: "Kanesha", dayKey: day })).toBe(true);
      expect(await hk.checkTask({ taskId: lock.id, staffName: "Beth", dayKey: day })).toBe(false);
      const board = await hk.loadBoard(day, [day]);
      expect(board.checks.filter((c) => c.taskId === station.id)).toHaveLength(2);
      expect(board.checks.filter((c) => c.taskId === lock.id)).toHaveLength(1);
    });
  });

  it("makes one reminder per checkout and clears it with a station reset", async () => {
    await runForBusiness(a, async () => {
      const at = new Date();
      await hk.addCheckoutReminder({ ref: "square:o1", staffName: "Beth", detail: "Curl cream", at });
      await hk.addCheckoutReminder({ ref: "square:o1", staffName: "Beth", detail: "Curl cream", at });
      const open = await hk.openReminders();
      expect(open).toHaveLength(1);
      await hk.checkTask({ taskId: (await hk.stationTaskId())!, staffName: "Beth", dayKey: day, reminderId: open[0].id });
      expect(await hk.openReminders()).toHaveLength(0);
    });
  });

  it("lets a team member take on and drop optional jobs", async () => {
    await runForBusiness(a, async () => {
      const plants = (await hk.listTasks()).find((t) => t.key === "water-plants")!;
      expect(plants.required).toBe(false);
      expect((await hk.setCommitment("Beth", plants.id, true))["Beth"]).toEqual([plants.id]);
      await hk.setCommitment("Beth", plants.id, true);
      expect((await hk.listCommitments())["Beth"]).toHaveLength(1);
      expect((await hk.setCommitment("beth", plants.id, false))["Beth"]).toBeUndefined();
    });
  });

  it("starts a barbershop with barber jobs", async () => {
    await runForBusiness(b, async () => {
      await db.update(schema.businessProfile).set({ businessType: "barber" }).where(eq(schema.businessProfile.businessId, b));
      const tasks = await hk.listTasks();
      expect(tasks.some((t) => t.key === "clippers-oil" && t.required)).toBe(true);
      expect(tasks.some((t) => t.key === "clean-dispensary")).toBe(false);
    });
  });

  it("lets owners add, hide and remove jobs", async () => {
    await runForBusiness(a, async () => {
      const added = await hk.addTask({ name: "Wipe mirrors", icon: "sparkles", tone: "teal", cadence: "daily", scope: "shop", required: false, role: "artist", why: "" });
      const mine = added.find((t) => t.name === "Wipe mirrors")!;
      await expect(hk.addTask({ name: "wipe mirrors", icon: "sparkles", tone: "teal", cadence: "daily", scope: "shop", required: false, role: "artist", why: "" })).rejects.toThrow();
      const builtIn = added.find((t) => t.key === "water-plants")!;
      const afterHide = await hk.deleteTask(builtIn.id);
      expect(afterHide.find((t) => t.id === builtIn.id)?.active).toBe(false);
      const afterRemove = await hk.deleteTask(mine.id);
      expect(afterRemove.some((t) => t.id === mine.id)).toBe(false);
    });
  });

  it("keeps each business's housekeeping to itself", async () => {
    const other = await runForBusiness(b, () => hk.loadBoard(day, [day]));
    expect(other.checks).toHaveLength(0);
    expect(other.reminders).toHaveLength(0);
    expect(other.tasks.some((t) => t.name === "Wipe mirrors")).toBe(false);
    const aTask = (await runForBusiness(a, () => hk.listTasks()))[0];
    await expect(runForBusiness(b, () => hk.checkTask({ taskId: aTask.id, staffName: "X", dayKey: day }))).rejects.toThrow();
  });
});
