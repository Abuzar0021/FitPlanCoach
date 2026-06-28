import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — FitPlanCoach Admin" }] }),
  component: () => (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="size-14 rounded-2xl bg-muted inline-flex items-center justify-center mb-4">
        <CreditCard className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">Payments moved to Google Play</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Manual web payment review has been retired. Subscriptions are now sold and managed through
        Google Play Billing, with entitlements verified server-side.
      </p>
    </div>
  ),
});
