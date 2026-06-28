import { createServerFn } from "@tanstack/react-start";
import { mergeSiteConfig, SITE_CONFIG_KEYS, type SiteConfig } from "@/lib/site-config";

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
