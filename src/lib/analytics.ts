// Vendor-agnostic analytics. Instrument the product once here, then choose a
// provider (GA4, Plausible, PostHog, a tag manager…) later by reading
// window.dataLayer — no further app changes required.
//
// Design goals:
//  - SSR-safe: every entry point no-ops on the server.
//  - Full-funnel: every event is pushed to window.dataLayer, so a future
//    analytics snippet captures the whole journey, including anonymous
//    marketing-site visits and Google Play clicks.
//  - Owner dashboard: when a Supabase session exists, events are also
//    persisted (best-effort) to the analytics_events table that powers the
//    admin metrics. RLS already restricts inserts to the signed-in user.
//  - Never throws: analytics must not be able to break a user flow.

import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Canonical launch funnel events. Strings are allowed for ad-hoc events. */
export type AnalyticsEvent =
  | "page_view"
  | "play_store_click"
  | "web_signup_click"
  | "signup"
  | "login"
  | "onboarded"
  | "plan_generated"
  | "meal_generated"
  | "subscription_purchased";

type Meta = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function track(event: AnalyticsEvent | (string & {}), meta: Meta = {}): void {
  if (typeof window === "undefined") return;
  try {
    (window.dataLayer ??= []).push({ event, ...meta, ts: Date.now() });
  } catch {
    /* never break the app for analytics */
  }
  void persist(event, meta);
}

async function persist(event: string, meta: Meta): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    // Anonymous events are captured via dataLayer only (RLS blocks the insert).
    if (!userId) return;
    await supabase
      .from("analytics_events")
      .insert({ user_id: userId, event, meta: Object.keys(meta).length ? meta : null });
  } catch {
    /* swallow — analytics is best-effort */
  }
}

/** Fires a `page_view` on every route change. Mount once near the app root. */
export function usePageView(): void {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
}
