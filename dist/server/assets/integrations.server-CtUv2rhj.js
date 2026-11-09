import { randomBytes } from "node:crypto";
import { lt, eq, asc, and, gte, desc, sql, inArray } from "drizzle-orm";
import { h as db, J as integrationLogs, F as integrations, E as squareOutbox, p as products, K as expenses } from "./auth.middleware-C_30RReI.js";
import { d as findProductByBarcode, h as applyMovement, S as SQUARE_STAFF_NAME } from "./inventory.server-Bvd4T4SM.js";
import { c as findProductCategories, u as upsertProductCategories, h as findExpensesForMonth, n as inventorySpend } from "./business.server-DvuZq3pz.js";
import "../server.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./inventory-defaults-BnRHgx1T.js";
import "./business-types-DKNVcfJE.js";
const PROVIDERS = ["square", "quickbooks"];
const SQUARE_VERSION = "2025-01-23";
const SQUARE_SCOPES = "ITEMS_READ ORDERS_READ MERCHANT_PROFILE_READ INVENTORY_READ INVENTORY_WRITE";
const QB_MINOR_VERSION = "75";
const ENV_ALIASES = {
  QUICKBOOKS_CLIENT_ID: ["QB_CLIENT_ID", "QB_ClIENT_ID"],
  QUICKBOOKS_CLIENT_SECRET: ["QB_CLIENT_SECRET"],
  QUICKBOOKS_ENVIRONMENT: ["QB_ENVIRONMENT"]
};
function env(name) {
  for (const key of [name, ...ENV_ALIASES[name] ?? []]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}
function isSandbox(provider) {
  return env(provider === "square" ? "SQUARE_ENVIRONMENT" : "QUICKBOOKS_ENVIRONMENT").toLowerCase() === "sandbox";
}
function credentials(provider) {
  return provider === "square" ? { id: env("SQUARE_APPLICATION_ID"), secret: env("SQUARE_APPLICATION_SECRET") } : { id: env("QUICKBOOKS_CLIENT_ID"), secret: env("QUICKBOOKS_CLIENT_SECRET") };
}
function isConfigured(provider) {
  const c = credentials(provider);
  return Boolean(c.id && c.secret);
}
function callbackUrl(origin, provider) {
  return `${origin}/api/integrations/${provider}/callback`;
}
function squareBase(provider = "square") {
  return isSandbox(provider) ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
}
function quickbooksApiBase() {
  return isSandbox("quickbooks") ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com";
}
async function findIntegration(provider) {
  const rows = await db.select().from(integrations).where(eq(integrations.provider, provider));
  return rows[0] ?? null;
}
async function saveIntegration(provider, values) {
  await db.insert(integrations).values({ provider, ...values }).onConflictDoUpdate({ target: integrations.provider, set: values });
}
const LOG_DAYS = 365;
async function logIntegrationError(entry) {
  try {
    await db.insert(integrationLogs).values({
      provider: entry.provider,
      action: entry.action.slice(0, 200),
      status: entry.status ?? 0,
      code: (entry.code ?? "").slice(0, 100),
      intuitTid: entry.intuitTid ?? "",
      message: entry.message.slice(0, 2e3)
    });
    await db.delete(integrationLogs).where(lt(integrationLogs.createdAt, new Date(Date.now() - LOG_DAYS * 864e5)));
  } catch (error) {
    console.error("Couldn't save integration log", error);
  }
}
async function integrationErrorLog(provider) {
  const rows = await db.select().from(integrationLogs).where(and(eq(integrationLogs.provider, provider), gte(integrationLogs.createdAt, new Date(Date.now() - LOG_DAYS * 864e5)))).orderBy(desc(integrationLogs.id)).limit(5e3);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
async function disconnectIntegration(provider) {
  await db.delete(integrations).where(eq(integrations.provider, provider));
}
async function integrationStatus() {
  const rows = await db.select().from(integrations);
  const outbox = await db.select({ status: squareOutbox.status, n: sql`count(*)::int` }).from(squareOutbox).where(inArray(squareOutbox.status, ["pending", "error"])).groupBy(squareOutbox.status);
  const [lastError] = await db.select({ error: squareOutbox.error }).from(squareOutbox).where(eq(squareOutbox.status, "error")).orderBy(sql`${squareOutbox.id} desc`).limit(1);
  return PROVIDERS.map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    const scopes = String(row?.meta?.scopes ?? "");
    const inventory = provider === "square" ? {
      pending: outbox.find((o) => o.status === "pending")?.n ?? 0,
      failed: outbox.find((o) => o.status === "error")?.n ?? 0,
      lastError: lastError?.error ?? "",
      needsReconnect: Boolean(row?.accessToken) && !scopes.includes("INVENTORY_WRITE")
    } : null;
    return {
      inventory,
      provider,
      configured: isConfigured(provider),
      sandbox: isSandbox(provider),
      connected: Boolean(row?.accessToken),
      expired: !row?.accessToken && Boolean(row?.meta?.reconnect),
      accountName: row?.accountName ?? "",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      connectedAt: row?.connectedAt?.toISOString() ?? null
    };
  });
}
async function buildAuthorizeUrl(provider, origin) {
  const { id } = credentials(provider);
  const state = randomBytes(24).toString("hex");
  await saveIntegration(provider, { pendingState: state });
  const redirect = callbackUrl(origin, provider);
  if (provider === "square") {
    const params2 = new URLSearchParams({
      client_id: id,
      scope: SQUARE_SCOPES,
      session: "false",
      state,
      redirect_uri: redirect
    });
    return `${squareBase()}/oauth2/authorize?${params2}`;
  }
  const params = new URLSearchParams({
    client_id: id,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirect,
    state
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params}`;
}
class TokenError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
  code;
}
function isDeadGrant(error) {
  return error instanceof TokenError && (error.code === "invalid_grant" || error.code === "invalid_client");
}
async function requestSquareToken(body) {
  const { id, secret } = credentials("square");
  const res = await fetch(`${squareBase()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": SQUARE_VERSION },
    body: JSON.stringify({ client_id: id, client_secret: secret, ...body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const message = data.message || data.error_description || "Square rejected the request.";
    await logIntegrationError({ provider: "square", action: `token ${body.grant_type ?? ""}`.trim(), status: res.status, code: String(data.error ?? data.type ?? ""), message });
    throw new TokenError(message, String(data.error ?? data.type ?? ""));
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    accountId: data.merchant_id
  };
}
async function requestQuickBooksToken(body) {
  const { id, secret } = credentials("quickbooks");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams(body)
  });
  const data = await res.json().catch(() => ({}));
  const tid = res.headers.get("intuit_tid") ?? "";
  if (!res.ok || !data.access_token) {
    console.error(`QuickBooks token request failed (${res.status}) intuit_tid=${tid || "none"}`, data.error ?? "");
    await logIntegrationError({
      provider: "quickbooks",
      action: `token ${body.grant_type ?? ""}`.trim(),
      status: res.status,
      code: String(data.error ?? ""),
      intuitTid: tid,
      message: String(data.error_description || data.error || "Token request rejected")
    });
    throw new TokenError(
      `${String(data.error_description || data.error || "QuickBooks rejected the request.")}${tid ? ` (QuickBooks ref ${tid})` : ""}`,
      String(data.error ?? "")
    );
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? ""),
    expiresAt: new Date(Date.now() + (Number(data.expires_in) || 3600) * 1e3)
  };
}
class StateMismatchError extends Error {
  constructor() {
    super("That connection link expired. Start again from Settings.");
  }
}
async function completeAuthorization(provider, params, origin) {
  const row = await findIntegration(provider);
  if (!row?.pendingState || row.pendingState !== params.state) {
    throw new StateMismatchError();
  }
  const redirect = callbackUrl(origin, provider);
  if (provider === "square") {
    const tokens2 = await requestSquareToken({ code: params.code, grant_type: "authorization_code", redirect_uri: redirect });
    let accountName = "";
    if (tokens2.accountId) {
      const res2 = await fetch(`${squareBase()}/v2/merchants/${tokens2.accountId}`, {
        headers: { Authorization: `Bearer ${tokens2.accessToken}`, "Square-Version": SQUARE_VERSION }
      });
      const data = await res2.json().catch(() => ({}));
      accountName = data.merchant?.business_name ?? "";
    }
    await saveIntegration(provider, {
      accessToken: tokens2.accessToken,
      refreshToken: tokens2.refreshToken,
      expiresAt: tokens2.expiresAt,
      accountId: tokens2.accountId ?? "",
      accountName,
      pendingState: "",
      connectedAt: /* @__PURE__ */ new Date(),
      // Only sales from now on; history before connecting was already counted by hand.
      lastSyncAt: /* @__PURE__ */ new Date(),
      meta: { scopes: SQUARE_SCOPES }
    });
    return;
  }
  if (!params.realmId) throw new Error("QuickBooks didn't say which company to connect.");
  const { reconnect: _r, ...keptMeta } = row.meta ?? {};
  const meta = row.accountId === params.realmId ? keptMeta : {};
  const tokens = await requestQuickBooksToken({ grant_type: "authorization_code", code: params.code, redirect_uri: redirect });
  const res = await fetch(
    `${quickbooksApiBase()}/v3/company/${params.realmId}/companyinfo/${params.realmId}?minorversion=${QB_MINOR_VERSION}`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" } }
  );
  const info = await res.json().catch(() => ({}));
  await saveIntegration(provider, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    accountId: params.realmId,
    accountName: info.CompanyInfo?.CompanyName ?? "",
    pendingState: "",
    connectedAt: /* @__PURE__ */ new Date(),
    meta
  });
}
const PROVIDER_NAME = { square: "Square", quickbooks: "QuickBooks" };
async function markNeedsReconnect(row) {
  await logIntegrationError({ provider: row.provider, action: "token refresh", code: "invalid_grant", message: "Refresh token rejected; tokens cleared, asked to reconnect" });
  await saveIntegration(row.provider, {
    accessToken: "",
    refreshToken: "",
    expiresAt: null,
    meta: { ...row.meta ?? {}, reconnect: true }
  });
  return new Error(`${PROVIDER_NAME[row.provider]} needs to be reconnected. Open Settings → Integrations and tap Connect.`);
}
async function refreshTokens(row) {
  const provider = row.provider;
  try {
    const tokens = provider === "square" ? await requestSquareToken({ grant_type: "refresh_token", refresh_token: row.refreshToken }) : await requestQuickBooksToken({ grant_type: "refresh_token", refresh_token: row.refreshToken });
    const updated = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || row.refreshToken,
      expiresAt: tokens.expiresAt
    };
    await saveIntegration(provider, updated);
    return { ...row, ...updated };
  } catch (error) {
    if (!isDeadGrant(error)) throw error;
    const latest = await findIntegration(provider);
    if (latest?.accessToken && latest.refreshToken && latest.refreshToken !== row.refreshToken) return latest;
    throw await markNeedsReconnect(row);
  }
}
async function activeIntegration(provider) {
  const row = await findIntegration(provider);
  if (!row?.accessToken) {
    if (row?.meta?.reconnect)
      throw new Error(`${PROVIDER_NAME[provider]} needs to be reconnected. Open Settings → Integrations and tap Connect.`);
    throw new Error(`${PROVIDER_NAME[provider]} isn't connected.`);
  }
  const expiring = row.expiresAt && row.expiresAt.getTime() - Date.now() < 5 * 6e4;
  if (!expiring || !row.refreshToken) return row;
  return refreshTokens(row);
}
async function squareFetch(token, path, init = {}) {
  const res = await fetch(`${squareBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
      ...init.headers ?? {}
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.errors?.[0];
    await logIntegrationError({ provider: "square", action: `${init.method ?? "GET"} ${path.split("?")[0]}`, status: res.status, code: e?.code ?? "", message: e?.detail || `HTTP ${res.status}` });
    throw new Error(e?.detail || `Square returned ${res.status}.`);
  }
  return data;
}
async function listSquareCategoryObjects(token) {
  const out = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ types: "CATEGORY" });
    if (cursor) params.set("cursor", cursor);
    const page = await squareFetch(token, `/v2/catalog/list?${params}`);
    for (const o of page.objects ?? []) if (!o.is_deleted) out.push({ id: o.id, name: o.category_data?.name ?? "" });
    cursor = page.cursor ?? "";
  } while (cursor && out.length < 5e3);
  return out.filter((c) => c.name).sort((a, b) => a.name.localeCompare(b.name));
}
const RETAIL_NAME = /retail|resale|take.?home|merch/i;
async function squareRetailCategories() {
  const row = await activeIntegration("square");
  const categories = await listSquareCategoryObjects(row.accessToken);
  const saved = row.meta.retailCategoryIds;
  const selected = new Set(saved ?? categories.filter((c) => RETAIL_NAME.test(c.name)).map((c) => c.id));
  return { chosen: Boolean(saved), categories: categories.map((c) => ({ ...c, retail: selected.has(c.id) })) };
}
async function saveSquareRetailCategories(ids) {
  const row = await activeIntegration("square");
  await saveIntegration("square", { meta: { ...row.meta ?? {}, retailCategoryIds: Array.from(new Set(ids)).slice(0, 500) } });
  return squareRetailCategories();
}
async function importSquareCatalog() {
  const row = await activeIntegration("square");
  const objects = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ types: "ITEM,CATEGORY" });
    if (cursor) params.set("cursor", cursor);
    const page = await squareFetch(row.accessToken, `/v2/catalog/list?${params}`);
    objects.push(...page.objects ?? []);
    cursor = page.cursor ?? "";
  } while (cursor && objects.length < 2e4);
  const categoryNames = new Map(
    objects.filter((o) => o.type === "CATEGORY").map((o) => [o.id, o.category_data?.name ?? ""])
  );
  const savedRetail = row.meta.retailCategoryIds;
  const retailIds = new Set(
    savedRetail ?? [...categoryNames].filter(([, name]) => RETAIL_NAME.test(name)).map(([id]) => id)
  );
  if (retailIds.size === 0) {
    throw new Error("Choose which Square categories are retail first, so only those items come into Bintro.");
  }
  const known = new Set((await findProductCategories()).map((c) => c.name.toLowerCase()));
  const newCategories = [...retailIds].map((id) => categoryNames.get(id) ?? "").filter((name) => name && !known.has(name.toLowerCase()));
  if (newCategories.length) await upsertProductCategories(newCategories.map((name) => ({ name, taxGroup: "resale" })));
  let skipped = 0;
  const existing = await db.select().from(products);
  const byVariation = new Map(existing.filter((p) => p.squareVariationId).map((p) => [p.squareVariationId, p]));
  let created = 0;
  let updated = 0;
  const newlyCreated = [];
  const linkedExisting = [];
  for (const item of objects) {
    if (item.type !== "ITEM" || item.is_deleted || !item.item_data) continue;
    const data = item.item_data;
    const itemCategoryIds = [...(data.categories ?? []).map((c) => c.id), data.category_id ?? ""].filter(Boolean);
    const retailCategoryId = itemCategoryIds.find((id) => retailIds.has(id));
    if (!retailCategoryId) {
      skipped++;
      continue;
    }
    const category = categoryNames.get(retailCategoryId) ?? "";
    const variations = (data.variations ?? []).filter((v) => !v.is_deleted);
    for (const v of variations) {
      const vd = v.item_variation_data ?? {};
      const variantName = vd.name && !/^regular$/i.test(vd.name) && variations.length > 1 ? ` ${vd.name}` : "";
      const name = `${data.name ?? "Square item"}${variantName}`.trim().slice(0, 160);
      const barcode = (vd.upc || vd.sku || `SQ-${v.id}`).trim().slice(0, 64);
      const price = Number(vd.price_money?.amount ?? 0) || 0;
      const match = byVariation.get(v.id) ?? await findProductByBarcode(barcode);
      if (match) {
        await db.update(products).set({
          squareVariationId: v.id,
          retailPriceCents: price || match.retailPriceCents,
          category: match.category || category,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(products.id, match.id));
        linkedExisting.push({ id: match.id, variationId: v.id, qty: match.qty });
        updated++;
      } else {
        const [row2] = await db.insert(products).values({ barcode, name, category, retailPriceCents: price, squareVariationId: v.id }).returning({ id: products.id });
        if (row2) newlyCreated.push({ id: row2.id, variationId: v.id });
        created++;
      }
    }
  }
  let countsSent = 0;
  let countsPulled = 0;
  const scopes = String(row.meta.scopes ?? "");
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
          linkedExisting.map((p) => ({ productId: p.id, variationId: p.variationId, kind: "count", quantity: Math.max(0, p.qty) }))
        );
        countsSent = (await flushSquareOutbox()).sent;
      }
    } catch (error) {
      console.error("Square count alignment failed", error);
    }
  }
  return { created, updated, skipped, countsSent, countsPulled };
}
async function syncSquareSales() {
  const row = await activeIntegration("square");
  const { locations = [] } = await squareFetch(
    row.accessToken,
    "/v2/locations"
  );
  const locationIds = locations.filter((l) => l.status !== "INACTIVE").map((l) => l.id).slice(0, 10);
  if (locationIds.length === 0) return { sales: 0, units: 0, skipped: 0 };
  const since = row.lastSyncAt ?? row.connectedAt ?? new Date(Date.now() - 864e5);
  const mapped = await db.select({ id: products.id, variation: products.squareVariationId }).from(products);
  const productByVariation = new Map(mapped.filter((p) => p.variation).map((p) => [p.variation, p.id]));
  let cursor = "";
  let latest = since;
  let sales = 0;
  let units = 0;
  let skipped = 0;
  do {
    const page = await squareFetch(row.accessToken, "/v2/orders/search", {
      method: "POST",
      body: JSON.stringify({
        location_ids: locationIds,
        cursor: cursor || void 0,
        limit: 200,
        query: {
          filter: {
            state_filter: { states: ["COMPLETED"] },
            date_time_filter: { closed_at: { start_at: since.toISOString() } }
          },
          sort: { sort_field: "CLOSED_AT", sort_order: "ASC" }
        }
      })
    });
    for (const order of page.orders ?? []) {
      const closed = order.closed_at ? new Date(order.closed_at) : null;
      if (!closed || closed <= since) continue;
      if (closed > latest) latest = closed;
      sales++;
      for (const line of order.line_items ?? []) {
        const qty = Math.round(Number(line.quantity ?? 0));
        const productId = line.catalog_object_id ? productByVariation.get(line.catalog_object_id) : void 0;
        if (!productId || qty <= 0) {
          skipped++;
          continue;
        }
        await applyMovement({
          productId,
          type: "out",
          delta: -qty,
          staffName: SQUARE_STAFF_NAME,
          note: `Square sale ${order.id}`
        });
        units += qty;
      }
    }
    cursor = page.cursor ?? "";
  } while (cursor);
  await saveIntegration("square", { lastSyncAt: latest });
  return { sales, units, skipped };
}
async function syncSquareSalesIfConnected() {
  const row = await findIntegration("square");
  if (!row?.accessToken || !isConfigured("square")) return null;
  const sales = await syncSquareSales();
  const pushed = await flushSquareOutbox().catch((error) => {
    console.error("Square inventory push failed", error);
    return null;
  });
  return { ...sales, pushed };
}
async function squareLocationId(row) {
  const cached = row.meta.locationId;
  if (cached) return cached;
  const { locations = [] } = await squareFetch(
    row.accessToken,
    "/v2/locations"
  );
  const id = locations.find((l) => l.status !== "INACTIVE")?.id ?? "";
  if (!id) throw new Error("Square has no active location to keep stock for.");
  await saveIntegration("square", { meta: { ...row.meta ?? {}, locationId: id } });
  return id;
}
function toSquareChange(r, locationId) {
  const occurred_at = r.occurredAt.toISOString();
  if (r.kind === "count") {
    return {
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: r.variationId,
        location_id: locationId,
        state: "IN_STOCK",
        quantity: String(Math.max(0, r.quantity)),
        occurred_at
      }
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
      occurred_at
    }
  };
}
async function sendSquareChanges(token, rows, locationId) {
  const idempotency_key = `bintro-${rows.map((r) => r.id).join("-")}`.slice(0, 128);
  const res = await fetch(`${squareBase()}/v2/inventory/changes/batch-create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotency_key,
      ignore_unchanged_counts: true,
      changes: rows.map((r) => toSquareChange(r, locationId))
    })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, message: data.errors?.[0]?.detail || data.errors?.[0]?.code || `Square returned ${res.status}.` };
}
async function flushSquareOutbox() {
  const pending = await db.select().from(squareOutbox).where(eq(squareOutbox.status, "pending")).orderBy(asc(squareOutbox.id)).limit(500);
  if (pending.length === 0) return { sent: 0, failed: 0 };
  const row = await findIntegration("square");
  if (!row?.accessToken || !isConfigured("square")) return { sent: 0, failed: 0 };
  const active = await activeIntegration("square");
  const locationId = await squareLocationId(active);
  let sent = 0;
  let failed = 0;
  const markSent = async (ids) => {
    await db.update(squareOutbox).set({ status: "sent", error: "", sentAt: /* @__PURE__ */ new Date() }).where(inArray(squareOutbox.id, ids));
    sent += ids.length;
  };
  const markFailed = async (ids, message, final) => {
    await db.update(squareOutbox).set({ status: final ? "error" : "pending", error: message.slice(0, 500), attempts: sql`${squareOutbox.attempts} + 1` }).where(inArray(squareOutbox.id, ids));
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
async function sendAllCountsToSquare() {
  await activeIntegration("square");
  await syncSquareSales();
  const linked = await db.select().from(products).where(sql`${products.squareVariationId} is not null and ${products.squareVariationId} <> ''`);
  if (linked.length === 0) return { queued: 0, sent: 0, failed: 0 };
  await db.delete(squareOutbox).where(eq(squareOutbox.status, "pending"));
  await db.insert(squareOutbox).values(
    linked.map((p) => ({ productId: p.id, variationId: p.squareVariationId, kind: "count", quantity: Math.max(0, p.qty) }))
  );
  const result = await flushSquareOutbox();
  return { queued: linked.length, ...result };
}
async function fetchSquareCounts(row, variationIds) {
  const counts = /* @__PURE__ */ new Map();
  if (variationIds.length === 0) return counts;
  const locationId = await squareLocationId(row);
  for (let i = 0; i < variationIds.length; i += 500) {
    let cursor = "";
    do {
      const page = await squareFetch(
        row.accessToken,
        "/v2/inventory/counts/batch-retrieve",
        {
          method: "POST",
          body: JSON.stringify({
            catalog_object_ids: variationIds.slice(i, i + 500),
            location_ids: [locationId],
            states: ["IN_STOCK"],
            cursor: cursor || void 0
          })
        }
      );
      for (const c of page.counts ?? []) counts.set(c.catalog_object_id, Math.round(Number(c.quantity ?? 0)));
      cursor = page.cursor ?? "";
    } while (cursor);
  }
  return counts;
}
async function qbFetch(row, path, init = {}, retried = false) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${quickbooksApiBase()}/v3/company/${row.accountId}${path}${sep}minorversion=${QB_MINOR_VERSION}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${row.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers ?? {}
    }
  });
  const tid = res.headers.get("intuit_tid") ?? "";
  if (res.status === 401 && !retried) {
    console.warn(`QuickBooks 401 on ${init.method ?? "GET"} ${path.split("?")[0]} intuit_tid=${tid || "none"}; refreshing`);
    if (!row.refreshToken) throw await markNeedsReconnect(row);
    const fresh = await refreshTokens(row);
    Object.assign(row, { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken, expiresAt: fresh.expiresAt });
    return qbFetch(row, path, init, true);
  }
  if (res.status === 401) {
    await logIntegrationError({ provider: "quickbooks", action: `${init.method ?? "GET"} ${path.split("?")[0]}`, status: 401, intuitTid: tid, message: "Still unauthorized after refresh; asked to reconnect" });
    throw await markNeedsReconnect(row);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.Fault) {
    const err = data.Fault?.Error?.[0];
    console.error(
      `QuickBooks ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}${err?.code ? `, code ${err.code}` : ""}) intuit_tid=${tid || "none"}`,
      err?.Detail || err?.Message || ""
    );
    await logIntegrationError({
      provider: "quickbooks",
      action: `${init.method ?? "GET"} ${path.split("?")[0]}`,
      status: res.status,
      code: err?.code ?? "",
      intuitTid: tid,
      message: [err?.Message, err?.Detail].filter(Boolean).join(" — ") || `HTTP ${res.status}`
    });
    throw new Error(`${err?.Detail || err?.Message || `QuickBooks returned ${res.status}.`}${tid ? ` (QuickBooks ref ${tid})` : ""}`);
  }
  return data;
}
async function qbFirstAccount(row, where) {
  const query = encodeURIComponent(`select Id, Name from Account where ${where} and Active = true MAXRESULTS 1`);
  const data = await qbFetch(row, `/query?query=${query}`);
  return data.QueryResponse?.Account?.[0] ?? null;
}
async function qbAccounts(row) {
  const meta = row.meta ?? {};
  if (meta.bankAccountId && meta.expenseAccountId && meta.cogsAccountId) return meta;
  const bank = await qbFirstAccount(row, "AccountType = 'Bank'") ?? await qbFirstAccount(row, "AccountType = 'Credit Card'");
  const expense = await qbFirstAccount(row, "AccountType = 'Expense' and Name like '%Supplies%'") ?? await qbFirstAccount(row, "AccountType = 'Expense'");
  const cogs = await qbFirstAccount(row, "AccountType = 'Cost of Goods Sold'") ?? expense;
  if (!bank || !expense || !cogs) {
    throw new Error("QuickBooks needs at least one bank account and one expense account set up.");
  }
  const next = { ...meta, bankAccountId: bank.Id, expenseAccountId: expense.Id, cogsAccountId: cogs.Id };
  await saveIntegration("quickbooks", { meta: next });
  return next;
}
async function qbCreatePurchase(row, p) {
  const data = await qbFetch(row, "/purchase", {
    method: "POST",
    body: JSON.stringify({
      PaymentType: "Cash",
      AccountRef: { value: p.bankAccountId },
      TxnDate: p.date,
      PrivateNote: p.memo.slice(0, 4e3),
      Line: [
        {
          DetailType: "AccountBasedExpenseLineDetail",
          Amount: p.cents / 100,
          Description: p.description.slice(0, 4e3),
          AccountBasedExpenseLineDetail: { AccountRef: { value: p.accountId } }
        }
      ]
    })
  });
  return data.Purchase?.Id ?? "";
}
function isStaleAccount(error) {
  return error instanceof Error && /invalid reference|inactive|deleted|object not found|does not exist/i.test(error.message);
}
async function pushMonthToQuickBooks(window) {
  let row = await activeIntegration("quickbooks");
  let accounts = await qbAccounts(row);
  row = { ...row, meta: accounts };
  const send = async (kind, p) => {
    const attempt = () => qbCreatePurchase(row, {
      ...p,
      bankAccountId: accounts.bankAccountId,
      accountId: kind === "cogs" ? accounts.cogsAccountId : accounts.expenseAccountId
    });
    try {
      return await attempt();
    } catch (error) {
      if (!isStaleAccount(error)) throw error;
      const { bankAccountId: _b, expenseAccountId: _e, cogsAccountId: _c, ...rest } = accounts;
      accounts = await qbAccounts({ ...row, meta: rest });
      row = { ...row, meta: accounts };
      return attempt();
    }
  };
  let sentExpenses = 0;
  for (const e of await findExpensesForMonth(window.key)) {
    if (e.quickbooksId || e.amountCents <= 0) continue;
    const id = await send(/inventory|stock/i.test(e.category) ? "cogs" : "expense", {
      date: e.spentOn,
      cents: e.amountCents,
      description: [e.category, e.vendor, e.note].filter(Boolean).join(" · ") || "Expense",
      memo: `Logged in Bintro${e.staffName ? ` by ${e.staffName}` : ""}`
    });
    await db.update(expenses).set({ quickbooksId: id }).where(eq(expenses.id, e.id));
    sentExpenses++;
  }
  let sentVendors = 0;
  const monthClosed = new Date(window.end).getTime() <= Date.now();
  if (monthClosed) {
    const pushed = { ...accounts.pushedInventory ?? {} };
    const lastDay = new Date(new Date(window.end).getTime() - 1);
    const date = `${window.key}-${String(lastDay.getDate()).padStart(2, "0")}`;
    for (const v of await inventorySpend(new Date(window.start), new Date(window.end))) {
      const key = `${window.key}|${v.vendor}`;
      const cents = Number(v.cents);
      if (pushed[key] || cents <= 0) continue;
      pushed[key] = await send("cogs", {
        date,
        cents,
        description: `Inventory received from ${v.vendor} (${Number(v.units)} units)`,
        memo: `Stock scanned in with Bintro during ${window.key}`
      });
      await saveIntegration("quickbooks", { meta: { ...accounts, pushedInventory: pushed } });
      sentVendors++;
    }
  }
  await saveIntegration("quickbooks", { lastSyncAt: /* @__PURE__ */ new Date() });
  return { sentExpenses, sentVendors, monthClosed };
}
export {
  PROVIDERS,
  StateMismatchError,
  buildAuthorizeUrl,
  callbackUrl,
  completeAuthorization,
  disconnectIntegration,
  flushSquareOutbox,
  importSquareCatalog,
  integrationErrorLog,
  integrationStatus,
  isConfigured,
  logIntegrationError,
  pushMonthToQuickBooks,
  saveSquareRetailCategories,
  sendAllCountsToSquare,
  squareRetailCategories,
  syncSquareSales,
  syncSquareSalesIfConnected
};
