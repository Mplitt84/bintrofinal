/**
 * Runs the query behind each screen against a real database, so the tenancy guard
 * gets a chance to refuse it. The static check in `db/tenant-coverage.test.ts` reads
 * the source; this one proves the screens actually load, which is what caught the
 * sixteen queries the first tenancy sweep missed.
 *
 * Skips unless NETLIFY_DB_URL is set:
 * `NETLIFY_DB_URL=postgres://postgres@127.0.0.1:5433/bintro NETLIFY_DB_DRIVER=server npx vitest run`
 */
import { describe, expect, it } from "vitest";
import { runForBusiness } from "./tenant.js";

const live = !!process.env.NETLIFY_DB_URL;

describe.skipIf(!live)("every screen's queries run", () => {
  it("account summary (pilot clock reads first scan in)", async () => {
    const { getAccountSummary } = await import("./account.server.js");
    await runForBusiness(1, () => getAccountSummary());
  });

  it("insights (slow movers, last used)", async () => {
    const { computeInsights } = await import("./insights.server.js");
    await runForBusiness(1, () => computeInsights());
  });

  it("activity feed", async () => {
    const { findMovementsSince } = await import("./inventory.server.js");
    await runForBusiness(1, () => findMovementsSince(null, 50));
  });

  it("orders list", async () => {
    const { ordersOverview } = await import("./orders.server.js");
    await runForBusiness(1, () => ordersOverview());
  });

  it("smart par, category groups, last par change", async () => {
    const tidy = await import("./tidy.server.js");
    await runForBusiness(1, async () => {
      await tidy.smartPars();
      await tidy.categoryGroups();
      await tidy.lastParChange();
    });
  });

  it("integration status", async () => {
    const { integrationStatus } = await import("./integrations.server.js");
    await runForBusiness(1, () => integrationStatus());
  });

  it("count history and one count's lines", async () => {
    const counts = await import("./counts.server.js");
    await runForBusiness(1, async () => {
      const recent = await counts.recentCounts(5);
      if (recent[0]) await counts.countWithLines(recent[0].id);
    });
  });

  it("approve a count, then undo it", async () => {
    const counts = await import("./counts.server.js");
    const { findAllProducts } = await import("./inventory.server.js");
    await runForBusiness(1, async () => {
      const [product] = await findAllProducts();
      if (!product) return;
      const approved = await counts.approveCount({
        scope: "Guard probe",
        blind: false,
        staffName: "Probe",
        lines: [{ productId: product.id, counted: product.qty + 1, reason: "Recount" }],
      });
      expect(approved.id).toBeGreaterThan(0);
      const undone = await counts.undoCount(approved.id, "Probe");
      expect(undone.count.undoneAt).toBeTruthy();
    });
  });

  it("ask bintro builds its snapshot", async () => {
    const assistant = await import("./assistant.server.js");
    await runForBusiness(1, async () => {
      try {
        await assistant.askBintro("how many products do I have?", [], "America/Chicago", new Date().toISOString());
      } catch (err) {
        // No AI key locally: the snapshot queries ran, the AI call is what failed.
        const message = String(err);
        expect(message).not.toMatch(/Tenancy guard/);
      }
    });
  });
});
