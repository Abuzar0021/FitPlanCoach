import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { AppCtaBand } from "@/components/AppCtaBand";
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
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <div className="reveal">
          <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight text-balance">Fitness guidance, built for real life</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            FitPlanCoach is a personalized fitness and nutrition app from{" "}
            <strong className="text-foreground">FitPlanCoach</strong>. We help everyday people structure
            their training and eating around real goals — without expensive coaches or one-size-fits-all
            templates. You bring the effort; we bring the plan and the tracking.
          </p>
        </div>

        <section className="mt-12 grid gap-5 md:grid-cols-2 reveal">
          {[
            { icon: Target, title: "Our mission", body: "Make data-driven fitness guidance affordable and accessible to anyone with a phone." },
            { icon: Users, title: "Who we serve", body: "Beginners building habits, intermediates breaking plateaus, and busy adults who want structure." },
            { icon: Shield, title: "Your data", body: "We never sell personal data. Your profile and progress stay private and encrypted in transit." },
            { icon: Heart, title: "Our approach", body: "Education over hype. Sustainable habits over crash plans. Guidance, not medical advice." },
          ].map((c) => (
            <div key={c.title} className="surface-card card-lift p-6">
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

      <AppCtaBand
        heading="Join us on Android"
        sub="Download FitPlanCoach free and see how a plan built around you changes how consistent you can be."
      />

      <PublicFooter />
    </div>
  );
}
