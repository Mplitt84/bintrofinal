import { describe, expect, it, vi } from "vitest";
import {
  describeDevice,
  errorDetail,
  errorMessage,
  isIgnorableError,
  reportError,
} from "./report-error";

describe("reading an error", () => {
  it("takes the message off a thrown Error", () => {
    expect(errorMessage(new Error("Could not save the count"))).toBe(
      "Could not save the count",
    );
  });

  it("copes with a thrown string or object", () => {
    expect(errorMessage("boom")).toBe("boom");
    expect(errorMessage({ message: "bad json" })).toBe("bad json");
    expect(errorMessage(null)).toBe("Unknown error");
    expect(errorMessage(undefined)).toBe("Unknown error");
  });

  it("trims a runaway message so the list stays readable", () => {
    expect(errorMessage(new Error("x".repeat(900))).length).toBe(300);
  });

  it("keeps the top of the stack and no more", () => {
    const e = new Error("nope");
    e.stack = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n");
    expect(errorDetail(e).split("\n")).toHaveLength(8);
  });

  it("has no detail to show when a bare string was thrown", () => {
    expect(errorDetail("boom")).toBe("");
  });
});

describe("noise that is not worth reporting", () => {
  it("ignores browser quirks and dropped connections", () => {
    expect(isIgnorableError("ResizeObserver loop limit exceeded")).toBe(true);
    expect(isIgnorableError("Failed to fetch")).toBe(true);
    expect(isIgnorableError("Script error.")).toBe(true);
  });

  it("ignores being signed out, which the app already handles", () => {
    expect(isIgnorableError("SIGNED_OUT")).toBe(true);
  });

  it("reports a real problem", () => {
    expect(isIgnorableError("Cannot read properties of undefined")).toBe(false);
  });
});

describe("sending a report", () => {
  it("sends a real error once", async () => {
    const send = vi.fn().mockResolvedValue({});
    const sent = await reportError(new Error("Count failed"), "products", send, new Set());
    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      message: "Count failed",
      where: "products",
    });
  });

  it("does not send the same error twice in one session", async () => {
    const send = vi.fn().mockResolvedValue({});
    const seen = new Set<string>();
    await reportError(new Error("Same"), "scan", send, seen);
    await reportError(new Error("Same"), "scan", send, seen);
    expect(send).toHaveBeenCalledOnce();
  });

  it("still sends the same message from a different screen", async () => {
    const send = vi.fn().mockResolvedValue({});
    const seen = new Set<string>();
    await reportError(new Error("Same"), "scan", send, seen);
    await reportError(new Error("Same"), "budget", send, seen);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("stays quiet about noise", async () => {
    const send = vi.fn();
    expect(await reportError(new Error("Failed to fetch"), "app", send, new Set())).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("never throws when reporting itself fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      reportError(new Error("Real problem"), "app", send, new Set()),
    ).resolves.toBe(false);
  });
});

describe("describing the device", () => {
  it("names the browser and the system, and nothing else", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome 141 · Android");
  });

  it("recognises an iPhone", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari 18 · iOS");
  });

  it("says nothing rather than guessing", () => {
    expect(describeDevice("")).toBe("");
  });
});
