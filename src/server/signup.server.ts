/**
 * Starting a new business on Bintro (server-only).
 *
 * Sign-up is **off unless BINTRO_SIGNUP_OPEN is "true"**. With it off, Bintro
 * behaves exactly as before: only emails already on a business's access list can
 * sign in, and the pilot stays invite-only. Turning it on is a deliberate act by
 * whoever owns the deployment, not something a deploy decides.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appUsers, businessProfile, businesses } from "../../db/schema.js";
import { EMPTY_PROFILE } from "../lib/business-types.js";
import { DEFAULT_BUSINESS_ID, runForBusiness } from "./tenant.js";

const env = (name: string) => process.env[name]?.trim() ?? "";

/** True when anyone with a Google account may start their own business here. */
export function signupOpen() {
  return env("BINTRO_SIGNUP_OPEN").toLowerCase() === "true";
}

/**
 * Creates a business and makes this person its owner, in one go: the business
 * itself, an empty profile for it, and the first entry on its access list. The
 * profile is left unnamed on purpose — the welcome screen asks for the name, and
 * an unnamed profile is how the app knows to show it.
 */
export async function createBusinessForOwner(profile: { email: string; name: string; sub: string }) {
  const [created] = await db
    .insert(businesses)
    .values({ name: "", createdByEmail: profile.email })
    .returning();
  const businessId = created.id;

  return runForBusiness(businessId, async () => {
    await db
      .insert(businessProfile)
      .values({ ...EMPTY_PROFILE, businessId, id: businessId })
      .onConflictDoNothing();
    const [user] = await db
      .insert(appUsers)
      .values({
        businessId,
        email: profile.email,
        name: profile.name,
        role: "owner",
        googleSub: profile.sub,
        addedBy: "signed up",
        lastSignInAt: new Date(),
      })
      .returning();
    return user;
  });
}

/**
 * Whether this business still needs the welcome screen: it signed itself up and
 * has not told Bintro its name yet.
 *
 * The original deployment (business 1) is never asked, however its profile reads.
 * It was set up by hand long before sign-up existed, and a blank name there means
 * "not filled in", not "brand new" — nobody should be shown a welcome screen on a
 * salon they have been running for months.
 */
export async function needsWelcome(businessId: number) {
  if (businessId === DEFAULT_BUSINESS_ID) return false;
  const rows = await db
    .select({ name: businessProfile.name })
    .from(businessProfile)
    .where(and(sql`/* cross-business: welcome check */ true`, eq(businessProfile.businessId, businessId)));
  return (rows[0]?.name ?? "").trim() === "";
}
