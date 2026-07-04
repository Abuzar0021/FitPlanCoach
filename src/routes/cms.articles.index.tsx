import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CmsHeader } from "@/components/cms/cms-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatPostDate, effectivePublishDate, type BlogPost, type BlogCategory } from "@/lib/blog";

export const Route = createFileRoute("/cms/articles/")({
  head: () => ({ meta: [{ title: "Articles — Website CMS" }] }),
  component: ArticlesList,
});

const db = supabase as any;
const PAGE_SIZE = 20;
const STATUS_TABS = ["all", "draft", "scheduled", "published"] as const;

type Row = BlogPost & { category: BlogCategory | null };

function ArticlesList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    setRows(null);
    // Plain select + a separate batched category lookup, not an embedded
    // `category:blog_categories(...)` — embeds need PostgREST's schema
    // cache to already know about the foreign key, which can lag right
    // after adding one via the SQL editor.
    let query = db
      .from("blog_posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[cms] failed to load articles", error);
      toast.error(`Could not load articles: ${error.message}`);
      setRows([]);
      setTotal(0);
      return;
    }
    const categoryIds = [...new Set((data ?? []).map((p: any) => p.category_id).filter(Boolean))];
    let categories: BlogCategory[] = [];
    if (categoryIds.length > 0) {
      const { data: catRows, error: catErr } = await db
        .from("blog_categories")
        .select("id,slug,name,description")
        .in("id", categoryIds);
      if (catErr) console.error("[cms] failed to load categories", catErr);
      categories = (catRows ?? []) as BlogCategory[];
    }
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    setRows(
      (data ?? []).map((p: any) => ({
        ...p,
        category: categoryMap.get(p.category_id) ?? null,
      })) as Row[],
    );
    setTotal(count ?? 0);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function del(post: Row) {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    const { error } = await db.from("blog_posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <CmsHeader
        title={
          <>
            Articles{" "}
            {total > 0 && (
              <span className="text-sm text-muted-foreground font-normal">({total})</span>
            )}
          </>
        }
        actions={
          <Button asChild>
            <Link to="/cms/articles/new">
              <Plus className="size-4 mr-1.5" /> New article
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                status === s
                  ? "bg-card shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="pl-8"
          />
        </div>
      </div>

      <div className="surface-card divide-y divide-border overflow-hidden">
        {rows === null ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 h-16 bg-muted/30 animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {q || status !== "all"
              ? "No articles match."
              : "No articles yet — create your first one."}
          </div>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                  {p.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {p.category.name}
                    </Badge>
                  )}
                  <p className="font-medium truncate">{p.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  /blog/{p.slug}
                  {effectivePublishDate(p) ? ` · ${formatPostDate(effectivePublishDate(p))}` : ""}
                </p>
              </div>
              <Link
                to="/cms/articles/$id"
                params={{ id: p.id }}
                aria-label={`Edit ${p.title}`}
                className="size-8 rounded-lg hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                onClick={() => del(p)}
                title="Delete"
                aria-label={`Delete ${p.title}`}
                className="size-8 rounded-lg hover:bg-destructive/10 inline-flex items-center justify-center text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
