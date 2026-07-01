import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { useSupportEmail } from "@/lib/site-config.functions";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — FitPlanCoach" },
      {
        name: "description",
        content:
          "How FitPlanCoach collects, uses, and shares personal data for the FitPlanCoach service.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const supportEmail = useSupportEmail();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert"
      >
        <h1>Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <p>
          This Privacy Notice describes how <strong>FitPlanCoach</strong> ("we", "us") collects,
          uses, and shares personal data when you use the FitPlanCoach service. FitPlanCoach is the
          data controller for personal data processed through the Service.
        </p>

        <h2>1. Data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email, login credentials.
          </li>
          <li>
            <strong>Profile and fitness data:</strong> body metrics, goals, preferences, dietary
            restrictions, workout logs, progress photos you choose to upload.
          </li>
          <li>
            <strong>Support messages:</strong> content of correspondence with our team.
          </li>
          <li>
            <strong>Usage and device data:</strong> pages visited, features used, device
            identifiers, IP address, browser type.
          </li>
        </ul>

        <h2>2. Why we use it</h2>
        <ul>
          <li>To create and operate your account (contract performance).</li>
          <li>To generate and personalize your meal and workout plans (contract performance).</li>
          <li>To provide customer support (legitimate interests).</li>
          <li>
            To secure the Service and prevent fraud or abuse (legitimate interests, legal
            obligation).
          </li>
          <li>To improve the Service through aggregated analytics (legitimate interests).</li>
          <li>To send service emails and, where you have opted in, marketing emails (consent).</li>
        </ul>

        <h2>3. Who we share it with</h2>
        <ul>
          <li>
            <strong>Service providers and subprocessors</strong> that help us operate the Service
            (hosting, databases, analytics, email delivery, customer support tooling).
          </li>
          <li>
            <strong>Google Play</strong>, the merchant of record for in-app subscriptions, which
            handles payment, subscription management, tax compliance, and invoicing.
          </li>
          <li>
            <strong>Professional advisers</strong> (legal, accounting) under confidentiality
            obligations.
          </li>
          <li>
            <strong>Authorities</strong> where required by law or to protect rights, safety, and
            property.
          </li>
        </ul>

        <h2>4. International transfers</h2>
        <p>
          Your data may be processed outside the country where you live. Where required, we rely on
          appropriate safeguards such as Standard Contractual Clauses or adequacy decisions.
        </p>

        <h2>5. Retention</h2>
        <p>
          We retain personal data for as long as your account is active and for a reasonable period
          afterwards to meet legal, accounting, or reporting obligations. When data is no longer
          needed, we delete or anonymize it.
        </p>

        <h2>6. Your rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, restrict,
          port, or object to processing of your personal data, and to withdraw consent. UK/EEA users
          also have the right to complain to a supervisory authority. We respond to verified
          requests within one month.
        </p>
        <p>
          To exercise a right, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>

        <h2>7. Security</h2>
        <p>
          We use appropriate technical and organizational measures, including encryption in transit,
          access controls, and audit logging, to protect personal data. No system is perfectly
          secure, but we work to maintain industry-standard protections.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use strictly necessary cookies to keep you signed in and to operate the Service. We may
          also use limited analytics cookies to understand aggregate usage. You can manage cookies
          through your browser settings.
        </p>

        <h2>9. Children</h2>
        <p>
          The Service is not directed to children under 16, and we do not knowingly collect data
          from them.
        </p>

        <h2>10. Changes and contact</h2>
        <p>
          We may update this Notice from time to time. Material changes will be communicated via the
          Service or by email. For privacy questions, contact{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
