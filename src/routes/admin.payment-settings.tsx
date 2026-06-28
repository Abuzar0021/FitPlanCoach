import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/admin/payment-settings")({
  head: () => ({ meta: [{ title: "Payment settings — FitPlanCoach Admin" }] }),
  component: () => (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="size-14 rounded-2xl bg-muted inline-flex items-center justify-center mb-4">
        <Settings className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">Configured in Google Play</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Subscription products and pricing are configured in the Google Play Console. Web payment
        settings are no longer used.
      </p>
    </div>
  ),
});
