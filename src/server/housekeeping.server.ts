/**
 * Housekeeping (server-only): the shop's jobs, today's check-offs, and the
 * "a client just checked out" reminders that Square sales create.
 * The rules for what a board shows live in src/lib/housekeeping.ts.
 */
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businessProfile, housekeepingChecks, housekeepingCommitments, housekeepingReminders, housekeepingTasks, teamMembers } from "../../db/schema.js";
import {
  ADDED_LATER_KEYS,
  housekeepingDefaultsFor,
  STATION_TASK_KEY,
  nameKey,
  type HkCadence,
  type HkCheck,
  type HkCommitments,
  type HkIcon,
  type HkReminder,
  type HkRole,
  type HkScope,
  type HkTask,
  type HkTone,
} from "../lib/housekeeping.js";
import { mine, owned } from "./tenant.js";

type TaskRow = typeof housekeepingTasks.$inferSelect;

function toTask(r: TaskRow): HkTask {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    icon: r.icon as HkIcon,
    tone: r.tone as HkTone,
    cadence: r.cadence as HkCadence,
    scope: r.scope as HkScope,
    required: r.required,
    role: (r.role === "inventory" ? "inventory" : "artist") as HkRole,
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
  return rows.map(toTask);
}

async function checksFor(dayKeys: string[]): Promise<Array<HkCheck & { dayKey: string }>> {
  if (dayKeys.length === 0) return [];
  const rows = await db
    .select()
    .from(housekeepingChecks)
    .where(and(mine(housekeepingChecks), inArray(housekeepingChecks.dayKey, dayKeys)))
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
  /** Today's check-offs. */
  checks: HkCheck[];
  /** The last 7 days' check-offs (for the week view), each with its day. */
  week: Array<HkCheck & { dayKey: string }>;
  reminders: HkReminder[];
  /** Optional jobs each person has chosen to be responsible for. */
  commitments: HkCommitments;
  /** Everyone on the team, providers first: the people the board lists. */
  people: string[];
  /** Team members marked "Manages inventory": their lists carry the inventory obligations. */
  inventoryManagers: string[];
};

/** Everything the Housekeeping screen needs for one day (the device's local date and the 6 before it). */
export async function loadBoard(dayKey: string, weekKeys: string[]): Promise<HousekeepingBoard> {
  const [tasks, week, reminders, team, commitments] = await Promise.all([
    listTasks(),
    checksFor([...new Set([dayKey, ...weekKeys])]),
    openReminders(),
    db.select().from(teamMembers).where(mine(teamMembers)).orderBy(asc(teamMembers.name)),
    listCommitments(),
  ]);
  const people = [...team.filter((t) => t.isProvider), ...team.filter((t) => !t.isProvider)].map((t) => t.name);
  return {
    tasks,
    checks: week.filter((c) => c.dayKey === dayKey).map(({ dayKey: _d, ...c }) => c),
    week,
    reminders,
    commitments,
    people,
    inventoryManagers: team.filter((t) => t.managesInventory).map((t) => t.name),
  };
}

/** Everyone's chosen optional jobs, by name. */
export async function listCommitments(): Promise<HkCommitments> {
  const rows = await db.select().from(housekeepingCommitments).where(mine(housekeepingCommitments));
  const out: HkCommitments = {};
  for (const r of rows) (out[r.staffName] ??= []).push(r.taskId);
  return out;
}

/** Take on (or let go of) an optional job. Required jobs are on everyone's list already. */
export async function setCommitment(staffName: string, taskId: number, on: boolean) {
  const name = staffName.trim();
  if (!name) throw new Error("Pick who you are first.");
  const [task] = await db.select().from(housekeepingTasks).where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, taskId)));
  if (!task) throw new Error("That job isn't on the list any more.");
  if (on) {
    await db.insert(housekeepingCommitments).values({ ...owned(), staffName: name, taskId }).onConflictDoNothing();
  } else {
    const rows = await db.select().from(housekeepingCommitments).where(and(mine(housekeepingCommitments), eq(housekeepingCommitments.taskId, taskId)));
    const ids = rows.filter((r) => nameKey(r.staffName) === nameKey(name)).map((r) => r.id);
    if (ids.length) await db.delete(housekeepingCommitments).where(and(mine(housekeepingCommitments), inArray(housekeepingCommitments.id, ids)));
  }
  return listCommitments();
}

/**
 * Logs one tap. Once-a-day jobs only count once per person (or once for the whole shop,
 * for shop jobs); after-client jobs count every tap. Returns false when the tap
 * didn't add anything (already done today).
 */
export async function checkTask(input: { taskId: number; staffName: string; dayKey: string; weekKeys?: string[]; reminderId?: number }) {
  const [task] = await db
    .select()
    .from(housekeepingTasks)
    .where(and(mine(housekeepingTasks), eq(housekeepingTasks.id, input.taskId)));
  if (!task || !task.active) throw new Error("That job isn't on the list any more.");
  const staffName = input.staffName.trim();
  if (!staffName) throw new Error("Pick who you are first.");

  let added = true;
  if (task.cadence !== "client") {
    // Weekly jobs count once in the last 7 days; the rest once today.
    const days = task.cadence === "weekly" ? [...new Set([input.dayKey, ...(input.weekKeys ?? [])])] : [input.dayKey];
    const today = await db
      .select({ staffName: housekeepingChecks.staffName })
      .from(housekeepingChecks)
      .where(and(mine(housekeepingChecks), eq(housekeepingChecks.taskId, task.id), inArray(housekeepingChecks.dayKey, days)));
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
  required: boolean;
  role: HkRole;
  why: string;
};

/** A job the owner adds. Its name must be new to this shop. */
export async function addTask(input: TaskInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the job a name.");
  const existing = await listTasks();
  if (existing.some((t) => nameKey(t.name) === nameKey(name))) throw new Error("There's already a job with that name.");
  // Added jobs sit after the built-in ones, in the order they were added.
  await db.insert(housekeepingTasks).values({ ...owned(), ...input, name, why: input.why.trim(), key: "", sortOrder: 1000 + existing.length * 10 });
  return listTasks();
}

/** Change a job's look, timing, or hide it. Built-in jobs can be hidden but keep their key. */
export async function updateTask(id: number, patch: Partial<TaskInput> & { active?: boolean }) {
  const set = Object.fromEntries(
    Object.entries({ ...patch, name: patch.name?.trim(), why: patch.why?.trim() }).filter(([, v]) => v !== undefined),
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
