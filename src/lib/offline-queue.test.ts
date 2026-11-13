import { beforeEach, describe, expect, it } from "vitest";
import {
  KEEP_HOURS,
  MAX_QUEUED,
  clearQueue,
  looksOffline,
  queueScan,
  queuedScans,
  removeScans,
  waitingLabel,
} from "./offline-queue";

/** Stands in for the device's storage. */
function fakeStore() {
  let value: string | null = null;
  return {
    read: () => value,
    write: (v: string) => {
      value = v;
    },
    set raw(v: string | null) {
      value = v;
    },
  };
}

let store: ReturnType<typeof fakeStore>;
const now = Date.UTC(2026, 10, 12, 18, 0, 0);
const scan = (over = {}) => ({ barcode: "012345678905", type: "out" as const, qty: 1, staffName: "Beth", ...over });

beforeEach(() => {
  store = fakeStore();
});

describe("keeping a scan that had no signal", () => {
  it("starts with nothing waiting", () => {
    expect(queuedScans(now, store)).toEqual([]);
  });

  it("keeps what was scanned", () => {
    queueScan(scan(), now, store);
    const [row] = queuedScans(now, store);
    expect(row).toMatchObject({ barcode: "012345678905", type: "out", qty: 1, staffName: "Beth" });
    expect(row.id).toBeTruthy();
  });

  it("keeps them in the order they were scanned", () => {
    queueScan(scan({ barcode: "first" }), now, store);
    queueScan(scan({ barcode: "second" }), now + 1000, store);
    expect(queuedScans(now + 2000, store).map((r) => r.barcode)).toEqual(["first", "second"]);
  });

  it("gives every scan its own id, so the same one is never sent twice", () => {
    queueScan(scan(), now, store);
    queueScan(scan(), now + 1, store);
    const ids = queuedScans(now + 2, store).map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("tidies the quantity and the barcode", () => {
    queueScan(scan({ barcode: "  0123  ", qty: 2.7 }), now, store);
    expect(queuedScans(now, store)[0]).toMatchObject({ barcode: "0123", qty: 2 });
  });

  it("never loses the newest scan when the queue is full", () => {
    for (let i = 0; i < MAX_QUEUED + 5; i++) queueScan(scan({ barcode: `code-${i}` }), now + i, store);
    const rows = queuedScans(now + 1000, store);
    expect(rows).toHaveLength(MAX_QUEUED);
    expect(rows.at(-1)?.barcode).toBe(`code-${MAX_QUEUED + 4}`);
  });
});

describe("sending them on", () => {
  it("takes out the ones that went through", () => {
    queueScan(scan({ barcode: "a" }), now, store);
    queueScan(scan({ barcode: "b" }), now + 1, store);
    const [first] = queuedScans(now + 2, store);
    removeScans([first.id], now + 2, store);
    expect(queuedScans(now + 2, store).map((r) => r.barcode)).toEqual(["b"]);
  });

  it("ignores an id that is not in the queue", () => {
    queueScan(scan(), now, store);
    removeScans(["nope"], now, store);
    expect(queuedScans(now, store)).toHaveLength(1);
  });

  it("can be emptied", () => {
    queueScan(scan(), now, store);
    clearQueue(store);
    expect(queuedScans(now, store)).toEqual([]);
  });
});

describe("not sending something stale or broken", () => {
  it("drops a scan older than the keep window, rather than wrecking a count", () => {
    queueScan(scan({ barcode: "old" }), now - (KEEP_HOURS + 1) * 3_600_000, store);
    queueScan(scan({ barcode: "fresh" }), now - 3_600_000, store);
    expect(queuedScans(now, store).map((r) => r.barcode)).toEqual(["fresh"]);
  });

  it("survives storage that holds nonsense", () => {
    store.raw = "not json at all";
    expect(queuedScans(now, store)).toEqual([]);
    store.raw = '{"not":"an array"}';
    expect(queuedScans(now, store)).toEqual([]);
    store.raw = '[{"barcode":""},null,{"barcode":"ok","type":"out","qty":1,"at":' + now + ',"id":"x"}]';
    expect(queuedScans(now, store).map((r) => r.barcode)).toEqual(["ok"]);
  });
});

describe("telling a dropped signal from a real refusal", () => {
  it("treats network trouble as something to retry", () => {
    expect(looksOffline(new Error("Failed to fetch"))).toBe(true);
    expect(looksOffline(new Error("NetworkError when attempting to fetch"))).toBe(true);
    expect(looksOffline(new Error("The connection timed out"))).toBe(true);
  });

  it("never retries something the business was refused", () => {
    expect(looksOffline(new Error("SIGNED_OUT: Your session ended."))).toBe(false);
    expect(looksOffline(new Error("Only an owner can do that."))).toBe(false);
    expect(looksOffline(new Error("The Free plan includes up to 150 products."))).toBe(false);
  });

  it("does not retry something it cannot recognise", () => {
    expect(looksOffline(new Error("That product no longer exists."))).toBe(false);
  });
});

describe("what the business is told", () => {
  it("counts in plain words", () => {
    expect(waitingLabel(1)).toBe("1 scan waiting");
    expect(waitingLabel(4)).toBe("4 scans waiting");
  });
});
