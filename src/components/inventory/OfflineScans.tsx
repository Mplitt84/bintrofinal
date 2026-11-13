import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import {
  looksOffline,
  queuedScans,
  removeScans,
  waitingLabel,
  type QueuedScan,
} from "@/lib/offline-queue";
import { scanMovement } from "@/server/inventory.functions";

/** Try again this often while scans are waiting. */
const RETRY_MS = 30_000;

/**
 * Scans made with no signal, and the band that says so.
 *
 * Staff should never have to remember what they scanned in a dead spot, so the
 * scans sit on the device and this sends them the moment the phone is back —
 * on reconnect, when the app is opened again, and every half minute meanwhile.
 */
export function OfflineScans({
  /** Bumped by the Scan tab each time it queues one, so the band appears at once. */
  signal,
  onSent,
}: {
  signal: number;
  onSent: () => void | Promise<void>;
}) {
  const [waiting, setWaiting] = useState<QueuedScan[]>([]);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState("");

  const refresh = useCallback(() => setWaiting(queuedScans()), []);

  const send = useCallback(async () => {
    const rows = queuedScans();
    if (rows.length === 0 || sending) return;
    setSending(true);
    setFailed("");
    const done: string[] = [];
    try {
      for (const row of rows) {
        try {
          await scanMovement({
            data: {
              barcode: row.barcode,
              type: row.type,
              qty: row.qty,
              staffName: row.staffName,
            },
          });
          // An unknown barcode comes back as a result, not an error: it was
          // scanned, Bintro just has no product for it. Keeping it queued would
          // retry for ever, so it leaves the queue either way.
          done.push(row.id);
        } catch (error) {
          if (looksOffline(error)) break; // still no signal: keep the rest for later
          // Anything else (a deleted product, a refused request) would never
          // succeed on a retry, so it is dropped rather than looping.
          done.push(row.id);
          setFailed("Some scans couldn’t be saved. Check Recent on the Scan tab.");
        }
      }
    } finally {
      if (done.length) {
        setWaiting(removeScans(done));
        await onSent();
      } else {
        refresh();
      }
      setSending(false);
    }
  }, [onSent, refresh, sending]);

  useEffect(() => {
    refresh();
  }, [refresh, signal]);

  useEffect(() => {
    // Send as soon as the signal is back, when the app is opened again, and
    // every half minute in case neither event fires.
    const tryNow = () => void send();
    window.addEventListener("online", tryNow);
    window.addEventListener("focus", tryNow);
    const timer = window.setInterval(() => {
      if (queuedScans().length) tryNow();
    }, RETRY_MS);
    if (queuedScans().length && navigator.onLine !== false) tryNow();
    return () => {
      window.removeEventListener("online", tryNow);
      window.removeEventListener("focus", tryNow);
      window.clearInterval(timer);
    };
    // Set up once; `send` reads the queue fresh each time it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (waiting.length === 0) return null;

  return (
    <div
      className="flex items-center gap-3 bg-warn-tint text-warn rounded-2xl px-4 py-3 mb-4"
      data-offline-band
      role="status"
    >
      <CloudOff size={20} className="shrink-0" />
      <span className="flex-1 min-w-0 text-sm text-ink">
        <b>{waitingLabel(waiting.length)}.</b>{" "}
        {sending
          ? "Sending now…"
          : failed || "Saved on this device. They send themselves when you’re back online."}
      </span>
      <button
        type="button"
        className="btn btn-tonal btn-sm shrink-0"
        onClick={() => void send()}
        disabled={sending}
      >
        <RefreshCw size={15} className={sending ? "animate-spin" : undefined} />
        {sending ? "Sending" : "Send now"}
      </button>
    </div>
  );
}
