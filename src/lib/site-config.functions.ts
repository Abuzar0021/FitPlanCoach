import { useEffect, useState } from "react";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import {
  DEFAULT_SITE_CONFIG,
  mergeSiteConfig,
  SITE_CONFIG_KEYS,
  type SiteConfig,
} from "@/lib/site-config";

// Public, unauthenticated read of the site config. `app_settings` is not
// anon-readable under RLS, so we read the whitelisted keys with the service
// role on the server and return only the safe, public-facing fields.
export const getPublicSiteConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data } = await db
      .from("app_settings")
      .select("key,value")
      .in("key", SITE_CONFIG_KEYS as unknown as string[]);
    return mergeSiteConfig(data ?? []);
  },
);

// Client hook for public pages that just need the (admin-editable) support
// email — falls back to the default until the fetch resolves.
export function useSupportEmail(): string {
  const fetchConfig = useServerFn(getPublicSiteConfig);
  const [email, setEmail] = useState(DEFAULT_SITE_CONFIG.support_email);
  useEffect(() => {
    fetchConfig()
      .then((c) => setEmail(c.support_email))
      .catch(() => {});
  }, [fetchConfig]);
  return email;
}
