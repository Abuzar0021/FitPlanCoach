import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense-config";
import { isAndroidApp } from "@/lib/billing";

/**
 * A single Google AdSense ad unit. Renders nothing until `slot` is set (an
 * ad unit id from the AdSense dashboard) — so every placement in the app is
 * inert until you configure it, never a hardcoded id shipped to production
 * by accident.
 *
 * The `<ins class="adsbygoogle">` markup itself is deterministic between
 * server and client render (driven only by the build-time `slot` value) to
 * avoid any hydration mismatch; only the imperative `push({})` call that
 * actually requests an ad is gated to the browser, and skipped entirely
 * inside the native Android app shell — the loader script still loads
 * globally there (see __root.tsx) because that's required for AdSense
 * verification, but no ad slot ever actually fills or renders inside the
 * app, so there is no visual or functional change to the Android/iOS build.
 */
export function AdSlot({
  slot,
  format = "auto",
  className,
  label = "Advertisement",
}: {
  slot: string;
  format?: string;
  className?: string;
  label?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || isAndroidApp() || pushed.current) return;
    pushed.current = true;
    try {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || [];
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      // AdSense script unavailable (ad blocker, offline, not yet approved) —
      // degrade to no ad rather than a broken page.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div className={className} data-ad-placement={label}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        aria-hidden="true"
      />
    </div>
  );
}
