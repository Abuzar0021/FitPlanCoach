// Web payments have been removed. All billing now happens through Google Play
// Billing inside the Android app, verified server-side against the Google Play
// Developer API. This legacy endpoint is retired and returns 410 Gone.
import { createFileRoute } from "@tanstack/react-router";

const GONE = () =>
  new Response(JSON.stringify({ ok: false, error: "gone", reason: "web_payments_removed" }), {
    status: 410,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/public/lemonsqueezy/webhook")({
  server: {
    handlers: {
      GET: async () => GONE(),
      POST: async () => GONE(),
    },
  },
});
