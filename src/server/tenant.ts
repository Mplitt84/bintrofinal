/**
 * Which business this request belongs to (server-only).
 *
 * Bintro holds many businesses in one database. Every tenant table carries a
 * `business_id`, and every query must filter on it — a missed filter is one salon
 * seeing another's products, clients and money, so this is the most important rule
 * in the codebase.
 *
 * Rather than thread the id through two hundred function signatures, the sign-in
 * middleware opens a scope for the request and everything inside it can ask for
 * `businessId()`. Scheduled jobs, which have no request, open the scope themselves
 * once per business.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/** The business that was already here before Bintro held more than one. */
export const DEFAULT_BUSINESS_ID = 1;

type Scope = { businessId: number };

const store = new AsyncLocalStorage<Scope>();

/**
 * Runs `fn` with every query inside it belonging to one business. Nested calls
 * replace the id, so a job looping over businesses stays honest.
 */
export function runForBusiness<T>(businessId: number, fn: () => T): T {
  if (!Number.isInteger(businessId) || businessId < 1) {
    throw new Error(`Bad business id: ${businessId}`);
  }
  return store.run({ businessId }, fn);
}

/**
 * The business this code is running for.
 *
 * Outside any scope it falls back to business 1. That keeps the original
 * deployment, local development and sites with sign-in switched off working exactly
 * as before — on those there is only ever one business. Once a request carries a
 * signed-in user, the scope is always open and the fallback is never reached.
 */
export function businessId(): number {
  return store.getStore()?.businessId ?? DEFAULT_BUSINESS_ID;
}

/** True while a request or job has opened a scope. */
export function hasBusinessScope() {
  return store.getStore() !== undefined;
}

/**
 * The filter every tenant query needs: "belongs to the business this request is for".
 * Use it in each where clause — `where(and(mine(products), eq(products.id, id)))` —
 * so a product id from one business can never reach another's row.
 */
export function mine<T extends { businessId: PgColumn }>(table: T) {
  return eq(table.businessId, businessId());
}

/** The column value for an insert: `db.insert(products).values({ ...v, ...owned() })`. */
export function owned() {
  return { businessId: businessId() };
}

/**
 * Every business on this deployment, for scheduled work that has no request behind
 * it. Pass each id to `runForBusiness` so a job does its rounds one business at a
 * time rather than mixing their data together.
 */
export async function allBusinessIds(): Promise<number[]> {
  const { db } = await import("../../db/index.js");
  const { businesses } = await import("../../db/schema.js");
  const rows = await db.select({ id: businesses.id }).from(businesses);
  return rows.map((r) => r.id).sort((a, b) => a - b);
}

/**
 * Runs `job` once for each business, in turn. One business failing never stops the
 * rest; the error is returned with its id so the job can log it.
 */
export async function forEachBusiness(job: (businessId: number) => Promise<void>) {
  const failures: { businessId: number; error: unknown }[] = [];
  for (const id of await allBusinessIds()) {
    try {
      await runForBusiness(id, () => job(id));
    } catch (error) {
      failures.push({ businessId: id, error });
    }
  }
  return failures;
}
