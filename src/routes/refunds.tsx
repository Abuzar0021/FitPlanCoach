import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { useSupportEmail } from "@/lib/site-config.functions";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — FitPlanCoach" },
      {
        name: "description",
        content:
          "How refunds work for FitPlanCoach Pro. Subscriptions are billed through Google Play, so refunds follow Google Play's refund policy.",
      },
      { property: "og:title", content: "Refund Policy — FitPlanCoach" },
      {
        property: "og:description",
        content: "How refunds work for FitPlanCoach Pro, billed through Google Play.",
      },
      { property: "og:url", content: "https://fitplancoach.com/refunds" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/refunds" }],
  }),
  component: Refunds,
});

function Refunds() {
  const supportEmail = useSupportEmail();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert"
      >
        <h1>Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <h2>How refunds work</h2>
        <p>
          FitPlanCoach Pro is purchased inside the Android app and billed through{" "}
          <strong>Google Play</strong>. Because Google is the merchant of record, refunds are issued
          by Google Play under its refund policy — we can't charge or refund your card directly.
        </p>

        <h2>How to request a refund</h2>
        <ol>
          <li>
            Open the Google Play Store, go to your subscriptions, select FitPlanCoach, and request a
            refund — or visit{" "}
            <a
              href="https://play.google.com/store/account/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play subscriptions
            </a>
            .
          </li>
          <li>
            If you need a hand, email us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>{" "}
            and we'll help you through it.
          </li>
        </ol>
        <p>
          Approved refunds are returned to your Google Play payment method on Google's timeline,
          usually within a few business days.
        </p>

        <h2>Cancelling a subscription</h2>
        <p>
          Cancel anytime from your subscriptions in Google Play. After cancellation you keep Pro
          until the end of your current paid period, and you won't be billed again.
        </p>

        <h2>Questions</h2>
        <p>
          For anything related to refunds or billing, contact{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. See also our{" "}
          <Link to="/terms">Terms of Service</Link>.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
