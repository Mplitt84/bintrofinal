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
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  /** What the business sells it for. 0 when it's backbar / not sold. */
  retailPriceCents: integer("retail_price_cents").notNull().default(0),
  /** Square catalog item variation this product was imported from, used to map POS sales. */
  squareVariationId: text("square_variation_id").notNull().default(""),
  /** Product photo, usually filled in from the barcode database lookup. Empty when none. */
  imageUrl: text("image_url").notNull().default(""),
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
  /** Display color palette id, shared by every device. */
  palette: text().notNull().default("burgundy-olive"),
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
