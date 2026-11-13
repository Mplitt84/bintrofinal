import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { crc32, zipFiles } from "./zip";

/** True when the machine has a real unzip to check our archive against. */
function hasUnzip() {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("the checksum every zip entry carries", () => {
  it("matches the known values for CRC-32", () => {
    expect(crc32(new TextEncoder().encode("")).toString(16)).toBe("0");
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
    expect(crc32(new TextEncoder().encode("The quick brown fox jumps over the lazy dog")).toString(16)).toBe("414fa339");
  });
});

describe("building the archive", () => {
  it("starts with the zip signature, so the operating system knows what it is", () => {
    const bytes = zipFiles([{ name: "a.csv", text: "hello" }]);
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("ends with the central directory record", () => {
    const bytes = zipFiles([{ name: "a.csv", text: "hello" }]);
    const tail = [...bytes.slice(-22, -18)];
    expect(tail).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it("writes an empty archive without falling over", () => {
    expect(zipFiles([]).length).toBe(22);
  });
});

describe("a real unzip can open it", () => {
  const maybe = hasUnzip() ? it : it.skip;

  const files = [
    { name: "products.csv", text: '"Product","On hand"\r\n"Curl Cream","4"' },
    { name: "notes.csv", text: '"Note"\r\n"A comma, a ""quote"" and a\nnewline"' },
    { name: "client-records.csv", text: '"Client"\r\n"Dana"' },
  ];

  maybe("passes the archive integrity check", () => {
    const dir = mkdtempSync(join(tmpdir(), "bintro-zip-"));
    const path = join(dir, "export.zip");
    writeFileSync(path, zipFiles(files));
    const out = execFileSync("unzip", ["-t", path], { encoding: "utf8" });
    expect(out).toContain("No errors detected");
  });

  maybe("gives back exactly what went in, commas and quotes included", () => {
    const dir = mkdtempSync(join(tmpdir(), "bintro-zip-"));
    const path = join(dir, "export.zip");
    writeFileSync(path, zipFiles(files));
    execFileSync("unzip", ["-o", "-q", path, "-d", dir]);
    for (const f of files) {
      expect(readFileSync(join(dir, f.name), "utf8"), f.name).toBe(f.text);
    }
  });

  maybe("lists every file it was given", () => {
    const dir = mkdtempSync(join(tmpdir(), "bintro-zip-"));
    const path = join(dir, "export.zip");
    writeFileSync(path, zipFiles(files));
    const out = execFileSync("unzip", ["-l", path], { encoding: "utf8" });
    for (const f of files) expect(out).toContain(f.name);
  });

  maybe("handles a sheet with accented and non-Latin text", () => {
    const dir = mkdtempSync(join(tmpdir(), "bintro-zip-"));
    const path = join(dir, "export.zip");
    const entry = { name: "clients.csv", text: '"Client"\r\n"Renée Ngô 髪"' };
    writeFileSync(path, zipFiles([entry]));
    execFileSync("unzip", ["-o", "-q", path, "-d", dir]);
    expect(readFileSync(join(dir, "clients.csv"), "utf8")).toBe(entry.text);
  });
});
