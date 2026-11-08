/**
 * Square POS and QuickBooks Online connections. Server-only.
 *
 * Square: imports the catalog (names, barcodes/SKUs, prices) as products and
 * pulls completed sales in as "out" movements so stock drops as items sell.
 * QuickBooks: pushes logged expenses and each closed month's stock purchases
 * (per vendor) as Purchases so the books match Bintro's Budget tab.
 *
 * Both use OAuth. The owner registers an app with each provider and sets the
 * client id/secret env vars; tokens are stored in the integrations table.
 */
import { randomBytes } from "node:crypto";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, integrations, products, squareOutbox } from "../../db/schema.js";
import { SQUARE_STAFF_NAME, applyMovement, findProductByBarcode } from "./inventory.server.js";
import { findExpensesForMonth, findInventorySpend, type MonthWindow } from "./business.server.js";

export type Provider = "square" | "quickbooks";
export const PROVIDERS: Provider[] = ["square", "quickbooks"];

type Integration = typeof integrations.$inferSelect;

const SQUARE_VERSION = "2025-01-23";
/** INVENTORY_* lets Bintro keep Square's stock counts in step; older connections lack it and must reconnect. */
const SQUARE_SCOPES = "ITEMS_READ ORDERS_READ MERCHANT_PROFILE_READ INVENTORY_READ INVENTORY_WRITE";
const QB_MINOR_VERSION = "75";

/** Alternate env var names accepted for backward compatibility with existing Netlify settings. */
const ENV_ALIASES: Record<string, string[]> = {
  QUICKBOOKS_CLIENT_ID: ["QB_CLIENT_ID", "QB_ClIENT_ID"],
  QUICKBOOKS_CLIENT_SECRET: ["QB_CLIENT_SECRET"],
  QUICKBOOKS_ENVIRONMENT: ["QB_ENVIRONMENT"],
};

function env(name: string) {
  for (const key of [name, ...(ENV_ALIASES[name] ?? [])]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function isSandbox(provider: Provider) {
  return env(provider === "square" ? "SQUARE_ENVIRONMENT" : "QUICKBOOKS_ENVIRONMENT").toLowerCase() === "sandbox";
}

function credentials(provider: Provider) {
  return provider === "square"
    ? { id: env("SQUARE_APPLICATION_ID"), secret: env("SQUARE_APPLICATION_SECRET") }
    : { id: env("QUICKBOOKS_CLIENT_ID"), secret: env("QUICKBOOKS_CLIENT_SECRET") };
}

export function isConfigured(provider: Provider) {
  const c = credentials(provider);
  return Boolean(c.id && c.secret);
}

export function callbackUrl(origin: string, provider: Provider) {
  return `${origin}/api/integrations/${provider}/callback`;
}

function squareBase(provider: Provider = "square") {
  return isSandbox(provider) ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
}

function quickbooksApiBase() {
  return isSandbox("quickbooks") ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com";
}

async function findIntegration(provider: Provider) {
  const rows = await db.select().from(integrations).where(eq(integrations.provider, provider));
  return rows[0] ?? null;
}

async function saveIntegration(provider: Provider, values: Partial<Omit<Integration, "provider">>) {
  await db
    .insert(integrations)
    .values({ provider, ...values })
    .onConflictDoUpdate({ target: integrations.provider, set: values });
}

export async function disconnectIntegration(provider: Provider) {
  await db.delete(integrations).where(eq(integrations.provider, provider));
}

export async function integrationStatus() {
  const rows = await db.select().from(integrations);
  const outbox = await db
    .select({ status: squareOutbox.status, n: sql<number>`count(*)::int` })
    .from(squareOutbox)
    .where(inArray(squareOutbox.status, ["pending", "error"]))
    .groupBy(squareOutbox.status);
  const [lastError] = await db
    .select({ error: squareOutbox.error })
    .from(squareOutbox)
    .where(eq(squareOutbox.status, "error"))
    .orderBy(sql`${squareOutbox.id} desc`)
    .limit(1);
  return PROVIDERS.map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    const scopes = String((row?.meta as { scopes?: string } | undefined)?.scopes ?? "");
    const inventory =
      provider === "square"
        ? {
            pending: outbox.find((o) => o.status === "pending")?.n ?? 0,
            failed: outbox.find((o) => o.status === "error")?.n ?? 0,
            lastError: lastError?.error ?? "",
            needsReconnect: Boolean(row?.accessToken) && !scopes.includes("INVENTORY_WRITE"),
          }
        : null;
    return {
      inventory,
      provider,
      configured: isConfigured(provider),
      sandbox: isSandbox(provider),
      connected: Boolean(row?.accessToken),
      accountName: row?.accountName ?? "",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      connectedAt: row?.connectedAt?.toISOString() ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// OAuth handshake
// ---------------------------------------------------------------------------

/** Where to send the owner to approve the connection. */
export async function buildAuthorizeUrl(provider: Provider, origin: string) {
  const { id } = credentials(provider);
  const state = randomBytes(24).toString("hex");
  await saveIntegration(provider, { pendingState: state });
  const redirect = callbackUrl(origin, provider);

  if (provider === "square") {
    const params = new URLSearchParams({
      client_id: id,
      scope: SQUARE_SCOPES,
      session: "false",
      state,
      redirect_uri: redirect,
    });
    return `${squareBase()}/oauth2/authorize?${params}`;
  }

  const params = new URLSearchParams({
    client_id: id,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirect,
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params}`;
}

type TokenSet = { accessToken: string; refreshToken: string; expiresAt: Date | null; accountId?: string };

async function requestSquareToken(body: Record<string, string>): Promise<TokenSet> {
  const { id, secret } = credentials("square");
  const res = await fetch(`${squareBase()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": SQUARE_VERSION },
    body: JSON.stringify({ client_id: id, client_secret: secret, ...body }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || !data.access_token) throw new Error(data.message || data.error_description || "Square rejected the request.");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    accountId: data.merchant_id,
  };
}

async function requestQuickBooksToken(body: Record<string, string>): Promise<TokenSet> {
  const { id, secret } = credentials("quickbooks");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string | number>;
  if (!res.ok || !data.access_token) throw new Error(String(data.error_description || data.error || "QuickBooks rejected the request."));
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? ""),
    expiresAt: new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000),
  };
}

/** Finishes the OAuth handshake. Throws with a readable message on failure. */
export async function completeAuthorization(
  provider: Provider,
  params: { code: string; state: string; realmId?: string },
  origin: string,
) {
  const row = await findIntegration(provider);
  if (!row?.pendingState || row.pendingState !== params.state) {
    throw new Error("That connection link expired. Start again from Settings.");
  }
  const redirect = callbackUrl(origin, provider);

  if (provider === "square") {
    const tokens = await requestSquareToken({ code: params.code, grant_type: "authorization_code", redirect_uri: redirect });
    let accountName = "";
    if (tokens.accountId) {
      const res = await fetch(`${squareBase()}/v2/merchants/${tokens.accountId}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}`, "Square-Version": SQUARE_VERSION },
      });
      const data = (await res.json().catch(() => ({}))) as { merchant?: { business_name?: string } };
      accountName = data.merchant?.business_name ?? "";
    }
    await saveIntegration(provider, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      accountId: tokens.accountId ?? "",
      accountName,
      pendingState: "",
      connectedAt: new Date(),
      // Only sales from now on; history before connecting was already counted by hand.
      lastSyncAt: new Date(),
      meta: { scopes: SQUARE_SCOPES },
    });
    return;
  }

  if (!params.realmId) throw new Error("QuickBooks didn't say which company to connect.");
  const tokens = await requestQuickBooksToken({ grant_type: "authorization_code", code: params.code, redirect_uri: redirect });
  const res = await fetch(
    `${quickbooksApiBase()}/v3/company/${params.realmId}/companyinfo/${params.realmId}?minorversion=${QB_MINOR_VERSION}`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" } },
  );
  const info = (await res.json().catch(() => ({}))) as { CompanyInfo?: { CompanyName?: string } };
  await saveIntegration(provider, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    accountId: params.realmId,
    accountName: info.CompanyInfo?.CompanyName ?? "",
    pendingState: "",
    connectedAt: new Date(),
    meta: {},
  });
}

/** Returns a connected integration with a usable access token, refreshing it if it's about to expire. */
async function activeIntegration(provider: Provider): Promise<Integration> {
  const row = await findIntegration(provider);
  if (!row?.accessToken) throw new Error(`${provider === "square" ? "Square" : "QuickBooks"} isn't connected.`);
  const expiring = row.expiresAt && row.expiresAt.getTime() - Date.now() < 5 * 60_000;
  if (!expiring || !row.refreshToken) return row;

  const tokens =
    provider === "square"
      ? await requestSquareToken({ grant_type: "refresh_token", refresh_token: row.refreshToken })
      : await requestQuickBooksToken({ grant_type: "refresh_token", refresh_token: row.refreshToken });
  const updated = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || row.refreshToken,
    expiresAt: tokens.expiresAt,
  };
  await saveIntegration(provider, updated);
  return { ...row, ...updated };
}

// ---------------------------------------------------------------------------
// Square
// ---------------------------------------------------------------------------

async function squareFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${squareBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { errors?: Array<{ detail?: string }> };
  if (!res.ok) throw new Error(data.errors?.[0]?.detail || `Square returned ${res.status}.`);
  return data;
}

type SquareObject = {
  id: string;
  type: string;
  is_deleted?: boolean;
  category_data?: { name?: string };
  item_data?: {
    name?: string;
    category_id?: string;
    categories?: Array<{ id: string }>;
    variations?: Array<{
      id: string;
      is_deleted?: boolean;
      item_variation_data?: { name?: string; sku?: string; upc?: string; price_money?: { amount?: number } };
    }>;
  };
};

/** Pulls every Square catalog item variation into Bintro's product list. */
export async function importSquareCatalog() {
  const row = await activeIntegration("square");
  const objects: SquareObject[] = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ types: "ITEM,CATEGORY" });
    if (cursor) params.set("cursor", cursor);
    const page = await squareFetch<{ objects?: SquareObject[]; cursor?: string }>(row.accessToken, `/v2/catalog/list?${params}`);
    objects.push(...(page.objects ?? []));
    cursor = page.cursor ?? "";
  } while (cursor && objects.length < 20_000);

  const categoryNames = new Map(
    objects.filter((o) => o.type === "CATEGORY").map((o) => [o.id, o.category_data?.name ?? ""]),
  );
  const existing = await db.select().from(products);
  const byVariation = new Map(existing.filter((p) => p.squareVariationId).map((p) => [p.squareVariationId, p]));

  let created = 0;
  let updated = 0;
  const newlyCreated: Array<{ id: number; variationId: string }> = [];
  const linkedExisting: Array<{ id: number; variationId: string; qty: number }> = [];
  for (const item of objects) {
    if (item.type !== "ITEM" || item.is_deleted || !item.item_data) continue;
    const data = item.item_data;
    const categoryId = data.categories?.[0]?.id ?? data.category_id ?? "";
    const category = categoryNames.get(categoryId) ?? "";
    const variations = (data.variations ?? []).filter((v) => !v.is_deleted);
    for (const v of variations) {
      const vd = v.item_variation_data ?? {};
      const variantName = vd.name && !/^regular$/i.test(vd.name) && variations.length > 1 ? ` ${vd.name}` : "";
      const name = `${data.name ?? "Square item"}${variantName}`.trim().slice(0, 160);
      const barcode = (vd.upc || vd.sku || `SQ-${v.id}`).trim().slice(0, 64);
      const price = Number(vd.price_money?.amount ?? 0) || 0;

      const match = byVariation.get(v.id) ?? (await findProductByBarcode(barcode));
      if (match) {
        await db
          .update(products)
          .set({
            squareVariationId: v.id,
            retailPriceCents: price || match.retailPriceCents,
            category: match.category || category,
            updatedAt: new Date(),
          })
          .where(eq(products.id, match.id));
        linkedExisting.push({ id: match.id, variationId: v.id, qty: match.qty });
        updated++;
      } else {
        const [row] = await db
          .insert(products)
          .values({ barcode, name, category, retailPriceCents: price, squareVariationId: v.id })
          .returning({ id: products.id });
        if (row) newlyCreated.push({ id: row.id, variationId: v.id });
        created++;
      }
    }
  }

  // Line the two systems up. Items Bintro already tracked: Bintro's count wins and is
  // sent to Square. Items new to Bintro: start from Square's count instead of zero.
  let countsSent = 0;
  let countsPulled = 0;
  const scopes = String((row.meta as { scopes?: string }).scopes ?? "");
  if (scopes.includes("INVENTORY_WRITE")) {
    try {
      const squareCounts = await fetchSquareCounts(row, newlyCreated.map((p) => p.variationId));
      for (const p of newlyCreated) {
        const qty = squareCounts.get(p.variationId) ?? 0;
        if (qty === 0) continue;
        await applyMovement({ productId: p.id, type: "adjust", delta: qty, staffName: SQUARE_STAFF_NAME, note: "Starting count from Square" });
        countsPulled++;
      }
      if (linkedExisting.length) {
        await db.insert(squareOutbox).values(
          linkedExisting.map((p) => ({ productId: p.id, variationId: p.variationId, kind: "count", quantity: Math.max(0, p.qty) })),
        );
        countsSent = (await flushSquareOutbox()).sent;
      }
    } catch (error) {
      console.error("Square count alignment failed", error);
    }
  }
  return { created, updated, countsSent, countsPulled };
}

type SquareOrder = {
  id: string;
  closed_at?: string;
  line_items?: Array<{ catalog_object_id?: string; quantity?: string; name?: string }>;
};

/**
 * Logs every Square sale completed since the last sync as an "out" movement.
 * Items Bintro doesn't know (never imported) are counted and skipped.
 */
export async function syncSquareSales() {
  const row = await activeIntegration("square");
  const { locations = [] } = await squareFetch<{ locations?: Array<{ id: string; status?: string }> }>(
    row.accessToken,
    "/v2/locations",
  );
  const locationIds = locations.filter((l) => l.status !== "INACTIVE").map((l) => l.id).slice(0, 10);
  if (locationIds.length === 0) return { sales: 0, units: 0, skipped: 0 };

  const since = row.lastSyncAt ?? row.connectedAt ?? new Date(Date.now() - 86_400_000);
  const mapped = await db.select({ id: products.id, variation: products.squareVariationId }).from(products);
  const productByVariation = new Map(mapped.filter((p) => p.variation).map((p) => [p.variation, p.id]));

  let cursor = "";
  let latest = since;
  let sales = 0;
  let units = 0;
  let skipped = 0;
  do {
    const page = await squareFetch<{ orders?: SquareOrder[]; cursor?: string }>(row.accessToken, "/v2/orders/search", {
      method: "POST",
      body: JSON.stringify({
        location_ids: locationIds,
        cursor: cursor || undefined,
        limit: 200,
        query: {
          filter: {
            state_filter: { states: ["COMPLETED"] },
            date_time_filter: { closed_at: { start_at: since.toISOString() } },
          },
          sort: { sort_field: "CLOSED_AT", sort_order: "ASC" },
        },
      }),
    });
    for (const order of page.orders ?? []) {
      const closed = order.closed_at ? new Date(order.closed_at) : null;
      // start_at is inclusive; skip the order the last sync already ended on.
      if (!closed || closed <= since) continue;
      if (closed > latest) latest = closed;
      sales++;
      for (const line of order.line_items ?? []) {
        const qty = Math.round(Number(line.quantity ?? 0));
        const productId = line.catalog_object_id ? productByVariation.get(line.catalog_object_id) : undefined;
        if (!productId || qty <= 0) {
          skipped++;
          continue;
        }
        await applyMovement({
          productId,
          type: "out",
          delta: -qty,
          staffName: SQUARE_STAFF_NAME,
          note: `Square sale ${order.id}`,
        });
        units += qty;
      }
    }
    cursor = page.cursor ?? "";
  } while (cursor);

  await saveIntegration("square", { lastSyncAt: latest });
  return { sales, units, skipped };
}

/** Used by the scheduled function: sync quietly if Square is connected, otherwise do nothing. */
export async function syncSquareSalesIfConnected() {
  const row = await findIntegration("square");
  if (!row?.accessToken || !isConfigured("square")) return null;
  const sales = await syncSquareSales();
  const pushed = await flushSquareOutbox().catch((error) => {
    console.error("Square inventory push failed", error);
    return null;
  });
  return { ...sales, pushed };
}

// ---------------------------------------------------------------------------
// Square inventory: Bintro → Square
// ---------------------------------------------------------------------------

/** The Square location whose stock Bintro keeps in step (the first active one), cached in meta. */
async function squareLocationId(row: Integration) {
  const cached = (row.meta as { locationId?: string }).locationId;
  if (cached) return cached;
  const { locations = [] } = await squareFetch<{ locations?: Array<{ id: string; status?: string }> }>(
    row.accessToken,
    "/v2/locations",
  );
  const id = locations.find((l) => l.status !== "INACTIVE")?.id ?? "";
  if (!id) throw new Error("Square has no active location to keep stock for.");
  await saveIntegration("square", { meta: { ...(row.meta ?? {}), locationId: id } });
  return id;
}

type OutboxRow = typeof squareOutbox.$inferSelect;

function toSquareChange(r: OutboxRow, locationId: string) {
  const occurred_at = r.occurredAt.toISOString();
  if (r.kind === "count") {
    return {
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: r.variationId,
        location_id: locationId,
        state: "IN_STOCK",
        quantity: String(Math.max(0, r.quantity)),
        occurred_at,
      },
    };
  }
  const adding = r.quantity > 0;
  return {
    type: "ADJUSTMENT",
    adjustment: {
      catalog_object_id: r.variationId,
      location_id: locationId,
      // Added stock comes from nowhere into stock; stock used up in Bintro leaves as waste (not a sale).
      from_state: adding ? "NONE" : "IN_STOCK",
      to_state: adding ? "IN_STOCK" : "WASTE",
      quantity: String(Math.abs(r.quantity)),
      occurred_at,
    },
  };
}

async function sendSquareChanges(token: string, rows: OutboxRow[], locationId: string) {
  // Same rows → same key, so a retry after a timeout can't apply a change twice.
  const idempotency_key = `bintro-${rows.map((r) => r.id).join("-")}`.slice(0, 128);
  const res = await fetch(`${squareBase()}/v2/inventory/changes/batch-create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotency_key,
      ignore_unchanged_counts: true,
      changes: rows.map((r) => toSquareChange(r, locationId)),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string; code?: string }> };
  return { ok: res.ok, status: res.status, message: data.errors?.[0]?.detail || data.errors?.[0]?.code || `Square returned ${res.status}.` };
}

/**
 * Sends queued Bintro stock changes to Square, oldest first, 100 per request.
 * If Square rejects a batch outright (bad item, tracking off) the rows are retried
 * one by one so a single bad item can't hold up the rest; rejected rows are marked
 * 'error'. Network or permission problems leave rows pending for the next run.
 */
export async function flushSquareOutbox() {
  const pending = await db
    .select()
    .from(squareOutbox)
    .where(eq(squareOutbox.status, "pending"))
    .orderBy(asc(squareOutbox.id))
    .limit(500);
  if (pending.length === 0) return { sent: 0, failed: 0 };
  const row = await findIntegration("square");
  if (!row?.accessToken || !isConfigured("square")) return { sent: 0, failed: 0 };
  const active = await activeIntegration("square");
  const locationId = await squareLocationId(active);

  let sent = 0;
  let failed = 0;
  const markSent = async (ids: number[]) => {
    await db.update(squareOutbox).set({ status: "sent", error: "", sentAt: new Date() }).where(inArray(squareOutbox.id, ids));
    sent += ids.length;
  };
  const markFailed = async (ids: number[], message: string, final: boolean) => {
    await db
      .update(squareOutbox)
      .set({ status: final ? "error" : "pending", error: message.slice(0, 500), attempts: sql`${squareOutbox.attempts} + 1` })
      .where(inArray(squareOutbox.id, ids));
    if (final) failed += ids.length;
  };

  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100);
    const result = await sendSquareChanges(active.accessToken, batch, locationId);
    if (result.ok) {
      await markSent(batch.map((r) => r.id));
      continue;
    }
    const rejected = result.status === 400 || result.status === 404;
    if (!rejected) {
      // Auth, permission, rate limit or outage: keep everything queued and stop for now.
      await markFailed(pending.slice(i).map((r) => r.id), result.message, false);
      break;
    }
    for (const r of batch) {
      const single = batch.length === 1 ? result : await sendSquareChanges(active.accessToken, [r], locationId);
      if (single.ok) await markSent([r.id]);
      else await markFailed([r.id], single.message, single.status === 400 || single.status === 404);
    }
  }
  return { sent, failed };
}

/** Sets every linked product's Square count to Bintro's on-hand count (Bintro is the source of truth). */
export async function sendAllCountsToSquare() {
  await activeIntegration("square");
  // Count any Square sales first so the counts sent already reflect them.
  await syncSquareSales();
  const linked = await db.select().from(products).where(sql`${products.squareVariationId} is not null and ${products.squareVariationId} <> ''`);
  if (linked.length === 0) return { queued: 0, sent: 0, failed: 0 };
  // Older queued changes are superseded by the full count.
  await db.delete(squareOutbox).where(eq(squareOutbox.status, "pending"));
  await db.insert(squareOutbox).values(
    linked.map((p) => ({ productId: p.id, variationId: p.squareVariationId!, kind: "count", quantity: Math.max(0, p.qty) })),
  );
  const result = await flushSquareOutbox();
  return { queued: linked.length, ...result };
}

/** Square's current in-stock count for each variation id at the kept location. */
async function fetchSquareCounts(row: Integration, variationIds: string[]) {
  const counts = new Map<string, number>();
  if (variationIds.length === 0) return counts;
  const locationId = await squareLocationId(row);
  for (let i = 0; i < variationIds.length; i += 500) {
    let cursor = "";
    do {
      const page = await squareFetch<{ counts?: Array<{ catalog_object_id: string; state?: string; quantity?: string }>; cursor?: string }>(
        row.accessToken,
        "/v2/inventory/counts/batch-retrieve",
        {
          method: "POST",
          body: JSON.stringify({
            catalog_object_ids: variationIds.slice(i, i + 500),
            location_ids: [locationId],
            states: ["IN_STOCK"],
            cursor: cursor || undefined,
          }),
        },
      );
      for (const c of page.counts ?? []) counts.set(c.catalog_object_id, Math.round(Number(c.quantity ?? 0)));
      cursor = page.cursor ?? "";
    } while (cursor);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// QuickBooks
// ---------------------------------------------------------------------------

async function qbFetch<T>(row: Integration, path: string, init: RequestInit = {}): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${quickbooksApiBase()}/v3/company/${row.accountId}${path}${sep}minorversion=${QB_MINOR_VERSION}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${row.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    Fault?: { Error?: Array<{ Message?: string; Detail?: string }> };
  };
  if (!res.ok || data.Fault) {
    const err = data.Fault?.Error?.[0];
    throw new Error(err?.Detail || err?.Message || `QuickBooks returned ${res.status}.`);
  }
  return data;
}

async function qbFirstAccount(row: Integration, where: string) {
  const query = encodeURIComponent(`select Id, Name from Account where ${where} and Active = true MAXRESULTS 1`);
  const data = await qbFetch<{ QueryResponse?: { Account?: Array<{ Id: string; Name: string }> } }>(row, `/query?query=${query}`);
  return data.QueryResponse?.Account?.[0] ?? null;
}

type QbMeta = {
  bankAccountId?: string;
  expenseAccountId?: string;
  cogsAccountId?: string;
  /** `${month}|${vendor}` -> QuickBooks Purchase id, so a closed month is only sent once. */
  pushedInventory?: Record<string, string>;
};

/** Picks (once) the accounts Bintro books against: first bank, an expense account, and COGS for stock. */
async function qbAccounts(row: Integration) {
  const meta = (row.meta ?? {}) as QbMeta;
  if (meta.bankAccountId && meta.expenseAccountId && meta.cogsAccountId) return meta;
  const bank =
    (await qbFirstAccount(row, "AccountType = 'Bank'")) ?? (await qbFirstAccount(row, "AccountType = 'Credit Card'"));
  const expense =
    (await qbFirstAccount(row, "AccountType = 'Expense' and Name like '%Supplies%'")) ??
    (await qbFirstAccount(row, "AccountType = 'Expense'"));
  const cogs = (await qbFirstAccount(row, "AccountType = 'Cost of Goods Sold'")) ?? expense;
  if (!bank || !expense || !cogs) {
    throw new Error("QuickBooks needs at least one bank account and one expense account set up.");
  }
  const next = { ...meta, bankAccountId: bank.Id, expenseAccountId: expense.Id, cogsAccountId: cogs.Id };
  await saveIntegration("quickbooks", { meta: next });
  return next;
}

async function qbCreatePurchase(
  row: Integration,
  p: { bankAccountId: string; accountId: string; date: string; cents: number; description: string; memo: string },
) {
  const data = await qbFetch<{ Purchase?: { Id: string } }>(row, "/purchase", {
    method: "POST",
    body: JSON.stringify({
      PaymentType: "Cash",
      AccountRef: { value: p.bankAccountId },
      TxnDate: p.date,
      PrivateNote: p.memo.slice(0, 4000),
      Line: [
        {
          DetailType: "AccountBasedExpenseLineDetail",
          Amount: p.cents / 100,
          Description: p.description.slice(0, 4000),
          AccountBasedExpenseLineDetail: { AccountRef: { value: p.accountId } },
        },
      ],
    }),
  });
  return data.Purchase?.Id ?? "";
}

/**
 * Sends a month to QuickBooks: every expense not yet sent, plus, once the month
 * has ended, one stock purchase per vendor. Safe to press more than once.
 */
export async function pushMonthToQuickBooks(window: MonthWindow) {
  let row = await activeIntegration("quickbooks");
  const accounts = await qbAccounts(row);
  row = { ...row, meta: accounts };

  let sentExpenses = 0;
  for (const e of await findExpensesForMonth(window.key)) {
    if (e.quickbooksId || e.amountCents <= 0) continue;
    const id = await qbCreatePurchase(row, {
      bankAccountId: accounts.bankAccountId!,
      accountId: /inventory|stock/i.test(e.category) ? accounts.cogsAccountId! : accounts.expenseAccountId!,
      date: e.spentOn,
      cents: e.amountCents,
      description: [e.category, e.vendor, e.note].filter(Boolean).join(" · ") || "Expense",
      memo: `Logged in Bintro${e.staffName ? ` by ${e.staffName}` : ""}`,
    });
    await db.update(expenses).set({ quickbooksId: id }).where(eq(expenses.id, e.id));
    sentExpenses++;
  }

  let sentVendors = 0;
  const monthClosed = new Date(window.end).getTime() <= Date.now();
  if (monthClosed) {
    const pushed = { ...(accounts.pushedInventory ?? {}) };
    const lastDay = new Date(new Date(window.end).getTime() - 1);
    const date = `${window.key}-${String(lastDay.getDate()).padStart(2, "0")}`;
    for (const v of await findInventorySpend(new Date(window.start), new Date(window.end))) {
      const key = `${window.key}|${v.vendor}`;
      const cents = Number(v.cents);
      if (pushed[key] || cents <= 0) continue;
      pushed[key] = await qbCreatePurchase(row, {
        bankAccountId: accounts.bankAccountId!,
        accountId: accounts.cogsAccountId!,
        date,
        cents,
        description: `Inventory received from ${v.vendor} (${Number(v.units)} units)`,
        memo: `Stock scanned in with Bintro during ${window.key}`,
      });
      sentVendors++;
    }
    await saveIntegration("quickbooks", { meta: { ...accounts, pushedInventory: pushed } });
  }

  await saveIntegration("quickbooks", { lastSyncAt: new Date() });
  return { sentExpenses, sentVendors, monthClosed };
}
