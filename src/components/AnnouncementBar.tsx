import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { getPublicSiteConfig } from "@/lib/site-config.functions";
import { DEFAULT_SITE_CONFIG, type Announcement } from "@/lib/site-config";

const DISMISS_KEY = "myfp:announcement_dismissed";

/**
 * Admin-controlled marketing banner. Renders nothing until the config loads and
 * confirms it's enabled and not already dismissed, so there's no SSR flash.
 * Dismissal is keyed to the message text, so a new announcement reappears.
 */
export function AnnouncementBar() {
  const fetchConfig = useServerFn(getPublicSiteConfig);
  const [a, setA] = useState<Announcement>(DEFAULT_SITE_CONFIG.announcement);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setA(c.announcement);
        let dismissed = false;
        try {
          dismissed = localStorage.getItem(DISMISS_KEY) === c.announcement.text;
        } catch {
          /* ignore */
        }
        setVisible(c.announcement.enabled && !!c.announcement.text && !dismissed);
      })
      .catch(() => {});
  }, [fetchConfig]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, a.text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-10 py-2 flex items-center justify-center text-xs font-semibold">
        {a.href ? (
          <a href={a.href} className="hover:underline truncate">
            {a.text}
          </a>
        ) : (
          <span className="truncate">{a.text}</span>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 inline-flex items-center justify-center size-5 rounded hover:bg-black/10"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
