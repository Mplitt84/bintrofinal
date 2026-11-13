import { describe, expect, it } from "vitest";
import {
  formulaKindFor,
  formulaTabLabel,
  formulasCsv,
  groupByClient,
  linesText,
  type ClientFormula,
} from "./formulas";

const visit = (over: Partial<ClientFormula> = {}): ClientFormula => ({
  id: 1,
  kind: "hair",
  clientName: "Dana",
  serviceDate: "2026-11-01",
  service: "Root touch-up",
  lines: [{ item: "7N", amount: "30 g" }],
  tags: [],
  retail: [],
  developer: "20 vol",
  ratio: "1:1",
  processingMinutes: 35,
  leftover: "",
  aftercare: "",
  followUpOn: "",
  notes: "",
  staffName: "Beth",
  createdAt: "2026-11-01",
  updatedAt: "2026-11-01",
  photoCount: 0,
  ...over,
});

describe("grouping visits by client", () => {
  it("treats spacing and capitals as the same person", () => {
    const groups = groupByClient([
      visit({ id: 1, clientName: "Dana  Smith" }),
      visit({ id: 2, clientName: "dana smith" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].visits).toHaveLength(2);
  });

  it("keeps different clients apart", () => {
    expect(
      groupByClient([
        visit({ id: 1, clientName: "Dana" }),
        visit({ id: 2, clientName: "Danielle" }),
      ]),
    ).toHaveLength(2);
  });

  it("puts the most recently seen client first", () => {
    const groups = groupByClient([
      visit({ id: 1, clientName: "Older", serviceDate: "2026-01-05" }),
      visit({ id: 2, clientName: "Newer", serviceDate: "2026-11-01" }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(["Newer", "Older"]);
  });

  it("dates a client by their latest visit, whatever order the rows arrive in", () => {
    const groups = groupByClient([
      visit({ id: 1, serviceDate: "2026-02-01" }),
      visit({ id: 2, serviceDate: "2026-11-01" }),
      visit({ id: 3, serviceDate: "2026-06-01" }),
    ]);
    expect(groups[0].lastVisit).toBe("2026-11-01");
  });
});

describe("formula line text", () => {
  it("joins shades and amounts the way the card reads", () => {
    expect(
      linesText([
        { item: "7N", amount: "30 g" },
        { item: "7.3", amount: "10 g" },
      ]),
    ).toBe("7N 30 g + 7.3 10 g");
  });

  it("drops blank rows left in the form", () => {
    expect(
      linesText([
        { item: "7N", amount: "30 g" },
        { item: "  ", amount: "" },
      ]),
    ).toBe("7N 30 g");
  });

  it("keeps a shade with no amount typed", () => {
    expect(linesText([{ item: "7N", amount: "" }])).toBe("7N");
  });
});

describe("backup CSV", () => {
  it("writes a header and one row per visit", () => {
    const csv = formulasCsv([visit({ id: 1 }), visit({ id: 2 })]);
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("keeps the practices and the team member", () => {
    const csv = formulasCsv([
      visit({ tags: ["Balayage", "Fine"], staffName: "KaNesha" }),
    ]);
    expect(csv).toContain("Balayage; Fine");
    expect(csv).toContain("KaNesha");
  });

  it("survives a comma and a quote in the notes", () => {
    const csv = formulasCsv([visit({ notes: 'Wants it "warm", not brassy' })]);
    expect(csv).toContain('""warm""');
    expect(csv.split("\n")).toHaveLength(2);
  });
});

describe("wording by trade", () => {
  it("logs ink for tattoo shops and color for everyone else", () => {
    expect(formulaKindFor("tattoo")).toBe("tattoo");
    expect(formulaKindFor("salon")).toBe("hair");
    expect(formulaKindFor("spa")).toBe("hair");
  });

  it("names the tab for the trade", () => {
    expect(formulaTabLabel("tattoo")).toBe("Ink log");
    expect(formulaTabLabel("salon")).toBe("Formulas");
  });
});
