import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Loader2, X } from "lucide-react";
import {
  slugify,
  stripHtml,
  type BlogCategory,
  type BlogTag,
  type BlogAuthor,
  type BlogStatus,
} from "@/lib/blog";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { MediaPicker } from "@/components/MediaPicker";
import { RichTextEditor } from "./RichTextEditor";

const db = supabase as any;

interface FormState {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string;
  featuredImageAlt: string;
  categoryId: string;
  authorRefId: string;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  twitterCard: string;
  status: BlogStatus;
  scheduledAtLocal: string;
}

function emptyForm(): FormState {
  return {
    id: "",
    slug: "",
    title: "",
    excerpt: "",
    contentHtml: "",
    coverImageUrl: "",
    featuredImageAlt: "",
    categoryId: "",
    authorRefId: "",
    tagIds: [],
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    ogImageUrl: "",
    twitterCard: "summary_large_image",
    status: "draft",
    scheduledAtLocal: "",
  };
}

/** yyyy-MM-ddTHH:mm for <input type="datetime-local">, in the browser's local time. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticleForm({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(postId));
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: tagRows }, { data: authorRows }] = await Promise.all([
        db.from("blog_categories").select("*").order("name"),
        db.from("blog_tags").select("*").order("name"),
        db.from("blog_authors").select("*").order("name"),
      ]);
      setCategories((cats ?? []) as BlogCategory[]);
      setTags((tagRows ?? []) as BlogTag[]);
      setAuthors((authorRows ?? []) as BlogAuthor[]);

      if (postId) {
        // Two plain queries instead of an embedded `post_tags:blog_post_tags(...)`
        // select — embeds need PostgREST's schema cache to already know about
        // the foreign key, which can lag right after adding one via the SQL
        // editor ("Could not find a relationship..."). A plain select + a
        // second lookup only needs each table to exist, which is far less
        // fragile for tables this new.
        const [{ data: post, error }, { data: tagLinks, error: tagLinkErr }] = await Promise.all([
          db.from("blog_posts").select("*").eq("id", postId).maybeSingle(),
          db.from("blog_post_tags").select("tag_id").eq("post_id", postId),
        ]);
        if (error) console.error("[cms] failed to load article", error);
        if (tagLinkErr) console.error("[cms] failed to load article tags", tagLinkErr);
        if (error || !post) {
          toast.error(error ? `Could not load article: ${error.message}` : "Article not found");
          navigate({ to: "/cms/articles" });
          return;
        }
        setForm({
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt ?? "",
          contentHtml: post.content_html ?? "",
          coverImageUrl: post.cover_image_url ?? "",
          featuredImageAlt: post.featured_image_alt ?? "",
          categoryId: post.category_id ?? "",
          authorRefId: post.author_ref_id ?? authorRows?.[0]?.id ?? "",
          tagIds: (tagLinks ?? []).map((t: any) => t.tag_id),
          seoTitle: post.seo_title ?? "",
          seoDescription: post.seo_description ?? "",
          canonicalUrl: post.canonical_url ?? "",
          ogImageUrl: post.og_image_url ?? "",
          twitterCard: post.twitter_card ?? "summary_large_image",
          status: post.status,
          scheduledAtLocal: toLocalInputValue(post.scheduled_at),
        });
      } else if (authorRows && authorRows.length > 0) {
        setForm((f) => ({ ...f, authorRefId: authorRows[0].id }));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(id: string) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    const slug = slugify(name);
    const { data, error } = await db.from("blog_tags").insert({ slug, name }).select("*").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setTags((prev) => [...prev, data as BlogTag].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, tagIds: [...f.tagIds, data.id] }));
    setNewTagName("");
  }

  async function save(status: BlogStatus) {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.contentHtml.trim() || form.contentHtml === "<p></p>") {
      toast.error("Article content can't be empty");
      return;
    }
    if (status === "scheduled" && !form.scheduledAtLocal) {
      toast.error("Pick a date and time to schedule this for");
      return;
    }
    setSaving(true);
    try {
      const slug = (form.slug || slugify(form.title)).trim();
      const contentHtml = sanitizeArticleHtml(form.contentHtml);
      const body =
        stripHtml(contentHtml).slice(0, 20000) || form.excerpt.trim() || form.title.trim();
      const scheduledAtIso = form.scheduledAtLocal
        ? new Date(form.scheduledAtLocal).toISOString()
        : null;
      const payload = {
        slug,
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        body,
        content_html: contentHtml,
        cover_image_url: form.coverImageUrl.trim() || null,
        featured_image_alt: form.featuredImageAlt.trim() || null,
        category_id: form.categoryId || null,
        author_ref_id: form.authorRefId || null,
        seo_title: form.seoTitle.trim() || null,
        seo_description: form.seoDescription.trim() || null,
        canonical_url: form.canonicalUrl.trim() || null,
        og_image_url: form.ogImageUrl.trim() || form.coverImageUrl.trim() || null,
        twitter_card: form.twitterCard,
        status,
        scheduled_at: status === "scheduled" ? scheduledAtIso : null,
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      let id = form.id;
      if (id) {
        const { error } = await db.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("blog_posts").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      await db.from("blog_post_tags").delete().eq("post_id", id);
      if (form.tagIds.length > 0) {
        const { error: tagErr } = await db
          .from("blog_post_tags")
          .insert(form.tagIds.map((tag_id) => ({ post_id: id, tag_id })));
        if (tagErr) throw tagErr;
      }

      toast.success(
        status === "published" ? "Published" : status === "scheduled" ? "Scheduled" : "Draft saved",
      );
      navigate({ to: "/cms/articles" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the article");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!form.id || !confirm(`Delete "${form.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const { error } = await db.from("blog_posts").delete().eq("id", form.id);
      if (error) throw error;
      toast.success("Deleted");
      navigate({ to: "/cms/articles" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading article…
      </div>
    );
  }

  const busy = saving || deleting;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 pb-24">
      <div className="space-y-4 min-w-0">
        <div className="surface-card p-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
              }}
              placeholder="Best Home Workout For Beginners"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
            />
            <p className="text-[11px] text-muted-foreground">/blog/{form.slug || "your-article"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              rows={2}
              maxLength={300}
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
              placeholder="One or two sentences shown on cards and in search results."
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Content</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="size-4 mr-1.5" /> Edit
                </>
              ) : (
                <>
                  <Eye className="size-4 mr-1.5" /> Preview
                </>
              )}
            </Button>
          </div>
          {showPreview ? (
            <div className="surface-card p-6">
              <article
                className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html:
                    form.contentHtml ||
                    "<p class='text-muted-foreground'>Nothing to preview yet.</p>",
                }}
              />
            </div>
          ) : (
            <RichTextEditor
              value={form.contentHtml}
              onChange={(html) => update("contentHtml", html)}
            />
          )}
        </div>

        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">SEO</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input
                id="seoTitle"
                maxLength={70}
                value={form.seoTitle}
                onChange={(e) => update("seoTitle", e.target.value)}
                placeholder="Defaults to the article title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                value={form.canonicalUrl}
                onChange={(e) => update("canonicalUrl", e.target.value)}
                placeholder={`https://fitplancoach.com/blog/${form.slug || "your-article"}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription">Meta description</Label>
            <Textarea
              id="seoDescription"
              rows={2}
              maxLength={200}
              value={form.seoDescription}
              onChange={(e) => update("seoDescription", e.target.value)}
              placeholder="Defaults to the excerpt."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Open Graph image</Label>
              <MediaPicker
                value={form.ogImageUrl}
                onChange={(url) => update("ogImageUrl", url)}
                label="OG image"
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to the featured image below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Twitter card type</Label>
              <Select value={form.twitterCard} onValueChange={(v) => update("twitterCard", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary_large_image">Summary with large image</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Publish</h2>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as BlogStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.status === "scheduled" && (
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Publish date &amp; time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAtLocal}
                onChange={(e) => update("scheduledAtLocal", e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Button type="button" disabled={busy} onClick={() => save(form.status)}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Save"}
            </Button>
            {form.status !== "published" && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => save("published")}
              >
                Publish now
              </Button>
            )}
            {form.id && (
              <Button type="button" variant="destructive" disabled={busy} onClick={remove}>
                <Trash2 className="size-4 mr-1.5" /> {deleting ? "Deleting…" : "Delete article"}
              </Button>
            )}
          </div>
        </div>

        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Category</h2>
          <Select
            value={form.categoryId || "none"}
            onValueChange={(v) => update("categoryId", v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Author</h2>
          <Select value={form.authorRefId} onValueChange={(v) => update("authorRefId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an author" />
            </SelectTrigger>
            <SelectContent>
              {authors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge
                key={t.id}
                variant={form.tagIds.includes(t.id) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleTag(t.id)}
              >
                {t.name}
                {form.tagIds.includes(t.id) && <X className="size-3 ml-1" />}
              </Badge>
            ))}
            {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet.</p>}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createTag();
                }
              }}
              placeholder="New tag name"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="outline" onClick={createTag}>
              Add
            </Button>
          </div>
        </div>

        <div className="surface-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Featured image</h2>
          <MediaPicker
            value={form.coverImageUrl}
            onChange={(url) => update("coverImageUrl", url)}
            label="Featured image"
          />
          <div className="space-y-1.5">
            <Label htmlFor="alt">Alt text</Label>
            <Input
              id="alt"
              value={form.featuredImageAlt}
              onChange={(e) => update("featuredImageAlt", e.target.value)}
              placeholder="Describe the image for accessibility & SEO"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
