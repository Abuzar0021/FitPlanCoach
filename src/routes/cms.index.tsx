import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CmsHeader, CmsStatCard } from "@/components/cms/cms-ui";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle2,
  Clock,
  PenLine,
  FolderOpen,
  Tags,
  ImageIcon,
  Plus,
} from "lucide-react";
import { formatPostDate, effectivePublishDate, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/cms/")({
  head: () => ({ meta: [{ title: "Dashboard — Website CMS" }] }),
  component: CmsDashboard,
});

const db = supabase as any;

interface Counts {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  categories: number;
  tags: number;
  media: number;
}

function CmsDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    (async () => {
      const [posts, categories, tags, media, recentPosts] = await Promise.all([
        db.from("blog_posts").select("status", { count: "exact", head: false }),
        db.from("blog_categories").select("id", { count: "exact", head: true }),
        db.from("blog_tags").select("id", { count: "exact", head: true }),
        db.from("media_assets").select("id", { count: "exact", head: true }),
        db.from("blog_posts").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      for (const [label, result] of [
        ["posts", posts],
        ["categories", categories],
        ["tags", tags],
        ["media", media],
        ["recent posts", recentPosts],
      ] as const) {
        if (result.error) console.error(`[cms] dashboard failed to load ${label}`, result.error);
      }
      const rows: { status: string }[] = posts.data ?? [];
      setCounts({
        total: rows.length,
        published: rows.filter((r) => r.status === "published").length,
        draft: rows.filter((r) => r.status === "draft").length,
        scheduled: rows.filter((r) => r.status === "scheduled").length,
        categories: categories.count ?? 0,
        tags: tags.count ?? 0,
        media: media.count ?? 0,
      });
      setRecent((recentPosts.data ?? []) as BlogPost[]);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <CmsHeader
        title="Dashboard"
        subtitle="Publish and manage the fitplancoach.com blog — completely separate from the app's mobile-data admin."
        actions={
          <Button asChild>
            <Link to="/cms/articles/new">
              <Plus className="size-4 mr-1.5" /> New article
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CmsStatCard icon={FileText} label="Articles" value={counts?.total ?? "—"} />
        <CmsStatCard
          icon={CheckCircle2}
          label="Published"
          value={counts?.published ?? "—"}
          accent="text-primary"
        />
        <CmsStatCard icon={Clock} label="Scheduled" value={counts?.scheduled ?? "—"} />
        <CmsStatCard icon={PenLine} label="Drafts" value={counts?.draft ?? "—"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link to="/cms/categories">
          <CmsStatCard icon={FolderOpen} label="Categories" value={counts?.categories ?? "—"} />
        </Link>
        <Link to="/cms/tags">
          <CmsStatCard icon={Tags} label="Tags" value={counts?.tags ?? "—"} />
        </Link>
        <Link to="/cms/media">
          <CmsStatCard icon={ImageIcon} label="Media files" value={counts?.media ?? "—"} />
        </Link>
      </div>

      <div>
        <h2 className="label-overline mb-2">Recent activity</h2>
        <div className="surface-card divide-y divide-border overflow-hidden">
          {recent === null ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No articles yet — create your first one.
            </div>
          ) : (
            recent.map((p) => (
              <Link
                key={p.id}
                to="/cms/articles/$id"
                params={{ id: p.id }}
                className="p-4 flex items-center gap-3 hover:bg-muted/40 transition"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                    p.status === "published"
                      ? "bg-primary/15 text-primary"
                      : p.status === "scheduled"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
                <p className="font-medium truncate flex-1">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {effectivePublishDate(p)
                    ? formatPostDate(effectivePublishDate(p))
                    : formatPostDate(p.created_at)}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
