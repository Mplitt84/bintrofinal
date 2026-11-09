import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial().primaryKey(),
  barcode: text().notNull().unique(),
  name: text().notNull(),
  category: text().notNull().default(""),
  brand: text().notNull().default(""),
  /** Supplier/distributor the product is ordered from. Groups purchase orders alongside brand. */
  vendor: text().notNull().default(""),
  size: text().notNull().default(""),
  qty: integer().notNull().default(0),
  reorderThreshold: integer("reorder_threshold").notNull().default(2),
  /** "Order up to": the most worth having on hand (shelf space and cash). 0 = order just back to par. Set by Smart par or by hand. */
  maxQty: integer("max_qty").notNull().default(0),
  /** Units per case the vendor sells (wine 12, sparkling water 24). Orders round up to whole cases. 1 = single units. */
  packSize: integer("pack_size").notNull().default(1),
  /** Expiry: "" = not set, "none" = doesn't expire, or a YYYY-MM-DD date. */
  expiresOn: text("expires_on").notNull().default(""),
  /** When the product was last counted in an approved Count & reconcile, and by whom. */
  lastCountedAt: timestamp("last_counted_at"),
  lastCountedBy: text("last_counted_by").notNull().default(""),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  /** What the business sells it for. 0 when it's backbar / not sold. */
  retailPriceCents: integer("retail_price_cents").notNull().default(0),
  /** Square catalog item variation this product was imported from, used to map POS sales. */
  squareVariationId: text("square_variation_id").notNull().default(""),
  /** Product photo, usually filled in from the barcode database lookup. Empty when none. */
  imageUrl: text("image_url").notNull().default(""),
  /** Extra barcodes / SKUs that scan to this product (e.g. a new UPC from the supplier). */
  extraBarcodes: text("extra_barcodes").array().notNull().default(sql`'{}'::text[]`),
  /** When cost or retail price last changed or was confirmed. Null = never (falls back to createdAt for reminders). */
  priceUpdatedAt: timestamp("price_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const movements = pgTable("movements", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text().notNull(), // 'in' | 'out' | 'adjust' | 'receive'
  delta: integer().notNull(),
  staffInitials: text("staff_initials").notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  note: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Single-row table (id = 1) holding the business name and contact details shown across the app. */
export const businessProfile = pgTable("business_profile", {
  id: integer().primaryKey(),
  name: text().notNull().default(""),
  /** Salon, bar, nail studio, bookstore… Tunes AI prompts and category suggestions. */
  businessType: text("business_type").notNull().default("salon"),
  email: text().notNull().default(""),
  phone: text().notNull().default(""),
  address: text().notNull().default(""),
  website: text().notNull().default(""),
  /** Where restock lists and purchase orders go. Falls back to `email`. */
  orderEmail: text("order_email").notNull().default(""),
  monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(0),
  /** Secret part of the calendar subscription URL. Empty until the feed is first shared. */
  calendarToken: text("calendar_token").notNull().default(""),
  /** Email the weekly best-sellers report (Mondays). */
  weeklyReportEmail: boolean("weekly_report_email").notNull().default(true),
  /** Email the monthly slow-movers + price-check report (1st of the month). */
  monthlyReportEmail: boolean("monthly_report_email").notNull().default(true),
  /** Email as soon as items start selling out faster than expected. */
  fastMoverAlertEmail: boolean("fast_mover_alert_email").notNull().default(true),
  /** Display color palette id from PALETTES (src/lib/palettes.ts), shared by every device. */
  palette: text().notNull().default("burgundy-olive"),
  /** How often the business places orders, in days. Smart par keeps about this much stock above the reorder point. */
  orderEveryDays: integer("order_every_days").notNull().default(7),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Money spent outside of scanned-in stock: supplies, rent, utilities, or stock bought off-app. */
export const expenses = pgTable("expenses", {
  id: serial().primaryKey(),
  /** Local calendar date the money was spent, YYYY-MM-DD. */
  spentOn: text("spent_on").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: text().notNull().default(""),
  vendor: text().notNull().default(""),
  note: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  /** QuickBooks Purchase id once pushed, so it's never sent twice. */
  quickbooksId: text("quickbooks_id").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Per-month budget overrides; months without a row use businessProfile.monthlyBudgetCents. */
export const budgets = pgTable("budgets", {
  month: text().primaryKey(), // YYYY-MM
  amountCents: integer("amount_cents").notNull(),
});

/** OAuth connections to outside systems (Square, QuickBooks). Tokens never leave the server. */
export const integrations = pgTable("integrations", {
  provider: text().primaryKey(), // 'square' | 'quickbooks'
  accessToken: text("access_token").notNull().default(""),
  refreshToken: text("refresh_token").notNull().default(""),
  expiresAt: timestamp("expires_at"),
  /** Square merchant id or QuickBooks realm (company) id. */
  accountId: text("account_id").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  /** CSRF state for an in-flight OAuth handshake. */
  pendingState: text("pending_state").notNull().default(""),
  lastSyncAt: timestamp("last_sync_at"),
  meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  connectedAt: timestamp("connected_at"),
});

/**
 * Stock changes waiting to be sent to Square so Square's inventory follows Bintro.
 * `kind` 'delta' adds/removes `quantity` units; 'count' sets the on-hand count to
 * `quantity`. Rows are written next to the movement and sent right away; anything
 * that fails stays 'pending' and the scheduled sync retries it. 'error' rows were
 * rejected by Square and are not retried.
 */
export const squareOutbox = pgTable("square_outbox", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull(),
  variationId: text("variation_id").notNull(),
  kind: text().notNull(), // 'delta' | 'count'
  quantity: integer().notNull(),
  /** Movement that caused this change, so undo can cancel or reverse it. Null for bulk count pushes. */
  movementId: integer("movement_id"),
  status: text().notNull().default("pending"), // 'pending' | 'sent' | 'error'
  error: text().notNull().default(""),
  attempts: integer().notNull().default(0),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

/**
 * Product categories the business has chosen to use. Each maps to a tax group
 * (see src/lib/tax-categories.ts) so spend rolls up the way an accountant books it.
 */
export const productCategories = pgTable("product_categories", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  taxGroup: text("tax_group").notNull().default("service"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Business calendar: reorders, deliveries, bills, tax dates and tasks. Shared as an iCal feed. */
export const calendarEvents = pgTable("calendar_events", {
  id: serial().primaryKey(),
  title: text().notNull(),
  kind: text().notNull().default("task"), // 'reorder' | 'delivery' | 'bill' | 'tax' | 'count' | 'task'
  /** Local calendar date, YYYY-MM-DD. */
  date: text().notNull(),
  /** Local start time HH:MM, or empty for an all-day event. */
  startTime: text("start_time").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  repeat: text().notNull().default("none"), // 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  notes: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Saved insight reports: weekly best sellers, monthly slow movers and fast-mover
 * alerts, with the AI-written summary. One row per kind and period so a report
 * is only emailed once.
 */
export const insightReports = pgTable(
  "insight_reports",
  {
    id: serial().primaryKey(),
    kind: text().notNull(), // 'weekly' | 'monthly' | 'fast'
    /** 2026-W40, 2026-09 or 2026-09-29 depending on the kind. */
    periodKey: text("period_key").notNull(),
    summary: text().notNull().default(""),
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    emailedTo: text("emailed_to").notNull().default(""),
    emailedAt: timestamp("emailed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("insight_reports_kind_period").on(t.kind, t.periodKey)],
);

/** AI web price lookups (manufacturer, authorised distributor or Amazon listings) for each product. */
export const priceChecks = pgTable("price_checks", {
  id: serial().primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  retailPriceCents: integer("retail_price_cents").notNull().default(0),
  sourceName: text("source_name").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  /** 'manufacturer' | 'distributor' | 'amazon' | 'estimate' */
  sourceType: text("source_type").notNull().default("estimate"),
  note: text().notNull().default(""),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

/**
 * Single-row table (id = 1): the Bintro plan this business is on and its billing
 * state. Payment details stay with Stripe; only the card brand / last 4 are cached for display.
 */
export const account = pgTable("account", {
  id: integer().primaryKey(),
  plan: text().notNull().default("free"), // 'free' | 'plus' | 'premium'
  interval: text().notNull().default("month"), // 'month' | 'year'
  status: text().notNull().default("active"), // 'active' | 'trialing' | 'paused' | 'canceled'
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  /** Cancellation is scheduled; drops to Free at currentPeriodEnd. */
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelReason: text("cancel_reason").notNull().default(""),
  /** Billing paused until this date; Free features only in the meantime. */
  pausedUntil: timestamp("paused_until"),
  ownerName: text("owner_name").notNull().default(""),
  billingEmail: text("billing_email").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id").notNull().default(""),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().default(""),
  cardBrand: text("card_brand").notNull().default(""),
  cardLast4: text("card_last4").notNull().default(""),
  cardExpMonth: integer("card_exp_month").notNull().default(0),
  cardExpYear: integer("card_exp_year").notNull().default(0),
  /** Pilot sites: when the business first scanned stock in, which starts the free Premium pilot clock. */
  pilotStartedAt: timestamp("pilot_started_at"),
  /** Pilot sites: set once the free pilot has run out and the account moved to Free. */
  pilotEndedAt: timestamp("pilot_ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Plan changes, pauses, cancellations and charges, shown as the account's billing history. */
export const billingEvents = pgTable("billing_events", {
  id: serial().primaryKey(),
  kind: text().notNull(), // 'trial' | 'upgrade' | 'downgrade' | 'pause' | 'resume' | 'cancel' | 'reactivate' | 'charge'
  detail: text().notNull().default(""),
  amountCents: integer("amount_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Purchase orders saved when staff email, print or download an order, so
 * deliveries can be checked in against them and vendors scored on accuracy.
 */
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial().primaryKey(),
  vendor: text().notNull().default(""),
  status: text().notNull().default("open"), // 'open' | 'partial' | 'received' | 'canceled'
  note: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  /** How it left Bintro: 'email' | 'print' | 'csv'. */
  sentVia: text("sent_via").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Last delivery checked in against this order. */
  receivedAt: timestamp("received_at"),
});

/** One product on a purchase order, with what actually arrived and at what cost. */
export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: serial().primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  name: text().notNull().default(""),
  brand: text().notNull().default(""),
  size: text().notNull().default(""),
  barcode: text().notNull().default(""),
  qtyOrdered: integer("qty_ordered").notNull().default(0),
  qtyReceived: integer("qty_received").notNull().default(0),
  /** Cost per unit when ordered. */
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  /** Cost per unit on the delivery's invoice (0 until received or if the invoice had none). */
  receivedCostCents: integer("received_cost_cents").notNull().default(0),
});

/**
 * Every Smart par apply, product by product, with the levels before and after,
 * so one apply can be undone. Rows of one apply share a batchId.
 */
export const parChanges = pgTable("par_changes", {
  id: serial().primaryKey(),
  batchId: text("batch_id").notNull(),
  productId: integer("product_id").notNull(),
  oldPar: integer("old_par").notNull(),
  oldMax: integer("old_max").notNull(),
  newPar: integer("new_par").notNull(),
  newMax: integer("new_max").notNull(),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Set when this apply was undone. */
  undoneAt: timestamp("undone_at"),
});

/** A stock count that was reviewed and approved: what was counted, by whom, and the totals over/short. */
export const stockCounts = pgTable("stock_counts", {
  id: serial().primaryKey(),
  /** What was counted, e.g. "Everything", "Category: Color", "Vendor: SalonCentric". */
  scope: text().notNull().default(""),
  /** Counted without seeing the system numbers. */
  blind: boolean().notNull().default(false),
  staffName: text("staff_name").notNull().default(""),
  itemsCounted: integer("items_counted").notNull().default(0),
  itemsChanged: integer("items_changed").notNull().default(0),
  unitsOver: integer("units_over").notNull().default(0),
  unitsShort: integer("units_short").notNull().default(0),
  /** Cost value of the net difference (positive = more on the shelf than recorded). */
  valueDiffCents: integer("value_diff_cents").notNull().default(0),
  note: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Set when the whole count was reversed with "Undo this count". */
  undoneAt: timestamp("undone_at"),
  undoneBy: text("undone_by").notNull().default(""),
});

/** One product in an approved count: expected vs counted, the reason for any difference. */
export const stockCountLines = pgTable("stock_count_lines", {
  id: serial().primaryKey(),
  countId: integer("count_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text().notNull().default(""),
  expected: integer().notNull(),
  counted: integer().notNull(),
  diff: integer().notNull(),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  reason: text().notNull().default(""),
});

/** Connections a business asked Bintro to build (demand for partnership talks). */
export const connectionRequests = pgTable("connection_requests", {
  id: serial().primaryKey(),
  /** Directory id (e.g. "vagaro") or "other". */
  platform: text().notNull(),
  /** The app's name as typed, for "other". */
  name: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Every failed Square / QuickBooks call, kept a year so it can be shared with the provider's support. */
export const integrationLogs = pgTable("integration_logs", {
  id: serial().primaryKey(),
  provider: text().notNull(),
  /** What Bintro was doing, e.g. "POST /purchase", "token refresh", "connect". */
  action: text().notNull().default(""),
  status: integer().notNull().default(0),
  /** Provider error code (QuickBooks Fault code, OAuth error). */
  code: text().notNull().default(""),
  /** QuickBooks intuit_tid response header. */
  intuitTid: text("intuit_tid").notNull().default(""),
  message: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** People allowed to sign in (with Google). The first sign-in by BINTRO_OWNER_EMAIL creates the owner. */
export const appUsers = pgTable("app_users", {
  id: serial().primaryKey(),
  /** Lower-cased Google account email. */
  email: text().notNull().unique(),
  name: text().notNull().default(""),
  /** owner = manages who can sign in, connections and billing; staff = everything else. */
  role: text().notNull().default("staff"),
  /** Google's stable account id, set on first sign-in. */
  googleSub: text("google_sub").notNull().default(""),
  addedBy: text("added_by").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSignInAt: timestamp("last_sign_in_at"),
});

/** Signed-in browsers. Only a SHA-256 of the cookie token is stored. */
export const appSessions = pgTable("app_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull(),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
