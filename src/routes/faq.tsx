import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
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
    a: "Free includes one starter plan and basic tracking. Pro ($5/mo) unlocks unlimited plans, full progress tracking, and country-specific food databases. Premium ($10/mo) adds weekly regeneration and deeper customization. Elite ($15/mo) adds advanced analytics and priority access to new features.",
  },
  {
    q: "How does billing work?",
    a: "Subscriptions are billed monthly by PayPal and QRIS, with each payment manually verified by our team. Prices are in USD and applicable taxes are calculated at checkout. Your subscription renews automatically each month until cancelled.",
  },
  {
    q: "How do I cancel?",
    a: "You can cancel any time from your account billing page or directly at your account billing page. After cancellation you keep access until the end of the current paid period and are not billed again.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. We offer a 30-day money-back guarantee on subscription purchases. Refunds are processed by our team. See our Refund Policy for full details.",
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
    a: "Yes. FitPlanCoach is a Progressive Web App — open it in your browser, tap 'Add to Home Screen', and it works like a native app on iOS and Android.",
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

      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight">Frequently asked</h1>
        <p className="mt-4 text-muted-foreground">Everything most people want to know before signing up.</p>

        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 surface-card p-6 text-sm text-muted-foreground">
          Still have questions? Email <a className="text-foreground underline" href="mailto:support@fitplancoach.com">support@fitplancoach.com</a>{" "}
          or visit our <Link to="/contact" className="text-foreground underline">contact page</Link>.
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
