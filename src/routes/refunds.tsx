import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — FitPlanCoach" },
      { name: "description", content: "30-day money-back guarantee for FitPlanCoach subscriptions. Refunds processed by our team." },
    ],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
        <h1>Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <h2>30-day money-back guarantee</h2>
        <p>
          We want you to be happy with FitPlanCoach. If you're not satisfied with your subscription,
          you can request a full refund within <strong>30 days</strong> of your initial purchase or
          renewal date.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Payments for FitPlanCoach are processed by <strong>PayPal / QRIS</strong>, our Merchant of
          Record. To request a refund:
        </p>
        <ol>
          <li>
            Visit your account billing page and
            sign in with the email you used at checkout to manage your order and request a refund.
          </li>
          <li>
            Or email our team at <a href="mailto:support@fitplancoach.com">support@fitplancoach.com</a> and
            we'll help you process the refund through our team.
          </li>
        </ol>
        <p>
          Approved refunds are returned to the original payment method, typically within 5–10
          business days depending on your bank.
        </p>

        <h2>Cancelling a subscription</h2>
        <p>
          You can cancel your subscription at any time from your account billing page or through
          your account billing page. After cancellation, you keep access until the end of your current paid period
          and are not billed again.
        </p>

        <h2>Questions</h2>
        <p>
          For anything related to refunds or billing, contact{" "}
          <a href="mailto:support@fitplancoach.com">support@fitplancoach.com</a>. See also our{" "}
          <Link to="/terms">Terms of Service</Link>.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
