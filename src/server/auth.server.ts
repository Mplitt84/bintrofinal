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
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
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

/** Finds (or, for the owner email, creates) the user for a Google account. Throws "not-allowed". */
export async function userForGoogle(profile: GoogleProfile) {
  let [user] = await db.select().from(appUsers).where(eq(appUsers.email, profile.email));
  if (!user && profile.email === ownerEmail()) {
    [user] = await db
      .insert(appUsers)
      .values({ email: profile.email, name: profile.name, role: "owner", addedBy: "BINTRO_OWNER_EMAIL" })
      .onConflictDoNothing()
      .returning();
    user ??= (await db.select().from(appUsers).where(eq(appUsers.email, profile.email)))[0];
  }
  if (!user) throw new Error("not-allowed");
  // Once linked, the email must keep belonging to the same Google account.
  if (user.googleSub && user.googleSub !== profile.sub) throw new Error("not-allowed");
  await db
    .update(appUsers)
    .set({ googleSub: profile.sub, name: user.name || profile.name, lastSignInAt: new Date() })
    .where(eq(appUsers.id, user.id));
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

/** The signed-in user for a session token, or null. */
export async function userForToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const [row] = await db
    .select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, role: appUsers.role })
    .from(appSessions)
    .innerJoin(appUsers, eq(appUsers.id, appSessions.userId))
    .where(and(eq(appSessions.tokenHash, sha256(token)), gt(appSessions.expiresAt, new Date())));
  return row ? { ...row, role: row.role === "owner" ? "owner" : "staff" } : null;
}

export async function endSession(token: string | undefined) {
  if (token) await db.delete(appSessions).where(eq(appSessions.tokenHash, sha256(token)));
}

// ---------------------------------------------------------------------------
// Access list
// ---------------------------------------------------------------------------

export async function listUsers() {
  const rows = await db.select().from(appUsers).orderBy(asc(appUsers.createdAt));
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === "owner" ? ("owner" as const) : ("staff" as const),
    lastSignInAt: u.lastSignInAt?.toISOString() ?? null,
  }));
}

export async function addUser(email: string, role: "owner" | "staff", addedBy: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That doesn't look like an email address.");
  await db
    .insert(appUsers)
    .values({ email: clean, role, addedBy })
    .onConflictDoUpdate({ target: appUsers.email, set: { role } });
}

export async function removeUser(id: number, actingUserId: number) {
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

/**
 * For server routes: who is signed in, or "open" while sign-in is off.
 * Returns null when sign-in is on and nobody (valid) is signed in.
 */
export async function routeUser(request: Request): Promise<AuthUser | "open" | null> {
  if (!authEnabled()) return "open";
  return userForToken(readCookie(request, SESSION_COOKIE));
}
