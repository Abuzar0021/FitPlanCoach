# 00 — Ground-Truth Inventory & Feature Matrix

**Working document (not a final chapter).** Produced in Phase 1 per the Bible
spec's Prime Directive #1: *the code is ground truth; the brief is a hypothesis.*
Every row below traces to real source. Verified against the repository at the
current `claude/fitplancoach-platform-strategy-cpk0kr` HEAD (2026-06-29).

---

## 1. Detected stack (from `package.json`, `bun.lock`, configs)

| Layer | Technology | Version | Evidence |
|---|---|---|---|
| Framework | TanStack Start (SSR) | `^1.167.50` | `package.json`, `vite.config.ts` |
| Router | TanStack Router (file-based) | `^1.168.25` | `src/routeTree.gen.ts` (generated) |
| UI runtime | React + React DOM | `^19.2.0` | `package.json` |
| Build | Vite | `^8.0.16` | `vite.config.ts` |
| Server runtime | Nitro | `3.0.260603-beta` | `package.json` devDeps |
| Language | TypeScript | `^5.8.3` | `tsconfig.json` |
| Styling | Tailwind CSS v4 + `tw-animate-css` | `^4.2.1` | `src/styles.css`, `@tailwindcss/vite` |
| Components | Radix UI primitives + shadcn-style | various | `src/components/ui/*` (46 files) |
| Icons | lucide-react | `^0.575.0` | throughout |
| Forms / validation | react-hook-form + Zod | `^7.71`, `^3.24` | server fns + forms |
| Charts | recharts | `^2.15.4` | `src/lib/chart.ts`, admin + progress |
| Toasts | sonner | `^2.0.7` | global |
| Command palette | cmdk | `^1.1.1` | `CountrySelect`, media picker |
| Database / Auth / Storage | Supabase (`@supabase/supabase-js`) | `^2.108.2` | `src/integrations/supabase/*` |
| Email | `react-email` + `@react-email/components` + `@lovable.dev/email-js` | — | `src/lib/email-templates/*` |
| Native shell (config only) | Capacitor | config present, **deps not installed** | `capacitor.config.ts` |
| Lint | ESLint 9 flat + typescript-eslint + prettier | `^9.32` | `eslint.config.js` |
| Package manager | **bun** (lockfile) — npm also works | `bun.lock`, `bunfig.toml` | — |

**Connected to Lovable** (`AGENTS.md`): pushes to the branch sync to the Lovable
editor; history rewrites are discouraged.

---

## 2. Repo map

```
src/
  routes/            46 route files (file-based routing)
    _app.*           authenticated app shell + screens (dashboard, meals,
                     workouts, progress, profile, notifications, support,
                     feedback, subscription, billing, onboarding)
    admin.*          admin/owner console (index, users, foods, exercises,
                     workouts, blog, media, analytics, settings, support)
    api/             server routes: sitemap.xml.ts, public/lemonsqueezy/webhook
                     (RETIRED → 410), email + lovable email infra
    <marketing>      index, features, pricing, download, about, faq, contact,
                     blog, blog.$slug, privacy, terms, refunds, delete-account,
                     unsubscribe, auth, forgot-password, reset-password
  components/        19 app components + ui/ (46 shadcn-style primitives)
  hooks/             use-auth, use-plan, use-mobile
  integrations/
    supabase/        client.ts (anon/browser), client.server.ts (service role),
                     auth-middleware.ts (requireSupabaseAuth), auth-attacher,
                     auth-middleware, types.ts (generated)
  lib/               25 modules: fitness-engine, plan-generation.functions,
                     access (entitlements), billing(+functions), analytics
                     (+admin), blog(+functions), media, site-config(+functions),
                     tips, support.functions, engagement.functions,
                     admin-subscriptions.functions, countries, markdown, chart,
                     email-send.server, error-capture/error-page, utils
    email-templates/ 8 react-email templates + registry
supabase/
  migrations/        30 SQL migrations (schema, RLS, helpers, email infra,
                     blog, media, feature requests)
  config.toml
docs/
  LAUNCH.md          production runbook (prior art — ingested below)
  DESIGN_AUDIT.md    design/experience audit ledger (prior art — ingested below)
  Product-Release-Bible/   ← this deliverable
public/              static assets
capacitor.config.ts  Android shell config (appId com.fitplancoach.app)
```

---

## 3. Feature Matrix (brief → reality)

Legend: **Implemented** = working in code with evidence · **Partial** = core
present, a defined piece missing/stubbed · **Planned** = not built.

| Feature (from brief) | Status | Evidence | Notes |
|---|---|---|---|
| Calorie/macro engine | **Implemented** | `src/lib/fitness-engine.ts:29-40` | Mifflin–St Jeor BMR, TDEE multipliers, goal adjust, protein/kg. Deterministic, **no external AI**. |
| Meal-plan generation | **Implemented** | `fitness-engine.ts:87-122`, `plan-generation.functions.ts` | Country + budget aware food selection with graceful fallback to `global`. |
| Workout system | **Implemented** | `fitness-engine.ts:133-151`, `_app.workouts.tsx`, `admin.workouts.tsx`, tables `workout_plans/templates/sessions` | Template selection by goal/level; logging drives streaks. |
| Nutrition / foods catalog | **Implemented** | `admin.foods.tsx`, table `foods`, `_app.meals.tsx` | Admin-managed food DB w/ country + budget. |
| Daily tips | **Implemented** | `src/lib/tips.ts` (140 lines), `DailyTip.tsx` | Curated rotating tips. |
| Progress tracking + streaks | **Implemented** | `_app.progress.tsx`, `engagement.functions.ts`, `progress_entries`, `profiles.streak_*` | Weight log, charts, streak current/longest. |
| Achievements | **Implemented** | tables `achievements`, `user_achievements`; `engagement.functions.ts` | Awarded server-side. |
| Authentication | **Implemented** | `integrations/supabase/*`, `auth.tsx`, `forgot/reset-password.tsx`, `use-auth.tsx` | Supabase email/password + recovery; SSR auth middleware. |
| Membership entitlements | **Implemented** | `src/lib/access.ts` | Single source of truth: `hasFeature(plan, feature)`, free generation limit. |
| Google Play billing — **server verification** | **Implemented** | `src/lib/billing.functions.ts:28-174` | Real JWT→Play Developer API verify, writes `subscriptions`, **fails closed**, acknowledges. |
| Google Play billing — **native purchase trigger** | **Partial → Planned** | `src/lib/billing.ts:43-62` (TODO) | `startProPurchase`/`restorePurchases` return `not_implemented`; need native IAP plugin in Android build. **Blocked (external).** |
| Web payments | **Removed by design** | `routes/api/public/lemonsqueezy/webhook.ts` → **410 Gone** | LemonSqueezy retired; premium is Play-only. Legacy `payment_*` tables remain (tech debt). |
| Mobile app (native) | **Partial** | `capacitor.config.ts`; PWA via SSR | Config only — Capacitor deps not installed, no built/published APK. **Blocked (external build + Play Console).** |
| Admin CMS / console | **Implemented** | `routes/admin.*` (10 screens), `admin-ui.tsx` | Users, foods, exercises, workouts, blog, media, analytics, settings, support. |
| Site config (editable) | **Implemented** | `src/lib/site-config(.functions).ts`, `admin.settings.tsx` | Support email, social, announcement, GA4/Clarity ids — DB-backed, whitelisted. |
| Blog CMS | **Implemented** | `blog(.functions).ts`, `admin.blog.tsx`, `blog.tsx`, `blog.$slug.tsx`, `blog_posts` | XSS-safe MD renderer, JSON-LD. |
| Media library | **Implemented** | `src/lib/media.ts`, `admin.media.tsx`, `MediaPicker.tsx`, `media_assets` | Supabase Storage bucket `media`, alt text, 8 MB cap. |
| Analytics | **Implemented** | `analytics.ts` (events), `analytics-admin.functions.ts`, `admin.analytics.tsx`, `admin.index.tsx`, `analytics_events` | First-party event capture + owner dashboards; optional GA4/Clarity injection (`SiteScripts.tsx`). |
| Support tickets | **Implemented** | `support.functions.ts`, `_app.support.tsx`, `admin.support.tsx`, `support_tickets(+messages)` | User submit + admin triage w/ priority/status. |
| Feedback / feature requests | **Implemented** | `_app.feedback.tsx`, `feature_requests(+votes+comments)` | Public board, voting, comments. |
| Transactional email | **Implemented (infra)** | `email-templates/*`, `email-send.server.ts`, `routes/lovable/email/*`, email_send_log/state, DLQ helpers | Queue + templates + suppression/unsubscribe. Delivery needs `LOVABLE_API_KEY` (env). |
| SEO | **Implemented** | `routes/sitemap[.]xml.ts`, per-route `head()`, canonical/OG, JSON-LD | Sitemap includes blog. |
| Localization (country) | **Implemented** | `src/lib/countries.ts` (199), `CountrySelect.tsx` | Used in onboarding/profile/admin + meal localization. |
| Notifications | **Implemented** | `NotificationBell.tsx`, `_app.notifications.tsx`, `notifications`, realtime channel | Live unread count via Supabase realtime. |

---

## 4. External services & integrations

| Concern | Provider | Where wired | Notes |
|---|---|---|---|
| Auth | Supabase Auth | `integrations/supabase/*` | email/password + recovery |
| Database | Supabase Postgres | `supabase/migrations/*` | RLS everywhere; SECURITY DEFINER helpers |
| Storage | Supabase Storage | `src/lib/media.ts` (bucket `media`) | media library |
| Realtime | Supabase Realtime | `NotificationBell.tsx` | notifications channel |
| Billing | Google Play Developer API | `billing.functions.ts` | server verify; **fails closed** without SA |
| Analytics (1st-party) | own `analytics_events` | `analytics.ts` | always on |
| Analytics (3rd-party, optional) | GA4 + MS Clarity | `SiteScripts.tsx` | injected only if ids set in site config |
| Email | Lovable email send API | `email-send.server.ts` | needs `LOVABLE_API_KEY` |
| Native shell | Capacitor (Android) | `capacitor.config.ts` | config only, not built |

---

## 5. Environment variables (names only — never values)

**Client (build-time, browser-exposed):**
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_PLAY_STORE_URL` (flips "Coming soon" → live Play link).

**Server only:**
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` *or* (`GOOGLE_PLAY_SA_EMAIL` +
`GOOGLE_PLAY_SA_PRIVATE_KEY`), `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`.

Source: `.env.example`, `grep` of `import.meta.env`/`process.env` across `src/`.

---

## 6. Data model snapshot (from `supabase/migrations/`)

**Core:** `profiles`, `user_roles`, `subscriptions`, `progress_entries`,
`workout_plans`, `workout_templates`, `workout_sessions`, `meal_plans`, `foods`,
`exercises`, `achievements`, `user_achievements`, `notifications`,
`analytics_events`, `app_settings`.

**Content/ops:** `blog_posts`, `media_assets`, `feature_requests`,
`feature_request_votes`, `feature_request_comments`, `support_tickets`,
`support_ticket_messages`.

**Email infra:** `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`,
`suppressed_emails`, `webhook_events` (+ helpers `enqueue_email`,
`read_email_batch`, `move_to_dlq`).

**Legacy web-payment (now unused, retained):** `payment_approvals`,
`payment_settings`, `payment_submissions`, `billing_history`.

**SECURITY DEFINER helpers:** `has_role(uuid, app_role)`, `is_owner(uuid)`,
`has_active_subscription`, `plan_type_from_price`, `transfer_ownership`.

> **Known issue:** `src/integrations/supabase/types.ts` is **stale** — it predates
> the `blog_posts`, `media_assets`, and `feature_request*` migrations (they are
> not in the generated types), while still containing legacy `payment_*` tables.
> Code works around this with `const db: any = supabase`. Tracked for Chapter 05 /
> Limitations.

---

## 7. Prior-art ingestion (required input to later chapters)

- **`docs/LAUNCH.md`** — production runbook: env setup, migration apply order,
  role granting, Play Console + service-account configuration, Android wrapper
  steps. Feeds Ch. 24 (Deployment) and Ch. 25 (Launch Checklist).
- **`docs/DESIGN_AUDIT.md`** — living design/experience ledger across global
  foundations, auth, onboarding, app/admin/marketing surfaces. Feeds Ch. 07/09
  (Frontend/Website) and Ch. 21 (Accessibility).

No separate automated production-readiness audit exists; the two docs above are
the canonical prior art and are treated as required input.

---

## 8. Planned-item disposition (per directive)

> Directive: every **Planned** item must reach *implemented* or *explicitly
> blocked by credentials/external services*. Live tracker; updated each phase.

| Planned/Partial item | Disposition | Reason |
|---|---|---|
| Native Play purchase trigger (`billing.ts` TODOs) | **Blocked (external)** | Needs native Capacitor IAP plugin + Play Console products + SA key. Server side already implemented. |
| Native Android build / Play listing | **Blocked (external)** | Requires Android toolchain + Google Play Console account + signing. |
| Apply newest migrations (feedback/blog/media) | **Blocked (credentials)** | Requires Supabase DB access (user-run). |
| Set CMS values (support email, GA4, Clarity) | **Blocked (config)** | Requires admin login + real property ids. |
| Automated test coverage (engine) | **✅ IMPLEMENTED** | `src/lib/fitness-engine.test.ts` — 14 tests via Node's built-in runner (`npm test`), zero new deps. Closes the highest-ROI in-repo gap. |
| Integration/e2e tests + CI | **Actionable in code (open)** | Server-fn/RLS/billing tests + CI wiring — next code item. |
| Regenerate/repair stale `types.ts` | **Actionable in code (open)** | Best done via Supabase CLI introspection (needs DB access); hand-reconciliation is error-prone. Partially blocked. |
| Legacy `payment_*` tables + dead web-payment code | **Operator decision** | Dropping tables is destructive (data-loss) — write the migration, but the operator must choose to apply it. Not auto-executed. |
| Any TODO/placeholder found during chapter authoring | **Triage as found** | Implement if code-only; else mark blocked here. |

---

## 9. Reality-check (the spec's expected surprises)

- **Web app, not yet a shipped native app.** This is a TanStack Start SSR PWA
  with a Capacitor *config* and a TWA/Bubblewrap path documented, but **no built
  or published Android app**. Chapter 08 (Mobile) is **Partial**, not Implemented.
- **Billing exists server-side, not end-to-end.** Unlike the worst-case
  assumption that billing is wholly absent, server verification is genuinely
  implemented and secure (fails closed); only the native purchase trigger is
  pending. Chapter 12 (Memberships) is **Partial**.
- **Admin CMS is real and broad** (10 screens) — Chapter 10 is **Implemented**,
  not Planned.

---

*This inventory is the authority for chapter Status fields. Update it whenever a
Planned item changes disposition.*
