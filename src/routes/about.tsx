import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Target, Users, Shield, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — FitPlanCoach" },
      { name: "description", content: "FitPlanCoach is operated by FitPlanCoach. Learn about our mission to make personalized fitness coaching accessible to everyone." },
      { property: "og:title", content: "About FitPlanCoach" },
      { property: "og:description", content: "Personalized fitness coaching, built by FitPlanCoach." },
      { property: "og:url", content: "https://fitplancoach.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/auth"><Button size="sm" className="font-bold uppercase tracking-wide">Sign in</Button></Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight">About FitPlanCoach</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          FitPlanCoach is a personalized fitness and nutrition guidance service operated by{" "}
          <strong className="text-foreground">FitPlanCoach</strong>. We help everyday people structure
          their training and eating around real goals — without expensive coaches or generic templates.
        </p>

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            { icon: Target, title: "Our mission", body: "Make data-driven fitness guidance affordable and accessible to anyone with a phone." },
            { icon: Users, title: "Who we serve", body: "Beginners building habits, intermediates breaking plateaus, and busy adults who want structure." },
            { icon: Shield, title: "Your data", body: "We never sell personal data. Your profile and progress stay private and encrypted in transit." },
            { icon: Heart, title: "Our approach", body: "Education over hype. Sustainable habits over crash plans. Guidance, not medical advice." },
          ].map((c) => (
            <div key={c.title} className="surface-card p-6">
              <c.icon className="size-5 text-primary mb-3" />
              <h2 className="font-display uppercase italic text-lg">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 surface-card p-6">
          <h2 className="font-display uppercase italic text-xl">Business information</h2>
          <dl className="mt-3 text-sm space-y-1.5 text-muted-foreground">
            <div><dt className="inline font-semibold text-foreground">Operator:</dt> <dd className="inline">FitPlanCoach</dd></div>
            <div><dt className="inline font-semibold text-foreground">Product:</dt> <dd className="inline">FitPlanCoach — personalized meal & workout planning</dd></div>
            <div><dt className="inline font-semibold text-foreground">Support:</dt> <dd className="inline"><a className="underline" href="mailto:support@fitplancoach.com">support@fitplancoach.com</a></dd></div>
            <div><dt className="inline font-semibold text-foreground">Privacy:</dt> <dd className="inline"><a className="underline" href="mailto:support@fitplancoach.com">support@fitplancoach.com</a></dd></div>
            <div><dt className="inline font-semibold text-foreground">Payments:</dt> <dd className="inline">PayPal / QRIS — Merchant of Record</dd></div>
          </dl>
        </section>

        <p className="mt-10 text-xs text-muted-foreground italic">
          FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Consult a qualified
          professional before significant changes to your diet or exercise routine.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
