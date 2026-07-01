import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { useSupportEmail } from "@/lib/site-config.functions";
import { Trash2, Mail, ShieldCheck, Clock } from "lucide-react";

function buildMailto(email: string): string {
  return (
    `mailto:${email}` +
    `?subject=${encodeURIComponent("Account deletion request")}` +
    `&body=${encodeURIComponent(
      "Please delete my FitPlanCoach account and all associated data.\n\n" +
        "Account email (send from this address): \n" +
        "Reason (optional): \n",
    )}`
  );
}

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Your Account — FitPlanCoach" },
      {
        name: "description",
        content:
          "Request deletion of your FitPlanCoach account and all associated data. Learn exactly what is removed and how to start the process.",
      },
      { property: "og:title", content: "Delete Your FitPlanCoach Account" },
      { property: "og:url", content: "https://fitplancoach.com/delete-account" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/delete-account" }],
  }),
  component: DeleteAccountPage,
});

const DELETED = [
  "Your profile, body metrics, goals, and preferences",
  "Your generated meal and workout plans",
  "Your progress entries, weight history, and streaks",
  "Your achievements and in-app activity",
  "Your account login and subscription record",
];

function DeleteAccountPage() {
  const supportEmail = useSupportEmail();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto max-w-2xl px-6 py-16 w-full">
        <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/30 inline-flex items-center justify-center mb-5">
          <Trash2 className="size-6 text-destructive" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight text-balance">
          Delete your account
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You can permanently delete your FitPlanCoach account and all associated data at any time.
          Here's exactly what happens and how to start.
        </p>

        <section className="mt-10 surface-card p-6">
          <h2 className="font-display uppercase italic text-lg">What gets deleted</h2>
          <ul className="mt-4 space-y-2.5">
            {DELETED.map((d) => (
              <li key={d} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Trash2 className="size-4 mt-0.5 text-destructive/70 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="surface-card p-5">
            <Clock className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold text-sm">How long it takes</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Deletion requests are actioned within 30 days, and usually much sooner. You'll get an
              email confirmation once it's complete.
            </p>
          </div>
          <div className="surface-card p-5">
            <ShieldCheck className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold text-sm">What we keep</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              We only retain limited billing and transaction records where required by law, with no
              further use of your fitness data.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="font-display uppercase italic text-lg">Request deletion</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            If you have an active subscription, please cancel it first in Google Play so you aren't
            charged again. Then send your request — from your account email — and we'll handle the
            rest.
          </p>
          <p className="mt-2 text-xs font-semibold text-destructive">
            This is permanent and cannot be undone.
          </p>
          <a href={buildMailto(supportEmail)} className="inline-flex mt-5">
            <Button size="lg" className="font-bold uppercase tracking-wider h-12 px-7">
              <Mail className="size-4 mr-2" /> Email a deletion request
            </Button>
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            Or email{" "}
            <a href={`mailto:${supportEmail}`} className="text-foreground underline">
              {supportEmail}
            </a>{" "}
            directly. Signed-in users can also start this from Profile → Delete account.
          </p>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          For full details on how we handle your data, see our{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Notice
          </Link>
          .
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
