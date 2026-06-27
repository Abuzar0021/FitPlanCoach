import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Mail, ShieldCheck, CreditCard } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — FitPlanCoach" },
      { name: "description", content: "Get in touch with FitPlanCoach. Email our support, privacy, or billing teams." },
      { property: "og:title", content: "Contact FitPlanCoach" },
      { property: "og:url", content: "https://fitplancoach.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const channels = [
    { icon: Mail, label: "General support", email: "support@fitplancoach.com", desc: "Account help, plan generation, app questions. We reply within 1–2 business days." },
    { icon: ShieldCheck, label: "Privacy & data requests", email: "support@fitplancoach.com", desc: "Access, correction, deletion, or portability requests under GDPR/CCPA." },
    { icon: CreditCard, label: "Billing & refunds", email: "support@fitplancoach.com", desc: "Billing is handled by PayPal / QRIS. Manage your subscription at your account billing page or email us." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/auth"><Button size="sm" className="font-bold uppercase tracking-wide">Sign in</Button></Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight">Contact us</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Real humans at FitPlanCoach read every message. Pick the right inbox below for the fastest response.
        </p>

        <div className="mt-10 space-y-4">
          {channels.map((c) => (
            <a key={c.email + c.label} href={`mailto:${c.email}`} className="surface-card p-6 flex gap-4 items-start hover:border-border-strong transition">
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

        <div className="mt-10 surface-card p-6">
          <h2 className="font-display uppercase italic text-lg">Manage your subscription</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Update billing, cancel, or view payment history from your{" "}
            <Link to="/billing" className="underline text-foreground">billing page</Link> when signed in,
            or email <a className="underline text-foreground" href="mailto:support@fitplancoach.com">support@fitplancoach.com</a> and we'll handle it for you.
          </p>
        </div>

        <div className="mt-4 surface-card p-6">
          <h2 className="font-display uppercase italic text-lg">Already have an account?</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Open a tracked support ticket from your <Link to="/support" className="underline text-foreground">support page</Link> for the fastest reply.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
