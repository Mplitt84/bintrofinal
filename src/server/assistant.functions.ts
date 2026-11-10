import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { hasFeature } from "./account.server";
import { askBintro } from "./assistant.server";

/** Ask Bintro a question about this business's data (AI, Plus). */
export const askBintroFn = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      question: z.string().trim().min(1).max(600),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
        .max(12),
      timeZone: z.string().max(60),
      localNow: z.string().max(80),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await hasFeature("ai"))) {
      return { ok: false as const, message: "Ask Bintro comes with Bintro Plus. Upgrade in Settings → Account & billing." };
    }
    try {
      return await askBintro(data.question, data.history, data.timeZone, data.localNow);
    } catch (error) {
      console.error("Ask Bintro failed", error);
      return { ok: false as const, message: "Bintro couldn't look at your data just now. Try again in a moment." };
    }
  });
