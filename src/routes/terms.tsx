import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — FitPlanCoach" },
      { name: "description", content: "Terms of Service for FitPlanCoach, operated by FitPlanCoach. Payments handled by PayPal / QRIS." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <p>
          These Terms govern your use of the FitPlanCoach service ("Service") provided by
          <strong> FitPlanCoach</strong> ("we", "us", "our"). By creating an account or using the Service,
          you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          FitPlanCoach generates personalized meal plans, workouts, and progress tracking tools. The
          Service is provided on an "as is" basis. We do not guarantee uninterrupted or error-free
          operation, and the Service does not constitute medical, nutritional, or professional advice.
          Consult a qualified professional before making significant changes to your diet or exercise
          routine.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate information, keep your credentials confidential, and are
          responsible for activity under your account. You must be of legal age in your jurisdiction
          to enter into this agreement.
        </p>

        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service unlawfully or to infringe the rights of others;</li>
          <li>Engage in fraud, spam, or abuse;</li>
          <li>Probe, scan, scrape, or interfere with the security or integrity of the Service;</li>
          <li>Reverse engineer, resell, or redistribute the Service;</li>
          <li>Circumvent technical limits or usage quotas.</li>
        </ul>

        <h2>4. Intellectual property</h2>
        <p>
          FitPlanCoach retains all rights, title, and interest in the Service, including software,
          documentation, and branding. You receive a limited, non-exclusive, non-transferable right
          to use the Service within your selected plan.
        </p>

        <h2>5. Payments, subscriptions, and Merchant of Record</h2>
        <p>
          Our order process is conducted by our online reseller <strong>PayPal / QRIS</strong>.
          PayPal / QRIS is the Merchant of Record for all our orders. our team provides all customer
          service inquiries and handles returns. Payment, billing, tax, cancellation, and refund
          mechanics are governed by the{" "}
          our terms.
        </p>
        <p>
          Subscriptions renew automatically each billing period until cancelled. You may cancel at
          any time from your account billing page or via your account billing page; access continues until the end
          of the current paid period.
        </p>

        <h2>6. Suspension and termination</h2>
        <p>
          We may suspend or terminate your access for material breach of these Terms, non-payment,
          security or fraud risk, or repeated/serious policy violations. You may stop using the
          Service at any time. On termination, your right to use the Service ends; we may delete
          your data after a reasonable retention period.
        </p>

        <h2>7. Warranties and liability</h2>
        <p>
          To the fullest extent permitted by law, we disclaim all implied warranties, including
          merchantability and fitness for a particular purpose. Our aggregate liability for any
          claim arising out of or relating to the Service is limited to the fees you paid to us in
          the 12 months preceding the claim. We are not liable for indirect, consequential, or
          special damages, including loss of profits, data, or goodwill. Nothing in these Terms
          excludes liability for fraud, death, or personal injury where the law does not allow it.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be notified via the
          Service or by email. Continued use after changes take effect constitutes acceptance.
        </p>

        <h2>9. Governing law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction in which FitPlanCoach is established,
          without regard to conflict of law principles.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about these Terms: <a href="mailto:support@fitplancoach.com">support@fitplancoach.com</a>.
          Billing questions: your account billing page.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
