/**
 * Refuses any query that touches a business's data without saying which business.
 *
 * Bintro keeps every business in one database, so a forgotten `business_id` filter
 * would show one salon another's products, clients and money. Remembering it 125
 * times is not a plan, so the database layer checks every statement: if it names a
 * tenant table and never mentions business_id, it throws instead of running.
 */

/** Tables that hold one business's data. Everything here must be filtered. */
export const TENANT_TABLES = [
  "products",
  "movements",
  "business_profile",
  "team_members",
  "expenses",
  "expense_receipts",
  "budgets",
  "integrations",
  "square_outbox",
  "product_categories",
  "calendar_events",
  "insight_reports",
  "price_checks",
  "account",
  "billing_events",
  "purchase_orders",
  "purchase_order_lines",
  "par_changes",
  "stock_counts",
  "stock_count_lines",
  "connection_requests",
  "integration_logs",
  "app_users",
  "inbound_emails",
  "client_formulas",
  "formula_photos",
  "profit_exclusions",
  "error_reports",
] as const;

/**
 * Tables that belong to everyone, or whose row is reached by a key that is already
 * unique across every business (a session token, a business row itself).
 */
export const SHARED_TABLES = ["businesses", "app_sessions"] as const;

const TENANT_SET: ReadonlySet<string> = new Set(TENANT_TABLES);

/** Table names a statement actually reads or writes. Quoted or bare. */
export function tablesIn(sql: string): string[] {
  const found = new Set<string>();
  const pattern =
    /\b(?:from|join|into|update|delete\s+from)\s+"?([a-z_][a-z0-9_]*)"?/gi;
  for (const m of sql.matchAll(pattern)) found.add(m[1].toLowerCase());
  return [...found];
}

/**
 * Sign-in is the one query that cannot name a business: it looks a person up by
 * email or session token in order to find out which business they belong to. Those
 * few queries carry this marker in a SQL comment so they are deliberate and easy to
 * find (`grep cross-business`), never an oversight.
 */
export const CROSS_BUSINESS_MARKER = "cross-business";

/** The reason a statement is refused, or null when it is fine. */
export function tenancyProblem(sql: string): string | null {
  const tenant = tablesIn(sql).filter((t) => TENANT_SET.has(t));
  if (tenant.length === 0) return null;
  if (/business_id/i.test(sql)) return null;
  if (sql.includes(CROSS_BUSINESS_MARKER)) return null;
  return `Query touches ${tenant.join(", ")} without a business_id filter`;
}

/** Throws when a statement would cross between businesses. */
export function assertTenantScoped(sql: string) {
  const problem = tenancyProblem(sql);
  if (problem) {
    throw new Error(
      `Tenancy guard: ${problem}. Every query on a business's data must filter on businessId() — see src/server/tenant.ts.`,
    );
  }
}
