import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES } from "./business-types";
import {
  INDUSTRIES,
  industrySetup,
  providerNounFor,
  recordSpecFor,
  showsColorTheoryTab,
} from "./industry";

const live = BUSINESS_TYPES.filter((t) => !t.legacy);

describe("every industry is set up", () => {
  it("covers each business type a new site can pick", () => {
    for (const type of live) {
      expect(INDUSTRIES.find((i) => i.id === type.id), type.id).toBeTruthy();
    }
  });

  it("gives each client-facing trade a word for its people", () => {
    for (const type of live) {
      if (!recordSpecFor(type.id)) continue;
      expect(providerNounFor(type.id).length, type.id).toBeGreaterThan(2);
    }
  });

  it("offers practices to tap on every trade that keeps client records", () => {
    for (const type of live) {
      const spec = recordSpecFor(type.id);
      if (!spec) continue;
      expect(spec.tagGroups.length, type.id).toBeGreaterThan(0);
      for (const group of spec.tagGroups) {
        expect(group.options.length, `${type.id} · ${group.label}`).toBeGreaterThan(2);
      }
    }
  });

  it("never lists the same practice twice in one group", () => {
    for (const type of live) {
      for (const group of recordSpecFor(type.id)?.tagGroups ?? []) {
        const seen = new Set(group.options);
        expect(seen.size, `${type.id} · ${group.label}`).toBe(group.options.length);
      }
    }
  });
});

describe("what each trade gets", () => {
  it("offers the practices the trades actually asked for", () => {
    const spa = recordSpecFor("spa")!.tagGroups.flatMap((g) => g.options);
    expect(spa).toEqual(expect.arrayContaining(["Extractions", "Deep tissue", "Swedish", "Acne-prone"]));

    const tattoo = recordSpecFor("tattoo")!.tagGroups.flatMap((g) => g.options);
    expect(tattoo).toEqual(
      expect.arrayContaining(["Traditional", "Freehand", "Black and grey", "Keloid-prone skin"]),
    );
  });

  it("names the client-records tab for the trade", () => {
    expect(recordSpecFor("tattoo")?.tabLabel).toBe("Ink log");
    expect(recordSpecFor("salon")?.tabLabel).toBe("Formulas");
  });

  it("keeps the color wheel in the tab only for salons and tattoo shops", () => {
    expect(showsColorTheoryTab("salon")).toBe(true);
    expect(showsColorTheoryTab("tattoo")).toBe(true);
    expect(showsColorTheoryTab("spa")).toBe(false);
    expect(showsColorTheoryTab("nails")).toBe(false);
  });

  it("gives bars and other legacy types no client records at all", () => {
    expect(recordSpecFor("bar")).toBeNull();
    expect(recordSpecFor("retail")).toBeNull();
  });

  it("falls back rather than crashing on a type it has never seen", () => {
    expect(recordSpecFor("spaceship")).toBeNull();
    expect(providerNounFor("spaceship")).toBe("Service provider");
  });
});

describe("the setup preview", () => {
  it("promises something for every live type", () => {
    for (const type of live) {
      expect(industrySetup(type.id).length, type.id).toBeGreaterThan(2);
    }
  });

  it("writes a title and a detail on every line", () => {
    for (const type of live) {
      for (const line of industrySetup(type.id)) {
        expect(line.title.trim(), type.id).not.toBe("");
        expect(line.detail.trim(), type.id).not.toBe("");
      }
    }
  });

  it("only promises client records where the trade has them", () => {
    const promises = (id: string) =>
      industrySetup(id).some((l) => /practice/i.test(l.title));
    expect(promises("spa")).toBe(true);
    expect(promises("bar")).toBe(false);
  });
});
