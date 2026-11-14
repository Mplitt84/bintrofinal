import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, unique, index } from "drizzle-orm/pg-core";

/**
 * One business using Bintro. Every other table below carries a `businessId`, and every
 * query is filtered by it, so two businesses on the same database never see each other.
 * Business 1 is the original deployment; it keeps working exactly as before.
 */
export const businesses = pgTable("businesses", {
  id: serial().primaryKey(),
  /** Name at sign-up; the editable one lives in business_profile. */
  name: text().notNull().default(""),
  /** Email of whoever signed the business up. */
  createdByEmail: text("created_by_email").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  barcode: text().notNull(),
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
}, (t) => [
  unique("products_business_barcode").on(t.businessId, t.barcode),
  index("products_business").on(t.businessId),
]);

export const movements = pgTable("movements", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text().notNull(), // 'in' | 'out' | 'adjust' | 'receive'
  delta: integer().notNull(),
  staffInitials: text("staff_initials").notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  note: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("movements_business").on(t.businessId),
]);

/** Single-row table (id = 1) holding the business name and contact details shown across the app. */
export const businessProfile = pgTable("business_profile", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: integer().primaryKey(),
  name: text().notNull().default(""),
  /** Salon, barbershop, nail studio, tattoo shop… Tunes AI prompts and category suggestions. */
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
  /** Secret part of the "email orders to Bintro" address (orders-<token>@<inbound domain>). */
  inboundToken: text("inbound_token").notNull().default(""),
  /** Tattoo studios: the usual aftercare instructions, filled into each new ink log entry. */
  aftercareTemplate: text("aftercare_template").notNull().default(""),
  /** Email the weekly best-sellers report (Mondays). */
  weeklyReportEmail: boolean("weekly_report_email").notNull().default(true),
  /** Email the monthly slow-movers + price-check report (1st of the month). */
  monthlyReportEmail: boolean("monthly_report_email").notNull().default(true),
  /** Email as soon as items start selling out faster than expected. */
  fastMoverAlertEmail: boolean("fast_mover_alert_email").notNull().default(true),
  /** Display color palette id from PALETTES (src/lib/palettes.ts), shared by every device. */
  palette: text().notNull().default("bintro"),
  /** How often the business places orders, in days. Smart par keeps about this much stock above the reorder point. */
  orderEveryDays: integer("order_every_days").notNull().default(7),
  /** Two-letter US state the business files taxes in (Calendar → state tax dates); "" = not chosen. */
  taxState: text("tax_state").notNull().default(""),
  /**
   * What share of retail a team member earns, as a whole percent. 0 = not set, and
   * Showstopper then shows no earnings line rather than guessing at anybody's pay.
   */
  retailCommissionPct: integer("retail_commission_pct").notNull().default(0),
  /** ISO 4217 code the money on every screen is shown in (see src/lib/money.ts). */
  currency: text().notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("business_profile_business").on(t.businessId),
]);

export const teamMembers = pgTable("team_members", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  name: text().notNull(),
  /** Sees clients (stylist, barber, artist, provider…): listed where a client record names its team member. */
  isProvider: boolean("is_provider").notNull().default(true),
  /** Works the admin side (inventory, ordering, books). A label; sign-in access is still Settings → Access. */
  isAdmin: boolean("is_admin").notNull().default(false),
  /**
   * Sells retail at this location. Off for a contractor or back-of-house person who
   * never rings anything up: Showstopper leaves them off the board entirely rather
   * than showing them with nothing sold. The only one of these flags that changes
   * what a screen shows.
   */
  sellsRetail: boolean("sells_retail").notNull().default(true),
  /** Looks after stock, ordering and deliveries. A label, like isAdmin. */
  managesInventory: boolean("manages_inventory").notNull().default(false),
  /** Checks counts and deliveries for accuracy (QA). A label, like isAdmin. */
  doesQa: boolean("does_qa").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("team_members_business_name").on(t.businessId, t.name),
]);

/** Money spent outside of scanned-in stock: supplies, rent, utilities, or stock bought off-app. */
export const expenses = pgTable("expenses", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** QuickBooks Attachable id once the receipt photo is attached to that Purchase. */
  quickbooksReceiptId: text("quickbooks_receipt_id").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Receipt photo kept with an expense (shrunk JPEG, base64), sent to QuickBooks as an attachment. */
export const expenseReceipts = pgTable("expense_receipts", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  expenseId: integer("expense_id").notNull().unique(),
  mediaType: text("media_type").notNull().default("image/jpeg"),
  data: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Per-month budget overrides; months without a row use businessProfile.monthlyBudgetCents. */
export const budgets = pgTable("budgets", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  month: text().primaryKey(), // YYYY-MM
  amountCents: integer("amount_cents").notNull(),
});

/** OAuth connections to outside systems (Square, QuickBooks). Tokens never leave the server. */
export const integrations = pgTable("integrations", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  name: text().notNull(),
  taxGroup: text("tax_group").notNull().default("service"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("product_categories_business_name").on(t.businessId, t.name),
]);

/** Business calendar: reorders, deliveries, bills, tax dates and tasks. Shared as an iCal feed. */
export const calendarEvents = pgTable("calendar_events", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  (t) => [unique("insight_reports_kind_period").on(t.businessId, t.kind, t.periodKey)],
);

/** AI web price lookups (manufacturer, authorised distributor or Amazon listings) for each product. */
export const priceChecks = pgTable("price_checks", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
}, (t) => [
  unique("account_business").on(t.businessId),
]);

/** Plan changes, pauses, cancellations and charges, shown as the account's billing history. */
export const billingEvents = pgTable("billing_events", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
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

/**
 * Emails forwarded to the business's private Bintro address (vendor order confirmations).
 * One row per received email (Resend id unique), whether it became an order or not.
 */
export const inboundEmails = pgTable("inbound_emails", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  emailId: text("email_id").notNull().unique(),
  fromAddress: text("from_address").notNull().default(""),
  subject: text().notNull().default(""),
  vendor: text().notNull().default(""),
  /** 'order' (saved as an open order) | 'skipped' (no products found) | 'error' */
  status: text().notNull().default("error"),
  message: text().notNull().default(""),
  orderId: integer("order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Formulas tab: one row per client visit. kind 'hair' = color formula (products/shades with amounts,
 * developer, ratio, processing time, leftover); kind 'tattoo' = colors used, placement and aftercare.
 * Only the client's name is stored about the client (no contact details).
 */
export const clientFormulas = pgTable("client_formulas", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  kind: text().notNull().default("hair"),
  clientName: text("client_name").notNull(),
  /** YYYY-MM-DD of the visit. */
  serviceDate: text("service_date").notNull(),
  /** Hair: root touch-up, toner… Tattoo: piece and placement. */
  service: text().notNull().default(""),
  /** Hair: shade/product + amount. Tattoo: ink color/brand (amount optional). */
  lines: jsonb().$type<{ item: string; amount: string }[]>().notNull().default([]),
  developer: text().notNull().default(""),
  ratio: text().notNull().default(""),
  processingMinutes: integer("processing_minutes").notNull().default(0),
  leftover: text().notNull().default(""),
  /** Practice chips picked for the visit (treatment types, styles, skin notes…) from the industry's lists. */
  tags: jsonb().$type<string[]>().notNull().default([]),
  /** Retail prescription: take-home products recommended (from inventory), and whether they were sold then. */
  retail: jsonb().$type<{ productId: number | null; name: string; qty: number; sold: boolean; logged?: boolean }[]>().notNull().default([]),
  aftercare: text().notNull().default(""),
  /** Tattoo: touch-up / healing check date, YYYY-MM-DD or "". */
  followUpOn: text("follow_up_on").notNull().default(""),
  notes: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Before / after photos for a client visit (Formulas tab). Base64 JPEG ~1200px, kept apart so lists stay light. */
export const formulaPhotos = pgTable("formula_photos", {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
  id: serial().primaryKey(),
  formulaId: integer("formula_id")
    .notNull()
    .references(() => clientFormulas.id, { onDelete: "cascade" }),
  label: text().notNull().default("after"),
  mediaType: text("media_type").notNull().default("image/jpeg"),
  data: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Profit page rows the business removed because the information was wrong (Activity → Profit). `listKey`: maker | service | a LoserKind. */
export const profitExclusions = pgTable(
  "profit_exclusions",
  {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
    id: serial().primaryKey(),
    productId: integer("product_id").notNull(),
    listKey: text("list_key").notNull(),
    staffName: text("staff_name").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.businessId, t.productId, t.listKey)],
);

/**
 * Breakage the business can see: errors caught in the app or on the server, grouped
 * so one bad screen doesn't fill the table. Kept 30 days, never any client data
 * beyond the message itself.
 */
export const errorReports = pgTable(
  "error_reports",
  {
  /** Which business this belongs to. Every query filters on it. */
  businessId: integer("business_id").notNull().default(1),
    id: serial().primaryKey(),
    /** Error message, trimmed. */
    message: text().notNull(),
    /** Where it happened: a tab id, "server", or a screen name. */
    where: text().notNull().default(""),
    /** First line(s) of the stack, for whoever fixes it. */
    detail: text().notNull().default(""),
    /** Browser and device, so a problem on one phone is recognisable. */
    device: text().notNull().default(""),
    staffName: text("staff_name").notNull().default(""),
    /** How many times this same error has happened. */
    hits: integer().notNull().default(1),
    // With the zone, so the time reads right whatever time zone the database is in.
    firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow().notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.businessId, t.message, t.where)],
);

/**
 * Showstopper: what a team member is aiming at this month, and the selling habits
 * they picked to work on. One row per person per month, so last month's goal stays
 * as a record instead of being overwritten.
 */
export const retailGoals = pgTable(
  "retail_goals",
  {
    /** Which business this belongs to. Every query filters on it. */
    businessId: integer("business_id").notNull().default(1),
    id: serial().primaryKey(),
    /** The team member's name, as the staff picker and movements spell it. */
    staffName: text("staff_name").notNull(),
    /** The month this goal is for, YYYY-MM in the shop's own local time. */
    periodKey: text("period_key").notNull(),
    /** What they are aiming to sell this month; 0 = no goal set. */
    targetCents: integer("target_cents").notNull().default(0),
    /** Ids from RETAIL_TIPS (src/lib/retail-tips.ts) they chose to work on. */
    focusTips: jsonb("focus_tips").$type<string[]>().notNull().default([]),
    /** Who last saved it, so a manager setting a goal for someone is visible. */
    setBy: text("set_by").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("retail_goals_business_staff_period").on(t.businessId, t.staffName, t.periodKey)],
);
