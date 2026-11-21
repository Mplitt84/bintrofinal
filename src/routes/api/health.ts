import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { db } from "../../../db/index.js";

/**
 * Uptime check for the outside monitor (.github/workflows/uptime.yml): 200 when the app
 * and its database answer, 503 when the database doesn't. Says nothing about any shop.
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        try {
          await Promise.race([
            db.execute(sql`select 1`),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
          ]);
          return Response.json({ ok: true, db: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
