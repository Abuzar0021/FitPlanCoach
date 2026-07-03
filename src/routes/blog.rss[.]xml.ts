import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://fitplancoach.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/blog/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db: any = supabaseAdmin;
        const now = new Date().toISOString();
        const { data } = await db
          .from("blog_posts")
          .select("slug,title,excerpt,seo_description,published_at,scheduled_at,updated_at,status")
          .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${now})`)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(50);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const posts = (data ?? []) as any[];
        const items = posts
          .map((p) => {
            const url = `${BASE_URL}/blog/${p.slug}`;
            const date = p.published_at ?? p.scheduled_at ?? p.updated_at;
            const desc = p.seo_description || p.excerpt || "";
            return `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${url}</link>
    <guid>${url}</guid>
    <pubDate>${new Date(date).toUTCString()}</pubDate>
    <description>${escapeXml(desc)}</description>
  </item>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>FitPlanCoach Blog</title>
  <link>${BASE_URL}/blog</link>
  <description>Training, nutrition, and habit guides from the FitPlanCoach team.</description>
  <language>en-us</language>
${items}
</channel>
</rss>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
