import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Pencil, Eye } from "lucide-react";
import { slugify, formatPostDate, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({ meta: [{ title: "Blog — Admin" }] }),
  component: BlogAdmin,
});

const EMPTY = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  seo_description: "",
  status: "draft" as "draft" | "published",
};

function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const db: any = supabase;
    const { data } = await db
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as BlogPost[]);
  }
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setForm(EMPTY);
    setEditing(false);
    setSlugTouched(false);
  }

  function edit(p: BlogPost) {
    setForm({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? "",
      body: p.body,
      cover_image_url: p.cover_image_url ?? "",
      seo_description: p.seo_description ?? "",
      status: p.status,
    });
    setEditing(true);
    setSlugTouched(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const db: any = supabase;
      const existing = posts.find((p) => p.id === form.id);
      const payload: any = {
        slug: (form.slug || slugify(form.title)).trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        cover_image_url: form.cover_image_url.trim() || null,
        seo_description: form.seo_description.trim() || null,
        status: form.status,
        published_at:
          form.status === "published" ? (existing?.published_at ?? new Date().toISOString()) : null,
      };
      const { error } =
        editing && form.id
          ? await db.from("blog_posts").update(payload).eq("id", form.id)
          : await db.from("blog_posts").insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(editing ? "Post updated" : "Post created");
      reset();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this post?")) return;
    const db: any = supabase;
    const { error } = await db.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  async function togglePublish(p: BlogPost) {
    const db: any = supabase;
    const next = p.status === "published" ? "draft" : "published";
    const { error } = await db
      .from("blog_posts")
      .update({
        status: next,
        published_at:
          next === "published" ? (p.published_at ?? new Date().toISOString()) : p.published_at,
      })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">
        Blog <span className="text-sm text-muted-foreground font-normal">({posts.length})</span>
      </h1>

      <form onSubmit={save} className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editing ? "Edit post" : "New post"}</h2>
          {editing && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            required
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
          />
          <p className="text-[11px] text-muted-foreground">/blog/{form.slug || "your-post"}</p>
        </div>

        <div className="space-y-1.5">
          <Label>Excerpt</Label>
          <Textarea
            rows={2}
            maxLength={300}
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            placeholder="One or two sentences shown on cards and in search results."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Cover image URL</Label>
          <Input
            type="url"
            value={form.cover_image_url}
            onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
            placeholder="https://…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Body (Markdown)</Label>
          <Textarea
            rows={14}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="font-mono text-xs"
            placeholder="# Heading&#10;&#10;Write your post in Markdown…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>SEO description (optional)</Label>
          <Input
            maxLength={200}
            value={form.seo_description}
            onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
            placeholder="Defaults to the excerpt."
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.status === "published"}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.checked ? "published" : "draft" }))
              }
            />
            Published
          </label>
          <Button type="submit" disabled={busy} className="ml-auto">
            {busy ? "Saving…" : editing ? "Update post" : "Create post"}
          </Button>
        </div>
      </form>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {posts.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No posts yet.</div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                    p.status === "published"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
                <p className="font-medium truncate">{p.title}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                /blog/{p.slug}
                {p.published_at ? ` · ${formatPostDate(p.published_at)}` : ""}
              </p>
            </div>
            <button
              onClick={() => togglePublish(p)}
              title={p.status === "published" ? "Unpublish" : "Publish"}
              className="text-muted-foreground hover:text-foreground"
            >
              <Eye className="size-4" />
            </button>
            <button
              onClick={() => edit(p)}
              title="Edit"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <button onClick={() => del(p.id)} title="Delete" className="text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
