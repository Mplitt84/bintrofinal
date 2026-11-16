/**
 * What a housekeeping reminder says, and sending it once (server-only).
 * Used by the Square sync (each checkout, last client) and the scheduled reminder job
 * (arriving, close-out). Never imports the integrations module, so both can use it.
 */
import { buildButtons, momentOf, nameKey, type HkDay, type HkMoment } from "../lib/housekeeping.js";
import { loadBoard } from "./housekeeping.server.js";
import { claimReminder, pushToStaff, wantsClientPush } from "./push.server.js";

/** The jobs still on this person's list for a moment today. */
export async function jobsLeft(staffName: string, dayKey: string, weekday: number, moment: HkMoment) {
  const board = await loadBoard(dayKey, weekday);
  const day: HkDay = {
    team: board.people,
    working: board.working.some((w) => nameKey(w) === nameKey(staffName)) ? board.working : [...board.working, staffName],
    inventoryManagers: board.inventoryManagers,
    dayKey,
  };
  return buildButtons(board.tasks, board.history, staffName, day)
    .filter((b) => b.onList && momentOf(b.task.cadence) === moment && (moment === "client" || !b.done))
    .map((b) => b.task.name);
}

const firstName = (n: string) => n.trim().split(/\s+/)[0];
const listLine = (jobs: string[]) => (jobs.length <= 4 ? jobs.join(" · ") : `${jobs.slice(0, 3).join(" · ")} + ${jobs.length - 3} more`);

export async function sendArrive(staffName: string, dayKey: string, weekday: number) {
  if (!(await claimReminder(staffName, "arrive", dayKey))) return false;
  const jobs = await jobsLeft(staffName, dayKey, weekday, "arrive");
  await pushToStaff(staffName, {
    title: `Welcome in, ${firstName(staffName)} ✨`,
    body: jobs.length ? `Start your day: ${listLine(jobs)}` : "Your start-of-day list is already done. Have a great day.",
    tag: `arrive-${dayKey}`,
  });
  return true;
}

export async function sendClose(staffName: string, dayKey: string, weekday: number, lastClient = false) {
  if (!(await claimReminder(staffName, "close", dayKey))) return false;
  const jobs = await jobsLeft(staffName, dayKey, weekday, "close");
  await pushToStaff(staffName, {
    title: lastClient ? `That was your last client, ${firstName(staffName)}` : `Time to close out, ${firstName(staffName)}`,
    body: jobs.length ? `Before you go: ${listLine(jobs)}` : "Everything on your list is done. Thank you!",
    tag: `close-${dayKey}`,
  });
  return true;
}

/** After a Square checkout: reset for the next client. Once per checkout. */
export async function sendClientCheckout(staffName: string, ref: string, detail: string, dayKey: string, weekday: number) {
  if (!staffName || !(await wantsClientPush(staffName))) return false;
  if (!(await claimReminder(staffName, "client", ref))) return false;
  const jobs = await jobsLeft(staffName, dayKey, weekday, "client");
  await pushToStaff(staffName, {
    title: "Client checked out · reset time",
    body: `${detail}. ${jobs.length ? listLine(jobs) : "Reset your station for the next one."}`,
    tag: ref,
  });
  return true;
}
