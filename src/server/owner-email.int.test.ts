/**
 * Handing over ownership: whoever BINTRO_OWNER_EMAIL names becomes an owner of the main
 * business on sign-in, even if they were added as staff first.
 * Needs a real database, so it skips unless NETLIFY_DB_URL is set.
 */
import { afterAll, describe, expect, it } from "vitest";

const live = Boolean(process.env.NETLIFY_DB_URL);
const maybe = live ? describe : describe.skip;

maybe("owner email", () => {
  const email = `owner-handover-${Date.now()}@example.com`;
  const before = process.env.BINTRO_OWNER_EMAIL;

  afterAll(async () => {
    const { db } = await import("../../db/index.js");
    const schema = await import("../../db/schema.js");
    const { and, eq } = await import("drizzle-orm");
    await db.delete(schema.appUsers).where(and(eq(schema.appUsers.businessId, 1), eq(schema.appUsers.email, email)));
    if (before === undefined) delete process.env.BINTRO_OWNER_EMAIL;
    else process.env.BINTRO_OWNER_EMAIL = before;
  });

  it("promotes a staff login to owner once it is the owner email", async () => {
    const { db } = await import("../../db/index.js");
    const schema = await import("../../db/schema.js");
    const auth = await import("./auth.server.js");
    await db.insert(schema.appUsers).values({ businessId: 1, email, name: "Hello", role: "staff", addedBy: "test" });
    const profile = { email, name: "Hello", sub: `g-${email}` };

    process.env.BINTRO_OWNER_EMAIL = "someone-else@example.com";
    expect((await auth.userForGoogle(profile)).role).toBe("staff");

    process.env.BINTRO_OWNER_EMAIL = email;
    expect((await auth.userForGoogle(profile)).role).toBe("owner");
  });
});
