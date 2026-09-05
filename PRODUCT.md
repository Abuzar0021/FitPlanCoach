# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- The Android app (com.fitplancoach.app) is a Capacitor shell whose WebView
loads the live site via server.url, so the app screens ARE the website's authed
routes. Per Impeccable's rule, a native wrapper around a website does not make
its design language native — this is web, delivered inside an Android shell. -->

## Users

Primary: **budget-conscious people who want structured fitness and nutrition but
are priced out of personal trainers and meal-prep services** (confirmed by the
user). They want coaching-grade structure at a price they can sustain.

## Product Purpose

Generates personalized meal plans and workouts calculated from the user's body
metrics, goals, schedule, equipment, food preferences and budget, then tracks
weight, food intake and training sessions against those plans. Success is the
user staying consistent long enough to see a trend move.

Free gives a limited number of generated plans (default 3, admin-configurable
via `free_plan_limit`) plus basic tracking. Pro unlocks unlimited regeneration,
a weekly meal and workout refresh, and full progress tracking.

## Positioning

Budget is a **first-class planning input**, not a filter applied afterward:
meals are generated to hit macro targets within what the user can actually
afford to eat. Combined with $2/month pricing, the product occupies the gap
between free generic plans and unaffordable human coaching.

## Operating Context

Confirmed usage scenes, in the user's own priority:

1. **Kitchen or grocery shopping** — checking today's meals, following a recipe,
   working through the aggregated shopping list.
2. **Quick daily check-in** — logging weight or food, seeing whether they are on
   track today.
3. **Weekly planning session** — reviewing progress and setting up the week.

Explicitly **not** a mid-workout companion. The user ruled that scene out, so
gym-side glanceability (huge tap targets, current-exercise-first, sweaty
one-handed use) is not a design driver here.

Delivery: one codebase serves a public marketing site and the authed app on the
same domain. App screens ship with the website — installed apps pick up changes
on next launch, with no Play release.

## Capabilities and Constraints

- **Onboarding**: body metrics, activity level, goals, food preferences,
  allergies, available equipment, training days per week.
- **Meals**: daily meals matched to macros and budget, respecting allergies and
  disliked foods; one-tap swap for an equivalent meal.
- **Shopping list**: the week's meals aggregated into one grocery list.
- **Workouts**: gym / home / hybrid, three to six days, beginner to advanced,
  with progressive overload built in.
- **Progress**: weight trend, workout streak, calorie and protein adherence.
- **Weekly regeneration**: Pro only.
- **Billing**: premium is sold *only* through Google Play Billing inside the
  Android app ($2/month, $20/year). No web payments exist. Entitlement is
  derived server-side from the Play Developer API, kept current by RTDN.
- **Stack**: TanStack Start (React 19, file-based routes), Tailwind v4, Supabase
  with row-level security, Capacitor 7 Android shell, self-hosted via Docker on
  a VPS behind Caddy.
- **Auth**: email + password only. No OAuth providers.
- **Android**: targetSdkVersion 36, so Android 15/16 lays the app out
  edge-to-edge; safe-area insets are applied in `MobileShell`, onboarding and
  the auth screen.
- **Not medical advice** — stated in the FAQ and must remain true of any copy.

## Brand Commitments

Name: **FitPlanCoach**. Existing `Logo` component and app icon. Android package
`com.fitplancoach.app`. No other identity constraints were made binding.

## Evidence on Hand

- **Testimonials are real** (confirmed by the user): Marcus T. (lost 8 kg in
  four months), Priya K. (first-time lifter), Jordan R. (busy parent of two).
  Names are abbreviated for privacy; quotes are genuine. Safe to feature.
- Live Google Play listing, published, versionCode 2 / versionName 1.0.1.
- Purchase → entitlement → refund verified end to end against real money.
- **No** published benchmarks, press coverage, case studies, user counts, or
  awards exist. Future work must not invent them.

## Product Principles

1. **Budget is a planning input.** Anything that presents meals or plans should
   be able to answer "can this person afford this?", because that is the
   product's actual differentiator.
2. **One clear path.** The user came because conflicting advice paralysed them.
   Surfaces should say what to do today before offering choice.
3. **Consistency is the success metric.** Trends, streaks and adherence matter
   more than any single day's numbers.
4. **Earn the upgrade honestly.** Pro is $2. Gating should feel like a fair
   trade, never like the free tier was sabotaged.
