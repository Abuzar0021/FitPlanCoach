import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { AppCtaBand } from "@/components/AppCtaBand";
import { useSupportEmail } from "@/lib/site-config.functions";
import { Mail, ShieldCheck, CreditCard, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — FitPlanCoach" },
      {
        name: "description",
        content: "Get in touch with FitPlanCoach. Email our support, privacy, or billing teams.",
      },
      { property: "og:title", content: "Contact FitPlanCoach" },
      { property: "og:url", content: "https://fitplancoach.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const supportEmail = useSupportEmail();
  const { user, loading } = useAuth();

  const channels = [
    {
      icon: Mail,
      label: "General support",
      email: supportEmail,
      desc: "Account help, plan generation, app questions. We reply within 1–2 business days.",
    },
    {
      icon: ShieldCheck,
      label: "Privacy & data requests",
      email: supportEmail,
      desc: "Access, correction, deletion, or portability requests under GDPR/CCPA.",
    },
    {
      icon: CreditCard,
      label: "Billing & refunds",
      email: supportEmail,
      desc: "Pro is billed through Google Play. Manage or cancel in your Google Play subscriptions, or email us for help.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight text-balance">
          Contact us
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The fastest way to reach us is a tracked support ticket — it goes straight to our team and
          you'll see replies in-app.
        </p>

        {/* Primary path: real support ticket, tracked in-app */}
        <div className="mt-8 surface-card p-6 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="size-11 rounded-xl bg-primary/15 border border-primary/30 inline-flex items-center justify-center shrink-0">
              <LifeBuoy className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display uppercase italic text-lg">Open a support ticket</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Signed-in tickets are tracked, reach our team directly, and you get replies right in
                the app under Profile → Support.
              </p>
              {!loading && (
                <Link
                  to={user ? "/support" : "/auth"}
                  className="inline-flex mt-4"
                  search={user ? undefined : { redirect: "/support" }}
                >
                  <Button className="font-bold uppercase tracking-wider h-11 px-6">
                    {user ? "Open a ticket" : "Sign in to open a ticket"}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Fallback: direct email by topic */}
        <h2 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Or email us directly
        </h2>
        <div className="space-y-4 reveal">
          {channels.map((c) => (
            <a
              key={c.email + c.label}
              href={`mailto:${c.email}`}
              className="surface-card card-lift p-6 flex gap-4 items-start"
            >
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
                <c.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="font-display uppercase italic text-lg">{c.label}</div>
                <div className="text-sm text-primary font-semibold mt-0.5">{c.email}</div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-4 surface-card p-6">
          <h2 className="font-display uppercase italic text-lg">Manage your subscription</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Update billing, cancel, or view payment history from your{" "}
            <Link to="/billing" className="underline text-foreground">
              billing page
            </Link>{" "}
            when signed in, or email{" "}
            <a className="underline text-foreground" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>{" "}
            and we'll handle it for you.
          </p>
        </div>
      </main>

      <AppCtaBand
        heading="Prefer to just get started?"
        sub="Download FitPlanCoach free on Android — most questions answer themselves once you see your first plan."
      />

      <PublicFooter />
    </div>
  );
}
