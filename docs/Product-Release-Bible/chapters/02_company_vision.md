# 02. Company Vision

**Status:** Implemented (positioning derived from product decisions in code)
**Last verified against commit:** 26c8ce4 · 2026-06-29

## 1. Purpose & Scope

The "why" behind FitPlanCoach, stated honestly and derived from the choices the
codebase actually makes — not aspirational claims. No invented traction, funding,
or team facts appear here; where a claim would require evidence the repo can't
provide, it is omitted.

## 2. Implementation

The product's vision is legible in three engineering decisions:

1. **Accessible, explainable coaching over AI hype.** Personalisation is a
   deterministic rule engine (`fitness-engine.ts`), not an LLM. The implied
   promise: plans you can trust and reproduce, with no per-user inference cost —
   which keeps the product affordable and globally scalable.
2. **Global from day one.** A 199-country dataset (`countries.ts`) and
   country/budget-aware meal selection (`pickFoods`) show an intent to serve
   users outside high-income, Western-default fitness apps — including
   budget-tiered food choices.
3. **Android-first, fair monetisation.** Memberships are sold only via Google
   Play Billing (`LAUNCH.md` §6), with a usable free tier (a configurable
   free plan-generation limit) and a single Pro upgrade — not a maze of tiers.

**Positioning statement (grounded):** *FitPlanCoach gives anyone, anywhere a
personalised, culturally-aware nutrition and training plan in minutes — built on
transparent sports-science rules, free to start, with an affordable Pro upgrade
through Google Play.*

## 3. User & Data Flows

Vision maps to the funnel the analytics layer already instruments
(`analytics.ts`): `page_view → web_signup_click/play_store_click → signup →
onboarded → plan_generated → subscription_purchased`. The product is built to
move a visitor from "curious" to "coached" to "retained" (streaks/achievements)
to "subscriber".

## 4. Dependencies

- Product surfaces (Ch. 03), the engine (Ch. 13, 14), billing model (Ch. 12),
  analytics funnel (Ch. 16).

## 5. Limitations & Known Issues

- This chapter intentionally contains **no** market-size, revenue, or user-count
  claims — none are evidenced in the repository.
- Vision is inferred from code and `LAUNCH.md`; any formal company strategy doc
  lives outside this repo and is not represented here.

## 6. Planned Future Improvements

- If a formal vision/strategy artifact is created, fold its verifiable parts here
  and cross-reference.

---
**Source Files**
- `src/lib/fitness-engine.ts`, `src/lib/countries.ts`, `src/lib/analytics.ts`
- `docs/LAUNCH.md`
