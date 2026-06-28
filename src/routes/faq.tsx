import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { AppCtaBand } from "@/components/AppCtaBand";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQS = [
  {
    q: "What is FitPlanCoach?",
    a: "FitPlanCoach is a personalized fitness and nutrition guidance app. It generates meal plans and workout routines tailored to your body, goals, schedule, and preferences, and helps you track progress over time.",
  },
  {
    q: "Is FitPlanCoach medical advice?",
    a: "No. FitPlanCoach provides fitness and nutrition guidance and is not medical, dietary, or therapeutic advice. Consult a qualified professional before making significant changes to your diet or exercise routine, especially if you have an underlying condition.",
  },
  {
    q: "How are my plans generated?",
    a: "When you complete onboarding, we calculate your estimated calorie and macro targets based on standard sports-nutrition formulas (Mifflin-St Jeor + activity multiplier), then match meals and workouts that fit your preferences, equipment, and weekly availability.",
  },
  {
    q: "What is included in a subscription?",
    a: "Free includes one starter plan and basic tracking, yours to keep. Pro unlocks unlimited plan regeneration, a weekly meal and workout refresh, and full progress tracking — for $5/month or $50/year (two months free), purchased inside the Android app.",
  },
  {
    q: "How does billing work?",
    a: "Pro is purchased inside the Android app and billed securely through Google Play. Prices are in USD; Google adds any applicable taxes at checkout. Your plan renews automatically each period — monthly or annual — until you cancel in Google Play.",
  },
  {
    q: "How do I cancel?",
    a: "Cancel anytime from your subscriptions in Google Play. You keep Pro until the end of the current paid period and won't be billed again.",
  },
  {
    q: "Do you offer refunds?",
    a: "Pro is billed through Google Play, so refunds follow Google Play's refund policy — you can request one from your Google Play account. See our Refund Policy for details, and email us if you'd like a hand.",
  },
  {
    q: "Will FitPlanCoach guarantee weight loss or muscle gain?",
    a: "No honest service can. Results depend on consistency, adherence, sleep, stress, genetics, and many other factors. FitPlanCoach gives you a structured plan and tracking tools; the work is still yours.",
  },
  {
    q: "Is my data safe?",
    a: "Your data is stored encrypted in transit and protected by row-level security. We never sell personal data. See our Privacy Notice for full details on what we collect and why.",
  },
  {
    q: "Can I use FitPlanCoach on mobile?",
    a: "Yes — the Android app is the best experience and is available on Google Play, and your current meal plan is saved to your device so you can view it even if you lose your connection. Prefer the web? FitPlanCoach also runs in any modern browser, and you can add it to your home screen on iOS or Android.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — FitPlanCoach" },
      { name: "description", content: "Answers to common questions about FitPlanCoach: plans, pricing, billing, cancellation, refunds, and data privacy." },
      { property: "og:title", content: "FitPlanCoach FAQ" },
      { property: "og:url", content: "https://fitplancoach.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight text-balance">Frequently asked questions</h1>
        <p className="mt-4 text-muted-foreground">Everything most people want to know before they download — pricing, privacy, results, and how plans are made.</p>

        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 surface-card p-6 text-sm text-muted-foreground">
          Still have questions? Email <a className="text-foreground underline" href="mailto:abuzarelahi01@gmail.com">abuzarelahi01@gmail.com</a>{" "}
          or visit our <Link to="/contact" className="text-foreground underline">contact page</Link>.
        </div>
      </main>

      <AppCtaBand
        heading="Ready when you are"
        sub="Download FitPlanCoach free on Android and put these answers into practice with your own personalized plan."
      />

      <PublicFooter />
    </div>
  );
}
