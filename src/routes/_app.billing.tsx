import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { ExternalLink, ReceiptText } from "lucide-react";
import { PLAY_MANAGE_URL } from "@/lib/billing";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing — FitPlanCoach" }] }),
  component: Billing,
});

function Billing() {
  return (
    <MobileShell>
      <p className="label-overline mb-1">Account</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Billing</h1>
      <div className="surface-card p-6 text-center">
        <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
          <ReceiptText className="size-6 text-primary" />
        </div>
        <h2 className="font-display uppercase italic text-lg">Managed by Google Play</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Your payment history, receipts, and renewals are handled by Google Play. View or manage
          them any time from your Play account.
        </p>
        <a
          href={PLAY_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex mt-5"
        >
          <Button variant="outline" className="h-11 px-6 border-border-strong">
            Open Google Play <ExternalLink className="size-4 ml-2" />
          </Button>
        </a>
      </div>
    </MobileShell>
  );
}
