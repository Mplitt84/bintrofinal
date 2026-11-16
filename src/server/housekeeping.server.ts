/**
 * Housekeeping (server-only): the shop's jobs, today's check-offs, and the
 * "a client just checked out" reminders that Square sales create.
 * The rules for what a board shows live in src/lib/housekeeping.ts.
 */
import { and, asc, desc, eq, gt, gte, isNull, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businessProfile, housekeepingChecks, housekeepingCommitments, housekeepingReminders, housekeepingTasks, staffSchedules, staffShifts, teamMembers } from "../../db/schema.js";
import {
  ADDED_LATER_KEYS,
  DEFAULT_REPEAT,
  HK_REPEATS,
  housekeepingDefaultsFor,
  periodOf,
  shiftDay,
  STATION_TASK_KEY,
  nameKey,
  type HkCadence,
  type HkAssign,
  type HkCheck,
  type HkIcon,
  type HkReminder,
  type HkRepeat,
  type HkRole,
  type HkScope,
  type HkTask,
  type HkTone,
} from "../lib/housekeeping.js";
import { mine, owned } from "./tenant.js";

type TaskRow = typeof housekeepingTasks.$inferSelect;

/** A stored repeat, cleaned up: unknown kinds become every day, numbers kept in range. */
export function cleanRepeat(raw: unknown): HkRepeat {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<HkRepeat>;
  const kind = HK_REPEATS.some((k) => k.id === r.kind) ? r.kind! : "daily";
  const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d);
  return {
    kind,
    days: Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
    every: int(r.every, 1, 52, 1),
    anchor: typeof r.anchor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.anchor) ? r.anchor : DEFAULT_REPEAT.anchor,
    monthDay: int(r.monthDay, 1, 31, 1),
    flex: Boolean(r.flex),
  };
}

/** How far back the board reads taps: covers a flexible month and the week table. */
const HISTORY_DAYS = 40;

function toTask(r: TaskRow, assignees: string[] = []): HkTask {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    icon: r.icon as HkIcon,
    tone: r.tone as HkTone,
    cadence: r.cadence as HkCadence,
    scope: r.scope as HkScope,
    role: (r.role === "inventory" ? "inventory" : "artist") as HkRole,
    assign: (["everyone", "rotate", "assigned"].includes(r.assign) ? r.assign : "everyone") as HkAssign,
    assignees,
    repeat: cleanRepeat(r.repeat),
    why: r.why,
    active: r.active,
  };
}

/** Every job, starting the shop off with its trade's defaults the first time. */
export async function listTasks(): Promise<HkTask[]> {
  let rows = await db.select().from(housekeepingTasks).where(mine(housekeepingTasks)).orderBy(asc(housekeepingTasks.sortOrder), asc(housekeepingTasks.id));
  // New shops get their trade's list; shops set up before a job was added get just that job.
  const have = new Set(rows.map((r) => r.key));
  const missing = rows.length === 0 ? null : ADDED_LATER_KEYS.filter((k) => !have.has(k));
  if (missing === null || missing.length > 0) {
    const [profile] = await db.select({ type: businessProfile.businessType }).from(businessProfile).where(mine(businessProfile));
    const defaults = housekeepingDefaultsFor(profile?.type ?? "");
    const toAdd = defaults
      .map((t, i) => ({ ...t, sortOrder: (i + 1) * 10 }))
      .filter((t) => missing === null || missing.includes(t.key));
    if (toAdd.length) await db.insert(housekeepingTasks).values(toAdd.map((t) => ({ ...t, ...owned() }))).onConflictDoNothing();
    rows = await db.select().from(housekeepingTasks).where(mine(housekeepingTasks)).orderBy(asc(housekeepingTasks.sortOrder), asc(housekeepingTasks.id));
  }
  const assigned = await db.select().from(housekeepingCommitments).where(mine(housekeepingCommitments));
  const byTask = new Map<number, string[]>();
  for (const a of assigned) byTask.set(a.taskId, [...(byTask.get(a.taskId) ?? []), a.staffName]);
  return rows.map((r) => toTask(r, byTask.get(r.id) ?? []));
}

async function checksBetween(from: string, to: string): Promise<HkCheck[]> {
  const rows = await db
    .select()
    .from(housekeepingChecks)
    .where(and(mine(housekeepingChecks), gte(housekeepingChecks.dayKey, from), lte(housekeepingChecks.dayKey, to)))
    .orderBy(asc(housekeepingChecks.createdAt));
  return rows.map((r) => ({ id: r.id, taskId: r.taskId, staffName: r.staffName, at: r.createdAt.toISOString(), dayKey: r.dayKey }));
}

/** Reminders nobody has acted on yet, from the last 12 hours (older ones are yesterday's news). */
export async function openReminders(): Promise<HkReminder[]> {
  const since = new Date(Date.now() - 12 * 3_600_000);
  const rows = await db
    .select()
    .from(housekeepingReminders)
    .where(and(mine(housekeepingReminders), isNull(housekeepingReminders.doneAt), gt(housekeepingReminders.createdAt, since)))
    .orderBy(desc(housekeepingReminders.createdAt))
    .limit(30);
  return rows.map((r) => ({ id: r.id, staffName: r.staffName, detail: r.detail, at: r.createdAt.toISOString() }));
}

export type HousekeepingBoard = {
  tasks: HkTask[];
  /** Check-offs from the last ~40 days, each with its day: flexible weekly/monthly jobs and the week table read them. */
  history: HkCheck[];
  reminders: HkReminder[];
  /** Everyone on the team, providers first: the people the board lists. */
  people: string[];
  /** Team members marked "Manages inventory": Inventory Management is theirs. */
  inventoryManagers: string[];
  /** Who's working today: usual schedule for this weekday, Square bookings, or already checked in. */
  working: string[];
};

/** Who's in today: their usual schedule says so, Square has them booked, or they've already checked something off. */
export async function workingToday(dayKey: string, weekday: number, todaysChecks: Array<{ staffName: string }>) {
  const [scheduled, shifts] = await Promise.all([
    db.select({ staffName: staffSchedules.staffName }).from(staffSchedules).where(and(mine(staffSchedules), eq(staffSchedules.weekday, weekday))),
    db.select({ staffName: staffShifts.staffName }).from(staffShifts).where(and(mine(staffShifts), eq(staffShifts.dayKey, dayKey))),
  ]);
  const seen = new Map<string, string>();
  for (const r of [...scheduled, ...shifts, ...todaysChecks]) if (!seen.has(nameKey(r.staffName))) seen.set(nameKey(r.staffName), r.staffName);
  return [...seen.values()];
}

/** Everything the Housekeeping screen needs for one day (the device's local date and weekday). */
export async function loadBoard(dayKey: string, weekday = new Date(`${dayKey}T12:00:00`).getDay()): Promise<HousekeepingBoard> {
  const [tasks, history, reminders, team] = await Promise.all([
    listTasks(),
    checksBetween(shiftDay(dayKey, -HISTORY_DAYS), dayKey),
    openReminders(),
    db.select().from(teamMembers).where(mine(teamMembers)).orderBy(asc(teamMembers.name)),
  ]);
  const people = [...team.filter((t) => t.isProvider), ...team.filter((t) => !t.isProvider)].map((t) => t.name);
  const checks = history.filter((c) => c.dayKey === dayKey);
  return {
    tasks,
    history,
    reminders,
    people,
    inventoryManagers: team.filter((t) => t.managesInventory).map((t) => t.name),
    working: await workingToday(dayKey, weekday, checks),
  };
}

/** Who an `assigned` job belongs to: replaces the list. */
export async function setAssignees(taskId: number, names: string[]) {
  await db.delete(housekeepingCommitments).where(and(mine(housekeepingCommitments), eq(housekeepingCommitments.taskId, taskId)));
  const clean = [...new Map(names.map((n) => [nameKey(n), n.trim()])).values()].filter(Boolean);
  if (clean.length) await db.insert(housekeepingCommitments).values(clean.map((staffName) => ({ ...owned(), staffName, taskId })));
}

/**
 * Logs one tap. Once-a-day jobs only count once per person (or once for the whole shop,
 * for shop jobs); after-client jobs count every tap. Returns false when the tap
 * didn't add anything (already done today).
 */
export async function checkTask(input: { taskId: number; staffName: string; dayKey: string; reminderId?: number }) {
  const [task] = await db
    .select()
    .from(housekeepingTasks)
    .where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, input.taskId)));
  if (!task || !task.active) throw new Error("That job isn't on the list any more.");
  const staffName = input.staffName.trim();
  if (!staffName) throw new Error("Pick who you are first.");

  let added = true;
  if (task.cadence !== "client") {
    // A job counts once in its stretch: today, or the whole week / month for flexible jobs.
    const { start } = periodOf(cleanRepeat(task.repeat), input.dayKey);
    const today = await db
      .select({ staffName: housekeepingChecks.staffName })
      .from(housekeepingChecks)
      .where(and(mine(housekeepingChecks), eq(housekeepingChecks.taskId, task.id), gte(housekeepingChecks.dayKey, start), lte(housekeepingChecks.dayKey, input.dayKey)));
    const already = task.scope === "shop" ? today.length > 0 : today.some((c) => nameKey(c.staffName) === nameKey(staffName));
    if (already) added = false;
  }
  if (added) {
    await db.insert(housekeepingChecks).values({ ...owned(), taskId: task.id, staffName, dayKey: input.dayKey });
  }
  if (input.reminderId) {
    await db
      .update(housekeepingReminders)
      .set({ doneAt: new Date(), doneBy: staffName })
      .where(and(mine(housekeepingReminders), eq(housekeepingReminders.id, input.reminderId), isNull(housekeepingReminders.doneAt)));
  }
  return added;
}

/** Takes back a tap made today (a mis-tap), only by the person who made it. */
export async function undoCheck(checkId: number, staffName: string, dayKey: string) {
  const [row] = await db
    .select()
    .from(housekeepingChecks)
    .where(and(mine(housekeepingChecks), eq(housekeepingChecks.id, checkId)));
  if (!row || row.dayKey !== dayKey || nameKey(row.staffName) !== nameKey(staffName)) {
    throw new Error("Only today's tap by the same person can be taken back.");
  }
  await db.delete(housekeepingChecks).where(and(mine(housekeepingChecks), eq(housekeepingChecks.id, checkId)));
}

/** Clears a reminder without logging a clean (it wasn't theirs, or it was a refund). */
export async function dismissReminder(id: number, staffName: string) {
  await db
    .update(housekeepingReminders)
    .set({ doneAt: new Date(), doneBy: `${staffName.trim()} (dismissed)` })
    .where(and(mine(housekeepingReminders), eq(housekeepingReminders.id, id), isNull(housekeepingReminders.doneAt)));
}

export type TaskInput = {
  name: string;
  icon: HkIcon;
  tone: HkTone;
  cadence: HkCadence;
  scope: HkScope;
  role: HkRole;
  assign: HkAssign;
  repeat?: HkRepeat;
  why: string;
  /** For `assigned` jobs. */
  assignees?: string[];
};

/** A job the owner adds. Its name must be new to this shop. */
export async function addTask(input: TaskInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the job a name.");
  const existing = await listTasks();
  if (existing.some((t) => nameKey(t.name) === nameKey(name))) throw new Error("There's already a job with that name.");
  const { assignees, ...fields } = input;
  // Added jobs sit after the built-in ones, in the order they were added.
  const [row] = await db
    .insert(housekeepingTasks)
    .values({ ...owned(), ...fields, repeat: cleanRepeat(fields.repeat), name, why: input.why.trim(), required: input.assign === "everyone", key: "", sortOrder: 1000 + existing.length * 10 })
    .returning({ id: housekeepingTasks.id });
  if (assignees) await setAssignees(row.id, assignees);
  return listTasks();
}

/** Change a job's look, timing, or hide it. Built-in jobs can be hidden but keep their key. */
export async function updateTask(id: number, patch: Partial<TaskInput> & { active?: boolean }) {
  const { assignees, ...fields } = patch;
  if (assignees) await setAssignees(id, assignees);
  const set = Object.fromEntries(
    Object.entries({
      ...fields,
      name: fields.name?.trim(),
      why: fields.why?.trim(),
      repeat: fields.repeat ? cleanRepeat(fields.repeat) : undefined,
      required: fields.assign ? fields.assign === "everyone" : undefined,
    }).filter(([, v]) => v !== undefined),
  );
  if (set.name === "") throw new Error("Give the job a name.");
  if (Object.keys(set).length) {
    await db.update(housekeepingTasks).set(set).where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, id)));
  }
  return listTasks();
}

/** Removes a job the owner added. Built-in jobs are hidden instead, so their history keeps its name. */
export async function deleteTask(id: number) {
  const [row] = await db.select().from(housekeepingTasks).where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, id)));
  if (!row) return listTasks();
  if (row.key) {
    await db.update(housekeepingTasks).set({ active: false }).where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, id)));
  } else {
    await db.delete(housekeepingChecks).where(and(mine(housekeepingChecks), eq(housekeepingChecks.taskId, id)));
    await db.delete(housekeepingCommitments).where(and(mine(housekeepingCommitments), eq(housekeepingCommitments.taskId, id)));
    await db.delete(housekeepingTasks).where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, id)));
  }
  return listTasks();
}

/** The job a checkout reminder ticks off: the built-in "after each client" station clean. */
export async function stationTaskId() {
  const tasks = await listTasks();
  return (tasks.find((t) => t.key === STATION_TASK_KEY && t.active) ?? tasks.find((t) => t.cadence === "client" && t.active))?.id ?? null;
}

/** One reminder per checkout; the same checkout never makes two. */
export async function addCheckoutReminder(input: { ref: string; staffName: string; detail: string; at: Date }) {
  await db
    .insert(housekeepingReminders)
    .values({ ...owned(), ref: input.ref, staffName: input.staffName, detail: input.detail.slice(0, 120), createdAt: input.at })
    .onConflictDoNothing();
}

/** Keeps a renamed team member's housekeeping under their new name. */
export async function renameInHousekeeping(from: string, to: string) {
  await db.update(housekeepingChecks).set({ staffName: to }).where(and(mine(housekeepingChecks), eq(housekeepingChecks.staffName, from)));
  await db.update(housekeepingReminders).set({ staffName: to }).where(and(mine(housekeepingReminders), eq(housekeepingReminders.staffName, from)));
  await db.update(housekeepingCommitments).set({ staffName: to }).where(and(mine(housekeepingCommitments), eq(housekeepingCommitments.staffName, from)));
}
