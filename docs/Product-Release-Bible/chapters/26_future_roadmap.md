# 26. Future Roadmap

**Status:** Planned (consolidated backlog)
**Last verified against commit:** 26c8ce4 · 2026-06-29

## 1. Purpose & Scope

The single consolidated backlog, aggregated from every chapter's "Planned Future
Improvements" and the inventory's planned-item disposition. Each item is tagged
by disposition: **[code]** doable in-repo · **[ops]** operator/config ·
**[ext]** external service/build.

## 2. Implementation

**P0 — unblock the business model**
- [ext] Build/sign/publish Android app; wire Play Billing plugin to the existing
  server verifier (Ch. 08, 12).
- [ext] Play Console products + service account; set `VITE_PLAY_STORE_URL`
  (Ch. 25).
- [code] Add Google Play Real-time Developer Notifications handling to sync
  renewals/cancellations (Ch. 12).

**P1 — quality & safety**
- [x] **DONE** — pure-engine unit tests (14 tests, Node built-in runner, `npm
  test`) (Ch. 23, `src/lib/fitness-engine.test.ts`).
- [code] Entitlement-gate + billing integration tests; Playwright signup→plan
  smoke; wire `npm test`/`tsc`/`lint` into CI (Ch. 23).
- [code] App-layer rate-limiting on auth + sensitive server functions; complete
  Zod input coverage; admin audit log; CI dependency/secret scanning (Ch. 20).
- [code] Regenerate `types.ts`; cleanup migration removing legacy `payment_*`
  tables (Ch. 05).

**P2 — product depth**
- [code] Dietary-preference/allergen filters + full macro (carb/fat) balancing in
  meal generation (Ch. 14).
- [code] Progressive-overload / week-over-week workout adjustment; typed
  `schedule` schema (Ch. 13).
- [code] CMS-editable + goal-personalised daily tips (Ch. 15).
- [code] Blog scheduled publishing, preview tokens, tags/related posts (Ch. 17).
- [code] Server-side image optimisation + reference-aware delete for media
  (Ch. 18).

**P3 — growth & polish**
- [code] Server-side analytics ingestion for anonymous funnel steps; reconcile
  dashboard revenue with Play reports (Ch. 16).
- [code] Dynamic per-post OG images; automated SEO validation (Ch. 19).
- [code] Marketing-page visual polish; desktop breakpoint refinement; real device
  screenshots once published (Ch. 07, 09).
- [code] Automated a11y (axe/Lighthouse) + Web Vitals budgets in CI (Ch. 21, 22).

## 3. User & Data Flows

```mermaid
flowchart LR
  P0[P0 unblock revenue] --> P1[P1 quality/safety]
  P1 --> P2[P2 product depth]
  P2 --> P3[P3 growth/polish]
```

## 4. Dependencies

- Cross-references every feature chapter; gated items depend on external accounts
  (Google Play) or operator credentials (Supabase).

## 5. Limitations & Known Issues

- P0 items are externally blocked (cannot be closed in-repo). The largest in-repo
  opportunity is the **testing/CI** gap (P1).

## 6. Planned Future Improvements

- This chapter *is* the improvement list; keep it synced with chapter Limitations
  as items are delivered.

---
**Source Files**
- All chapter "Planned Future Improvements" sections
- `00_INVENTORY.md` §8 (planned-item disposition)
