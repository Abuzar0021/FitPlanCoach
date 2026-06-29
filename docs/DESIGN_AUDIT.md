# FitPlanCoach — Design & Experience Audit Ledger

A living, evidence-based record of the systematic review against world-class
benchmarks (Apple, Linear, Notion, Framer, Stripe, Arc, Nike Training Club,
Airbnb, Duolingo). Every surface is reviewed across: visual hierarchy,
typography, spacing/rhythm, consistency, responsiveness, interaction design,
animation, usability, accessibility, loading/empty/error states, onboarding,
information architecture, discoverability, conversion, trust, polish, delight.

Each entry: **weaknesses found → fix implemented (commit) or explicit
justification for no change.**

> Environment note: this repo has no runnable `vite build` and no browser here,
> so code-level, principle-grounded improvements are implemented and verified
> with `tsc` + ESLint. Pure pixel judgment (exact spacing/imagery feel) is the
> one class of change that still benefits from the Lovable preview and is called
> out where relevant.

---

## Design system & global foundations

- **Motion** — added a token set (`--ease-out/in-out/spring`, `--duration-*`),
  routed `.card-lift` through it, and a global `prefers-reduced-motion` reset.
  Commits `49c51ea`, `25ee325`.
- **Typography** — real editorial `.prose` (the Tailwind typography plugin isn't
  installed, so `prose` had been a no-op); blog renders via a token-matched
  Markdown renderer. `25ee325`.
- **Color/contrast** — branded `::selection`; chart tooltips re-themed from the
  off-theme default white box to popover tokens. `49c51ea`, `8aefd47`.
- **Focus** — global `:focus-visible` ring (WCAG 2.4.7). `04f0d9e`.
- **Interaction** — shared `Button` gained `active:scale` press feedback. `49c51ea`.
- **Performance** — per-image loading strategy (eager+fetchPriority for LCP,
  lazy+async below the fold). `4a1e064`.

## Authentication

- **Sign in / Sign up** (`6724543`) — password reveal toggle; mobile input attrs
  (inputMode/autoComplete/autoCapitalize/autoCorrect/spellCheck); autofocus;
  visible mode-aware heading (was sr-only); email normalize; tablist a11y
  (role/aria-selected, disabled-during-submit); signup legal line; submit spinner.
- **Forgot password** (`e67f2cd`) — visible h1; full email input attrs + autofocus;
  email normalize; success MailCheck icon; submit spinner.
- **Reset password** (`e67f2cd`) — visible h1; password reveal; live inline
  validation (8+ chars, passwords-match) with submit disabled until valid;
  spinner on submit + verifying; AlertTriangle on invalid-link state.

## Onboarding (`e83b0d8`)

- Activity/goal options now carry icons + an explicit Check on selection (fixes
  WCAG 1.4.1 use-of-color and ambiguous single-select); realistic age validation
  (13–100) to protect the downstream calorie calc.
- **Justified, no change:** progress bar already has `role=progressbar` + aria
  values; step transitions animate; each step autofocuses; choices already had
  `aria-pressed`.

## Application screens

- **Progress** (`b73954c`) — elevated surfaces to `surface-card`; section headers
  (Weight trend, History); inviting empty states; history row hover; label
  association on the weight input.
- **Notifications** (`4733924`) — hover feedback on clickable cards only.
- **Support** (`722073e`) — label association (htmlFor/id) on subject/message;
  category selector role=group + aria-pressed + hover; submit spinner.
- **Feedback board + dialog** (`5c82870`) — accessible names on the dialog's
  title/description and the comment input; Enter-to-submit via `<form>`; category
  role=group; submit spinner.
- **Meals / Workouts / Dashboard** — **justified, no change**: already use
  `surface-card`, the shared `EmptyState`, skeleton loaders, and consistent
  hierarchy; reworking would be superficial churn.

## Admin (CMS, analytics, tables)

- **Shared design language** (`1700929`, `b121a9e`) — `AdminHeader` / `StatCard` /
  `AdminSectionLabel`; every admin screen now uses the premium display header
  instead of a plain bold title; Owner dashboard + Analytics rebuilt on the
  shared primitives (removed duplicated card markup).
- **Surfaces & tables** (`d8d6a44`) — 21 flat `bg-card` surfaces elevated to
  `surface-card`; refined table headers; row hover on foods/users/exercises.
- **Charts** (`8aefd47`) — tooltips themed for the dark UI.

## Website / marketing

- **Pricing** (`c933706`) — card-lift on decision cards; fixed a stale 30-day
  money-back-guarantee promise that can't be honored under Google Play.
- **Delete account** (`dbbb885`) — Google Play billing copy; irreversibility
  restated at the action point; SPA `Link` for Privacy.
- **Billing accuracy + SEO** (`c616591`) — site-wide PayPal/QRIS → Google Play;
  canonical + OG across all legal pages.
- **Feature/testimonial/about/download/contact cards** — **justified:** already
  carry `card-lift`, now smoother via the motion tokens.

## Loading / empty / error states

- Shared `ListSkeleton` unifies the notifications/support list loaders (`386a951`);
  Progress/Notifications empty states added/standardized; Profile keeps a bespoke
  skeleton that intentionally mirrors its layout.

---

## Outstanding (tracked, not yet closed)

- **Marketing copy/visual pass** on `features`, `download`, `about`, `faq` — content
  is solid; deeper visual iteration benefits from the preview.
- **Reusable components** `GooglePlayButton`, `PhoneMockup`, `AppScreens`, `Logo`,
  `NotificationBell` — pending line-by-line audit.
- **Responsive breakpoint sweep** — desktop/mobile parity check per page (needs
  rendered viewports to verify rigorously).

This ledger is updated as the review continues.
