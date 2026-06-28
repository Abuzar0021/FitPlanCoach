// Editable, site-wide content managed from the admin CMS and stored in the
// `app_settings` key/value table. One source of truth for the support email,
// social links, and the marketing announcement bar, so none of these are
// hardcoded across screens anymore.
//
// Reads:
//  - useSiteConfig() — authenticated app surfaces (RLS allows authed reads).
//  - getPublicSiteConfig() server fn — public marketing pages (see
//    site-config.functions.ts), since app_settings is not anon-readable.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SocialLinks {
  twitter: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
}

export interface Announcement {
  enabled: boolean;
  text: string;
  /** Optional link the bar points to. Empty = not clickable. */
  href: string;
}

export interface SiteConfig {
  support_email: string;
  social: SocialLinks;
  announcement: Announcement;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  support_email: "abuzarelahi01@gmail.com",
  social: { twitter: "", instagram: "", facebook: "", tiktok: "", youtube: "" },
  announcement: { enabled: false, text: "", href: "" },
};

/** app_settings keys that make up the public site config. */
export const SITE_CONFIG_KEYS = ["support_email", "social_links", "announcement"] as const;

type SettingRow = { key: string; value: unknown };

/** Merge raw app_settings rows over the defaults into a complete SiteConfig. */
export function mergeSiteConfig(rows: SettingRow[] | null | undefined): SiteConfig {
  const get = (k: string) => rows?.find((r) => r.key === k)?.value;
  const email = get("support_email");
  const social = get("social_links") as Partial<SocialLinks> | undefined;
  const announcement = get("announcement") as Partial<Announcement> | undefined;
  return {
    support_email:
      typeof email === "string" && email.trim() ? email.trim() : DEFAULT_SITE_CONFIG.support_email,
    social: { ...DEFAULT_SITE_CONFIG.social, ...(social ?? {}) },
    announcement: { ...DEFAULT_SITE_CONFIG.announcement, ...(announcement ?? {}) },
  };
}

/** Platforms in display order, with the matching SocialLinks key. */
export const SOCIAL_PLATFORMS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
];

/** Authenticated-side reader for the site config. */
export function useSiteConfig(): { config: SiteConfig; loading: boolean } {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const db: any = supabase;
      const { data } = await db
        .from("app_settings")
        .select("key,value")
        .in("key", SITE_CONFIG_KEYS as unknown as string[]);
      if (active) {
        setConfig(mergeSiteConfig(data));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { config, loading };
}
