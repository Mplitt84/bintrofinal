/**
 * Sign in with Google. Server-only.
 *
 * Only emails on the access list (app_users) can sign in; the first sign-in by
 * BINTRO_OWNER_EMAIL creates the owner. Bintro stores no passwords: Google checks
 * the password and its 2-Step Verification. Sessions are a random token in an
 * httpOnly cookie; the database keeps only its SHA-256.
 *
 * Until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set, sign-in is off and the
 * app stays open as before (so a deploy never locks the business out).
 */
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { DEFAULT_BUSINESS_ID, businessId, mine } from "./tenant.js";
import { createBusinessForOwner, signupOpen } from "./signup.server.js";
import { claimInvite, hasOpenInvite, recordClaim, recordRefusedSignIn } from "./pilot.server.js";
import { appSessions, appUsers } from "../../db/schema.js";
import type { AuthUser } from "../lib/auth.js";

export const SESSION_COOKIE = "bintro_session";
export const OAUTH_COOKIE = "bintro_google";
const SESSION_DAYS = 30;

const env = (name: string) => process.env[name]?.trim() ?? "";
const googleId = () => env("GOOGLE_CLIENT_ID");
const googleSecret = () => env("GOOGLE_CLIENT_SECRET");
export const ownerEmail = () => env("BINTRO_OWNER_EMAIL").toLowerCase();

/** Sign-in is on once the Google keys are set. */
export function authEnabled() {
  return Boolean(googleId() && googleSecret());
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const b64url = (buf: Buffer) => buf.toString("base64url");

export function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}

/** Reads one cookie from a raw request (for server routes). */
export function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// ---------------------------------------------------------------------------
// Google OAuth (authorization code + PKCE)
// ---------------------------------------------------------------------------

export function googleCallbackUrl(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

/** Returns Google's sign-in URL and the short-lived cookie value that proves the callback is ours. */
export function startGoogleSignIn(origin: string) {
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
    prompt: "select_account",
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    cookie: [state, nonce, verifier].join("."),
  };
}

type GoogleProfile = { sub: string; email: string; name: string };

/** Exchanges the code and returns the verified Google account. Throws a short reason code on failure. */
export async function finishGoogleSignIn(origin: string, params: { code: string; state: string }, cookie: string | undefined) {
  const [state, nonce, verifier] = (cookie ?? "").split(".");
  // CSRF: the state must match the one we set in this browser.
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
      code_verifier: verifier,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !data.id_token) {
    console.error("Google token exchange failed", res.status, data.error);
    throw new Error("google");
  }
  // Received straight from Google over TLS, so the token's claims can be read directly.
  const claims = JSON.parse(Buffer.from(data.id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    nonce?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== googleId() || !claims.exp || claims.exp * 1000 < Date.now() || claims.nonce !== nonce) {
    throw new Error("google");
  }
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error("unverified");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name ?? "" } satisfies GoogleProfile;
}

/**
 * Sign-in looks across every business on purpose: the email is how Bintro works out
 * which business this person belongs to. Everything after sign-in is scoped to that
 * business by the middleware.
 */
const signInLookup = sql`/* cross-business: sign-in */ true`;

/** Finds (or, for the owner email, creates) the user for a Google account. Throws "not-allowed". */
export async function userForGoogle(profile: GoogleProfile) {
  let [user] = await db.select().from(appUsers).where(and(signInLookup, eq(appUsers.email, profile.email)));
  if (!user && profile.email === ownerEmail()) {
    [user] = await db
      .insert(appUsers)
      .values({ businessId: DEFAULT_BUSINESS_ID, email: profile.email, name: profile.name, role: "owner", addedBy: "BINTRO_OWNER_EMAIL" })
      .onConflictDoNothing()
      .returning();
    user ??= (await db.select().from(appUsers).where(and(signInLookup, eq(appUsers.email, profile.email))))[0];
  }
  // An invited pilot tester's first sign-in: a brand-new business of their own.
  if (!user && (await claimInvite(profile.email))) {
    try {
      user = await createBusinessForOwner(profile, "pilot invite");
      await recordClaim(profile.email, user.businessId);
    } catch (error) {
      await recordClaim(profile.email, null);
      throw error;
    }
  }
  // Nobody by that email yet: start them a business of their own, when sign-up is open.
  if (!user && signupOpen()) user = await createBusinessForOwner(profile);
  if (!user) {
    await recordRefusedSignIn(profile, ownerEmail());
    throw new Error("not-allowed");
  }
  // Once linked, the email must keep belonging to the same Google account.
  if (user.googleSub && user.googleSub !== profile.sub) throw new Error("not-allowed");
  // The owner email (BINTRO_OWNER_EMAIL) is always an owner of the main business, even
  // if it was added as staff first; changing the variable is how ownership is handed over.
  if (profile.email === ownerEmail() && user.businessId === DEFAULT_BUSINESS_ID && user.role !== "owner") {
    await db
      .update(appUsers)
      .set({ role: "owner" })
      .where(and(eq(appUsers.businessId, user.businessId), eq(appUsers.id, user.id)));
    user = { ...user, role: "owner" };
  }
  await db
    .update(appUsers)
    .set({ googleSub: profile.sub, name: user.name || profile.name, lastSignInAt: new Date() })
    .where(and(eq(appUsers.businessId, user.businessId), eq(appUsers.id, user.id)));
  return user;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(userId: number, userAgent: string) {
  const token = b64url(randomBytes(32));
  await db.insert(appSessions).values({
    tokenHash: sha256(token),
    userId,
    userAgent: userAgent.slice(0, 300),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  await db.delete(appSessions).where(lt(appSessions.expiresAt, new Date()));
  return { token, maxAge: SESSION_DAYS * 86_400 };
}

/** A signed-in person, plus the business their session belongs to (server-only). */
export type SessionUser = AuthUser & { businessId: number };

/** The signed-in user for a session token, or null. */
export async function userForToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await db
    .select({
      id: appUsers.id,
      email: appUsers.email,
      name: appUsers.name,
      role: appUsers.role,
      teamName: appUsers.teamName,
      remindersOn: appUsers.remindersOn,
      businessId: appUsers.businessId,
    })
    .from(appSessions)
    .innerJoin(appUsers, eq(appUsers.id, appSessions.userId))
    .where(and(signInLookup, eq(appSessions.tokenHash, sha256(token)), gt(appSessions.expiresAt, new Date())));
  return row ? { ...row, role: row.role === "owner" ? "owner" : "staff" } : null;
}

export async function endSession(token: string | undefined) {
  if (token) await db.delete(appSessions).where(eq(appSessions.tokenHash, sha256(token)));
}

// ---------------------------------------------------------------------------
// Access list
// ---------------------------------------------------------------------------

export async function listUsers() {
  const rows = await db.select().from(appUsers).where(mine(appUsers)).orderBy(asc(appUsers.createdAt));
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === "owner" ? ("owner" as const) : ("staff" as const),
    teamName: u.teamName,
    remindersOn: u.remindersOn,
    lastSignInAt: u.lastSignInAt?.toISOString() ?? null,
  }));
}

/** Owner: change someone's role or which team member they are. Keeps at least one owner. */
export async function updateUser(id: number, patch: { role?: "owner" | "staff"; teamName?: string }) {
  const [target] = await db.select().from(appUsers).where(and(mine(appUsers), eq(appUsers.id, id)));
  if (!target) throw new Error("That person isn't on the list any more.");
  if (patch.role === "staff" && target.role === "owner") {
    const owners = await db.select({ id: appUsers.id }).from(appUsers).where(and(mine(appUsers), eq(appUsers.role, "owner")));
    if (owners.length <= 1) throw new Error("Keep at least one owner.");
  }
  const set: Partial<typeof appUsers.$inferInsert> = {};
  if (patch.role) set.role = patch.role;
  if (patch.teamName !== undefined) set.teamName = patch.teamName.trim().slice(0, 60);
  if (Object.keys(set).length) await db.update(appUsers).set(set).where(and(mine(appUsers), eq(appUsers.id, id)));
}

/** The signed-in person turns their own opening / closing pop-ups on or off. */
export async function setOwnReminders(id: number, on: boolean) {
  await db.update(appUsers).set({ remindersOn: on }).where(and(mine(appUsers), eq(appUsers.id, id)));
}

export async function addUser(email: string, role: "owner" | "staff", addedBy: string, teamName = "") {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That doesn't look like an email address.");
  // Emails are unique across all of Bintro. Never touch someone who belongs to another
  // business, and never pull an invited pilot tester into this one: they get their own.
  const [existing] = await db
    .select({ id: appUsers.id, businessId: appUsers.businessId })
    .from(appUsers)
    .where(and(signInLookup, eq(appUsers.email, clean)));
  if (existing && existing.businessId !== businessId()) throw new Error(CANT_ADD);
  if (!existing && (await hasOpenInvite(clean))) throw new Error(CANT_ADD);
  const team = teamName.trim().slice(0, 60);
  if (existing) {
    await db.update(appUsers).set({ role, ...(team ? { teamName: team } : {}) }).where(and(mine(appUsers), eq(appUsers.id, existing.id)));
    return;
  }
  await db.insert(appUsers).values({ businessId: businessId(), email: clean, role, addedBy, teamName: team, name: team });
}

const CANT_ADD = "That email can't be added here. It may already be set up with Bintro somewhere else.";

/** The person who runs this Bintro site (BINTRO_OWNER_EMAIL, owner of business 1). Only they manage pilot invites. */
export function isSiteOwner(user: { email: string; role: string; businessId: number } | null) {
  return Boolean(
    user && ownerEmail() && user.email === ownerEmail() && user.role === "owner" && user.businessId === DEFAULT_BUSINESS_ID,
  );
}

export async function removeUser(id: number, actingUserId: number) {
  if (id === actingUserId) throw new Error("You can't remove yourself.");
  const [target] = await db.select().from(appUsers).where(and(mine(appUsers), eq(appUsers.id, id)));
  if (!target) return;
  if (target.role === "owner") {
    const owners = await db.select({ id: appUsers.id }).from(appUsers).where(and(mine(appUsers), eq(appUsers.role, "owner")));
    if (owners.length <= 1) throw new Error("Keep at least one owner.");
  }
  await db.delete(appSessions).where(eq(appSessions.userId, id));
  await db.delete(appUsers).where(and(mine(appUsers), eq(appUsers.id, id)));
}

/**
 * For server routes: who is signed in, or "open" while sign-in is off.
 * Returns null when sign-in is on and nobody (valid) is signed in.
 */
export async function routeUser(request: Request): Promise<SessionUser | "open" | null> {
  if (!authEnabled()) return "open";
  return userForToken(readCookie(request, SESSION_COOKIE));
}

/** The business behind a signed-in route request ("open" = sign-in is off, so business 1). */
export function businessForRoute(who: SessionUser | "open") {
  return who === "open" ? DEFAULT_BUSINESS_ID : who.businessId;
}
