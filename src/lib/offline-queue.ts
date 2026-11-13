/**
 * Scans made with no signal (client-safe).
 *
 * Salon back rooms have dead spots. A scan that fails because the phone dropped
 * the network is kept on the device and sent the moment it comes back, so nobody
 * has to remember what they counted. Only scans queue: they are small, additive
 * and safe to replay. Everything else still asks for a connection.
 */

const KEY = "bintro.offlineScans";
/** Plenty for a stock-up in a dead spot; beyond this something else is wrong. */
export const MAX_QUEUED = 200;
/** A scan older than this is stale enough that sending it would confuse the count. */
export const KEEP_HOURS = 48;

export type QueuedScan = {
  /** Made on the device, so a scan is never sent twice. */
  id: string;
  barcode: string;
  type: "in" | "out";
  qty: number;
  staffName: string;
  /** When it was scanned, not when it was sent. */
  at: number;
};

type Store = { read: () => string | null; write: (v: string) => void };

const browserStore: Store = {
  read: () => (typeof window === "undefined" ? null : window.localStorage.getItem(KEY)),
  write: (v) => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, v);
  },
};

export function newScanId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Everything still waiting, oldest first. Anything unreadable or stale is dropped. */
export function queuedScans(now = Date.now(), store: Store = browserStore): QueuedScan[] {
  try {
    const raw = store.read();
    if (!raw) return [];
    const rows = JSON.parse(raw) as QueuedScan[];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.barcode === "string" &&
          r.barcode.length > 0 &&
          (r.type === "in" || r.type === "out") &&
          Number.isFinite(r.qty) &&
          r.qty > 0 &&
          typeof r.at === "number" &&
          now - r.at < KEEP_HOURS * 3_600_000,
      )
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

/** Adds one scan to the back of the queue and returns the new queue. */
export function queueScan(
  scan: Omit<QueuedScan, "id" | "at"> & Partial<Pick<QueuedScan, "id" | "at">>,
  now = Date.now(),
  store: Store = browserStore,
) {
  const rows = queuedScans(now, store);
  const row: QueuedScan = {
    id: scan.id ?? newScanId(),
    barcode: scan.barcode.trim(),
    type: scan.type,
    qty: Math.max(1, Math.trunc(scan.qty)),
    staffName: scan.staffName ?? "",
    at: scan.at ?? now,
  };
  // Oldest go first if the queue is somehow full, so the newest scan is never lost.
  const next = [...rows, row].slice(-MAX_QUEUED);
  store.write(JSON.stringify(next));
  return next;
}

/** Removes scans that have been sent (or given up on). */
export function removeScans(ids: string[], now = Date.now(), store: Store = browserStore) {
  const drop = new Set(ids);
  const next = queuedScans(now, store).filter((r) => !drop.has(r.id));
  store.write(JSON.stringify(next));
  return next;
}

export function clearQueue(store: Store = browserStore) {
  store.write("[]");
}

/**
 * Whether a failed scan looks like "no signal" rather than something the business
 * needs to know about. A rejected sign-in or a refused request is not retried.
 */
export function looksOffline(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/SIGNED_OUT|Only an owner|plan|not-allowed/i.test(message)) return false;
  return /fetch|network|offline|load failed|connection|timeout|aborted/i.test(message);
}

/** "3 scans waiting" / "1 scan waiting". */
export function waitingLabel(n: number) {
  return `${n} scan${n === 1 ? "" : "s"} waiting`;
}
