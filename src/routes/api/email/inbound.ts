import { createFileRoute } from "@tanstack/react-router";
import {
  handleInboundEvent,
  verifyResendSignature,
} from "@/server/inbound.server";

/** Resend Receiving webhook (`email.received`): vendor order emails forwarded to the business's Bintro address. */
export const Route = createFileRoute("/api/email/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
        if (!secret)
          return new Response("Inbound email is not set up", { status: 503 });
        const body = await request.text();
        if (!verifyResendSignature(body, request.headers, secret)) {
          return new Response("Bad signature", { status: 401 });
        }
        try {
          const result = await handleInboundEvent(JSON.parse(body));
          return new Response(result);
        } catch {
          // Resend retries failed deliveries; the error is also saved for Settings.
          return new Response("Could not read that email", { status: 500 });
        }
      },
    },
  },
});
