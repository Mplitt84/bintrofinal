import { describe, expect, it } from "vitest";
import {
  SHARED_TABLES,
  TENANT_TABLES,
  tablesIn,
  tenancyProblem,
} from "./tenancy-guard";

describe("reading the tables out of a statement", () => {
  it("finds them whether or not they are quoted", () => {
    expect(tablesIn('select * from "products"')).toEqual(["products"]);
    expect(tablesIn("select * from products")).toEqual(["products"]);
  });

  it("finds both sides of a join", () => {
    expect(
      tablesIn('select * from "movements" inner join "products" on 1=1').sort(),
    ).toEqual(["movements", "products"]);
  });

  it("finds the table being written to", () => {
    expect(tablesIn('insert into "expenses" ("a") values (1)')).toEqual(["expenses"]);
    expect(tablesIn('update "products" set "qty" = 1')).toEqual(["products"]);
    expect(tablesIn('delete from "movements" where "id" = 1')).toEqual(["movements"]);
  });
});

describe("refusing a query that could cross between businesses", () => {
  it("refuses a read of a business's data with no business filter", () => {
    expect(tenancyProblem('select * from "products"')).toMatch(/products/);
  });

  it("allows the same read once it names the business", () => {
    expect(
      tenancyProblem('select * from "products" where "business_id" = $1'),
    ).toBeNull();
  });

  it("refuses a write with no business on it", () => {
    expect(tenancyProblem('insert into "expenses" ("amount_cents") values ($1)')).not.toBeNull();
    expect(tenancyProblem('update "products" set "qty" = $1 where "id" = $2')).not.toBeNull();
    expect(tenancyProblem('delete from "movements" where "id" = $1')).not.toBeNull();
  });

  it("refuses a join where only one side is filtered by accident", () => {
    // Both tables hold a business's data, so business_id must appear at all.
    expect(
      tenancyProblem('select * from "movements" join "products" on 1=1'),
    ).toMatch(/movements|products/);
  });

  it("leaves shared tables alone", () => {
    expect(tenancyProblem('select * from "businesses"')).toBeNull();
    expect(tenancyProblem('delete from "app_sessions" where "token_hash" = $1')).toBeNull();
  });

  it("allows the few sign-in lookups that are marked as deliberate", () => {
    expect(
      tenancyProblem('/* cross-business: sign-in */ select * from "app_users" where "email" = $1'),
    ).toBeNull();
  });

  it("says nothing about a statement that touches no business data", () => {
    expect(tenancyProblem("select 1")).toBeNull();
    expect(tenancyProblem("select now()")).toBeNull();
  });
});

describe("the table lists", () => {
  it("never calls the same table both shared and per-business", () => {
    for (const t of SHARED_TABLES) {
      expect(TENANT_TABLES as readonly string[]).not.toContain(t);
    }
  });

  it("covers every table in the schema", async () => {
    const schema = await import("./schema.js");
    const named = new Set<string>([...TENANT_TABLES, ...SHARED_TABLES]);
    const inSchema = Object.values(schema)
      .filter((v) => typeof v === "object" && v !== null && "_" in v)
      .map((t) => (t as unknown as { _: { name?: string } })._?.name)
      .filter((n): n is string => Boolean(n));
    for (const name of inSchema) {
      // A new table must be listed as one or the other, so the guard knows about it.
      expect(named, `${name} is missing from TENANT_TABLES / SHARED_TABLES`).toContain(name);
    }
  });
});
