import { e as createMiddleware, b as getCookie } from "../server.js";
import { randomBytes, createHash } from "node:crypto";
import { sql, eq, lt, and, gt, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/netlify-db";
import { pgTable, timestamp, text, integer, serial, boolean, jsonb, unique } from "drizzle-orm/pg-core";
const products = pgTable("products", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const movements = pgTable("movements", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text().notNull(),
  // 'in' | 'out' | 'adjust' | 'receive'
  delta: integer().notNull(),
  staffInitials: text("staff_initials").notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  note: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const businessProfile = pgTable("business_profile", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const teamMembers = pgTable("team_members", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const expenses = pgTable("expenses", {
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
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const budgets = pgTable("budgets", {
  month: text().primaryKey(),
  // YYYY-MM
  amountCents: integer("amount_cents").notNull()
});
const integrations = pgTable("integrations", {
  provider: text().primaryKey(),
  // 'square' | 'quickbooks'
  accessToken: text("access_token").notNull().default(""),
  refreshToken: text("refresh_token").notNull().default(""),
  expiresAt: timestamp("expires_at"),
  /** Square merchant id or QuickBooks realm (company) id. */
  accountId: text("account_id").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  /** CSRF state for an in-flight OAuth handshake. */
  pendingState: text("pending_state").notNull().default(""),
  lastSyncAt: timestamp("last_sync_at"),
  meta: jsonb().$type().notNull().default({}),
  connectedAt: timestamp("connected_at")
});
const squareOutbox = pgTable("square_outbox", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull(),
  variationId: text("variation_id").notNull(),
  kind: text().notNull(),
  // 'delta' | 'count'
  quantity: integer().notNull(),
  /** Movement that caused this change, so undo can cancel or reverse it. Null for bulk count pushes. */
  movementId: integer("movement_id"),
  status: text().notNull().default("pending"),
  // 'pending' | 'sent' | 'error'
  error: text().notNull().default(""),
  attempts: integer().notNull().default(0),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at")
});
const productCategories = pgTable("product_categories", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  taxGroup: text("tax_group").notNull().default("service"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const calendarEvents = pgTable("calendar_events", {
  id: serial().primaryKey(),
  title: text().notNull(),
  kind: text().notNull().default("task"),
  // 'reorder' | 'delivery' | 'bill' | 'tax' | 'count' | 'task'
  /** Local calendar date, YYYY-MM-DD. */
  date: text().notNull(),
  /** Local start time HH:MM, or empty for an all-day event. */
  startTime: text("start_time").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  repeat: text().notNull().default("none"),
  // 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  notes: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const insightReports = pgTable(
  "insight_reports",
  {
    id: serial().primaryKey(),
    kind: text().notNull(),
    // 'weekly' | 'monthly' | 'fast'
    /** 2026-W40, 2026-09 or 2026-09-29 depending on the kind. */
    periodKey: text("period_key").notNull(),
    summary: text().notNull().default(""),
    payload: jsonb().$type().notNull().default({}),
    emailedTo: text("emailed_to").notNull().default(""),
    emailedAt: timestamp("emailed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (t) => [unique("insight_reports_kind_period").on(t.kind, t.periodKey)]
);
const priceChecks = pgTable("price_checks", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  retailPriceCents: integer("retail_price_cents").notNull().default(0),
  sourceName: text("source_name").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  /** 'manufacturer' | 'distributor' | 'amazon' | 'estimate' */
  sourceType: text("source_type").notNull().default("estimate"),
  note: text().notNull().default(""),
  checkedAt: timestamp("checked_at").defaultNow().notNull()
});
const account = pgTable("account", {
  id: integer().primaryKey(),
  plan: text().notNull().default("free"),
  // 'free' | 'plus' | 'premium'
  interval: text().notNull().default("month"),
  // 'month' | 'year'
  status: text().notNull().default("active"),
  // 'active' | 'trialing' | 'paused' | 'canceled'
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
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const billingEvents = pgTable("billing_events", {
  id: serial().primaryKey(),
  kind: text().notNull(),
  // 'trial' | 'upgrade' | 'downgrade' | 'pause' | 'resume' | 'cancel' | 'reactivate' | 'charge'
  detail: text().notNull().default(""),
  amountCents: integer("amount_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const purchaseOrders = pgTable("purchase_orders", {
  id: serial().primaryKey(),
  vendor: text().notNull().default(""),
  status: text().notNull().default("open"),
  // 'open' | 'partial' | 'received' | 'canceled'
  note: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  /** How it left Bintro: 'email' | 'print' | 'csv'. */
  sentVia: text("sent_via").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Last delivery checked in against this order. */
  receivedAt: timestamp("received_at")
});
const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: serial().primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
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
  receivedCostCents: integer("received_cost_cents").notNull().default(0)
});
const parChanges = pgTable("par_changes", {
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
  undoneAt: timestamp("undone_at")
});
const stockCounts = pgTable("stock_counts", {
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
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const stockCountLines = pgTable("stock_count_lines", {
  id: serial().primaryKey(),
  countId: integer("count_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text().notNull().default(""),
  expected: integer().notNull(),
  counted: integer().notNull(),
  diff: integer().notNull(),
  unitCostCents: integer("unit_cost_cents").notNull().default(0),
  reason: text().notNull().default("")
});
const connectionRequests = pgTable("connection_requests", {
  id: serial().primaryKey(),
  /** Directory id (e.g. "vagaro") or "other". */
  platform: text().notNull(),
  /** The app's name as typed, for "other". */
  name: text().notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const integrationLogs = pgTable("integration_logs", {
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
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const appUsers = pgTable("app_users", {
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
  lastSignInAt: timestamp("last_sign_in_at")
});
const appSessions = pgTable("app_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull(),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull()
});
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  account,
  appSessions,
  appUsers,
  billingEvents,
  budgets,
  businessProfile,
  calendarEvents,
  connectionRequests,
  expenses,
  insightReports,
  integrationLogs,
  integrations,
  movements,
  parChanges,
  priceChecks,
  productCategories,
  products,
  purchaseOrderLines,
  purchaseOrders,
  squareOutbox,
  stockCountLines,
  stockCounts,
  teamMembers
}, Symbol.toStringTag, { value: "Module" }));
const db = drizzle({ schema });
const SESSION_COOKIE = "bintro_session";
const OAUTH_COOKIE = "bintro_google";
const SESSION_DAYS = 30;
const env = (name) => process.env[name]?.trim() ?? "";
const googleId = () => env("GOOGLE_CLIENT_ID");
const googleSecret = () => env("GOOGLE_CLIENT_SECRET");
const ownerEmail = () => env("BINTRO_OWNER_EMAIL").toLowerCase();
function authEnabled() {
  return Boolean(googleId() && googleSecret());
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const b64url = (buf) => buf.toString("base64url");
function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return void 0;
}
function serializeCookie(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
function googleCallbackUrl(origin) {
  return `${origin}/api/auth/google/callback`;
}
function startGoogleSignIn(origin) {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const params = new URLSearchParams({
    client_id: googleId(),
    redirect_uri: googleCallbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    cookie: [state, nonce, verifier].join(".")
  };
}
async function finishGoogleSignIn(origin, params, cookie) {
  const [state, nonce, verifier] = (cookie ?? "").split(".");
  if (!state || state !== params.state) throw new Error("state");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: googleId(),
      client_secret: googleSecret(),
      redirect_uri: googleCallbackUrl(origin),
      grant_type: "authorization_code",
      code_verifier: verifier
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    console.error("Google token exchange failed", res.status, data.error);
    throw new Error("google");
  }
  const claims = JSON.parse(Buffer.from(data.id_token.split(".")[1] ?? "", "base64url").toString("utf8"));
  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== googleId() || !claims.exp || claims.exp * 1e3 < Date.now() || claims.nonce !== nonce) {
    throw new Error("google");
  }
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error("unverified");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name ?? "" };
}
async function userForGoogle(profile) {
  let [user] = await db.select().from(appUsers).where(eq(appUsers.email, profile.email));
  if (!user && profile.email === ownerEmail()) {
    [user] = await db.insert(appUsers).values({ email: profile.email, name: profile.name, role: "owner", addedBy: "BINTRO_OWNER_EMAIL" }).onConflictDoNothing().returning();
    user ??= (await db.select().from(appUsers).where(eq(appUsers.email, profile.email)))[0];
  }
  if (!user) throw new Error("not-allowed");
  if (user.googleSub && user.googleSub !== profile.sub) throw new Error("not-allowed");
  await db.update(appUsers).set({ googleSub: profile.sub, name: user.name || profile.name, lastSignInAt: /* @__PURE__ */ new Date() }).where(eq(appUsers.id, user.id));
  return user;
}
async function createSession(userId, userAgent) {
  const token = b64url(randomBytes(32));
  await db.insert(appSessions).values({
    tokenHash: sha256(token),
    userId,
    userAgent: userAgent.slice(0, 300),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5)
  });
  await db.delete(appSessions).where(lt(appSessions.expiresAt, /* @__PURE__ */ new Date()));
  return { token, maxAge: SESSION_DAYS * 86400 };
}
async function userForToken(token) {
  if (!token) return null;
  const [row] = await db.select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, role: appUsers.role }).from(appSessions).innerJoin(appUsers, eq(appUsers.id, appSessions.userId)).where(and(eq(appSessions.tokenHash, sha256(token)), gt(appSessions.expiresAt, /* @__PURE__ */ new Date())));
  return row ? { ...row, role: row.role === "owner" ? "owner" : "staff" } : null;
}
async function endSession(token) {
  if (token) await db.delete(appSessions).where(eq(appSessions.tokenHash, sha256(token)));
}
async function listUsers() {
  const rows = await db.select().from(appUsers).orderBy(asc(appUsers.createdAt));
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === "owner" ? "owner" : "staff",
    lastSignInAt: u.lastSignInAt?.toISOString() ?? null
  }));
}
async function addUser(email, role, addedBy) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That doesn't look like an email address.");
  await db.insert(appUsers).values({ email: clean, role, addedBy }).onConflictDoUpdate({ target: appUsers.email, set: { role } });
}
async function removeUser(id, actingUserId) {
  if (id === actingUserId) throw new Error("You can't remove yourself.");
  const [target] = await db.select().from(appUsers).where(eq(appUsers.id, id));
  if (!target) return;
  if (target.role === "owner") {
    const owners = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.role, "owner"));
    if (owners.length <= 1) throw new Error("Keep at least one owner.");
  }
  await db.delete(appSessions).where(eq(appSessions.userId, id));
  await db.delete(appUsers).where(eq(appUsers.id, id));
}
async function routeUser(request) {
  if (!authEnabled()) return "open";
  return userForToken(readCookie(request, SESSION_COOKIE));
}
const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  let user = null;
  if (authEnabled()) {
    user = await userForToken(getCookie(SESSION_COOKIE));
    if (!user) throw new Error("SIGNED_OUT: Your session ended. Sign in again.");
  }
  return next({ context: { user } });
});
const requireOwner = createMiddleware({ type: "function" }).middleware([requireUser]).server(async ({ next, context }) => {
  if (context.user && context.user.role !== "owner") throw new Error("Only an owner can do that.");
  return next();
});
export {
  insightReports as A,
  priceChecks as B,
  purchaseOrders as C,
  purchaseOrderLines as D,
  squareOutbox as E,
  integrations as F,
  billingEvents as G,
  account as H,
  teamMembers as I,
  integrationLogs as J,
  expenses as K,
  budgets as L,
  OAUTH_COOKIE as O,
  SESSION_COOKIE as S,
  requireOwner as a,
  routeUser as b,
  readCookie as c,
  createSession as d,
  authEnabled as e,
  finishGoogleSignIn as f,
  startGoogleSignIn as g,
  db as h,
  parChanges as i,
  productCategories as j,
  connectionRequests as k,
  userForToken as l,
  movements as m,
  endSession as n,
  ownerEmail as o,
  products as p,
  listUsers as q,
  requireUser as r,
  serializeCookie as s,
  addUser as t,
  userForGoogle as u,
  removeUser as v,
  businessProfile as w,
  calendarEvents as x,
  stockCounts as y,
  stockCountLines as z
};
