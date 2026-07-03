import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://fitplancoach.com";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/download", changefreq: "weekly", priority: "0.9" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/refunds", changefreq: "yearly", priority: "0.4" },
  { path: "/delete-account", changefreq: "yearly", priority: "0.3" },
  { path: "/auth", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const lastmod = new Date().toISOString().slice(0, 10);

        // Append every live blog post (published, or scheduled and now due)
        // plus every category/tag/author page. Degrades gracefully to the
        // static list if the blog tables aren't available yet.
        let postEntries: Array<{
          path: string;
          changefreq: string;
          priority: string;
          lastmod: string;
        }> = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db: any = supabaseAdmin;
          const now = new Date().toISOString();
          const [{ data: posts }, { data: categories }, { data: tags }, { data: authors }] =
            await Promise.all([
              db
                .from("blog_posts")
                .select("slug,updated_at")
                .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${now})`),
              db.from("blog_categories").select("slug"),
              db.from("blog_tags").select("slug"),
              db.from("blog_authors").select("slug"),
            ]);
          postEntries = [
            ...(posts ?? []).map((p: any) => ({
              path: `/blog/${p.slug}`,
              changefreq: "monthly",
              priority: "0.6",
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : lastmod,
            })),
            ...(categories ?? []).map((c: any) => ({
              path: `/blog/category/${c.slug}`,
              changefreq: "weekly",
              priority: "0.5",
              lastmod,
            })),
            ...(tags ?? []).map((t: any) => ({
              path: `/blog/tag/${t.slug}`,
              changefreq: "weekly",
              priority: "0.4",
              lastmod,
            })),
            ...(authors ?? []).map((a: any) => ({
              path: `/blog/author/${a.slug}`,
              changefreq: "monthly",
              priority: "0.4",
              lastmod,
            })),
          ];
        } catch {
          /* keep static sitemap */
        }

        const all = [...entries.map((e) => ({ ...e, lastmod })), ...postEntries];
        const urls = all
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
