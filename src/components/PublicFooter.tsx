import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display uppercase italic text-lg text-foreground">FitPlanCoach</div>
            <p className="mt-2 text-xs leading-relaxed max-w-sm">
              Personalized fitness and nutrition guidance from{" "}
              <span className="text-foreground font-semibold">FitPlanCoach</span>. Payments accepted via
              PayPal (international) and QRIS (Indonesia) and verified manually by our team.
              FitPlanCoach provides fitness and nutrition guidance and is not medical advice.
            </p>

            <div className="mt-3 text-xs">
              Support: <a href="mailto:support@fitplancoach.com" className="text-foreground hover:underline">support@fitplancoach.com</a>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Product</div>
            <nav className="flex flex-col gap-2">
              <Link to="/features" className="hover:text-foreground">Features</Link>
              <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link to="/faq" className="hover:text-foreground">FAQ</Link>
              <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            </nav>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Company & legal</div>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="hover:text-foreground">About</Link>
              <Link to="/contact" className="hover:text-foreground">Contact</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Notice</Link>
              <Link to="/refunds" className="hover:text-foreground">Refund Policy</Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div>© {new Date().getFullYear()} FitPlanCoach. All rights reserved.</div>
          <div className="text-muted-foreground">PayPal & QRIS · Manually reviewed · 30-day money-back guarantee</div>
        </div>
      </div>
    </footer>
  );
}
