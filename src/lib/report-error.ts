/**
 * Client-side error catching (client-safe).
 *
 * Nobody tells a salon owner that the app broke on a stylist's phone mid-shift, so
 * Bintro writes it down itself: anything thrown that the app didn't handle is sent to
 * the business's own database and listed in Settings. No third-party service, no key.
 */

/** One problem as Settings lists it. */
export type ErrorReport = {
  id: number
  message: string
  where: string
  detail: string
  device: string
  staffName: string
  /** How many times this same error has happened. */
  hits: number
  firstSeen: string
  lastSeen: string
}

/** Keep messages short: a stack trace in a list is unreadable, and the detail field carries it. */
const MAX_MESSAGE = 300;
const MAX_DETAIL = 1200;

/** Errors that say nothing useful and would only crowd out real ones. */
const IGNORED = [
  "ResizeObserver loop", // a browser quirk, harmless
  "Script error.", // cross-origin script with no detail
  "Load failed", // the network dropped mid-request
  "NetworkError",
  "Failed to fetch",
  "AbortError",
  "SIGNED_OUT", // the app already sends the person to sign in
];

export function isIgnorableError(message: string) {
  return IGNORED.some((m) => message.includes(m));
}

/** "Chrome 141 · Android" — enough to recognise one bad device, not enough to track anyone. */
export function describeDevice(ua: string) {
  const browser =
    /Edg\/(\d+)/.exec(ua)?.[0] ??
    /OPR\/(\d+)/.exec(ua)?.[0] ??
    /Chrome\/(\d+)/.exec(ua)?.[0] ??
    /Firefox\/(\d+)/.exec(ua)?.[0] ??
    (/Safari/.test(ua) ? `Safari ${/Version\/(\d+)/.exec(ua)?.[1] ?? ""}`.trim() : "");
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "";
  return [browser.replace("/", " "), os].filter(Boolean).join(" · ").slice(0, 80);
}

/** Pulls a readable message out of whatever was thrown. */
export function errorMessage(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as { message?: string })?.message || "Unknown error";
  return raw.trim().slice(0, MAX_MESSAGE) || "Unknown error";
}

export function errorDetail(error: unknown) {
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  return stack.split("\n").slice(0, 8).join("\n").slice(0, MAX_DETAIL);
}

type Send = (report: {
  message: string;
  where: string;
  detail: string;
  device: string;
}) => Promise<unknown>;

/**
 * Hands one error to `send`, unless it is noise or a repeat. Returns true when it was
 * sent. Never throws: a failure to report an error must not become another error.
 */
export async function reportError(
  error: unknown,
  where: string,
  send: Send,
  seen: Set<string> = sentThisSession,
) {
  try {
    const message = errorMessage(error);
    if (isIgnorableError(message)) return false;
    const key = `${message}@${where}`;
    // One report per message per session: a broken render can fire hundreds of times.
    if (seen.has(key)) return false;
    seen.add(key);
    await send({
      message,
      where: where.slice(0, 60),
      detail: errorDetail(error),
      device: typeof navigator === "undefined" ? "" : describeDevice(navigator.userAgent),
    });
    return true;
  } catch {
    return false;
  }
}

const sentThisSession = new Set<string>();

/**
 * Listens for anything the app didn't catch. Returns a function that stops listening.
 * Called once when the app loads.
 */
export function watchForErrors(send: Send) {
  if (typeof window === "undefined") return () => {};
  const onError = (e: ErrorEvent) => void reportError(e.error ?? e.message, "app", send);
  const onRejection = (e: PromiseRejectionEvent) =>
    void reportError(e.reason, "app", send);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
