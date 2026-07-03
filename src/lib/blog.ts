// Shared blog types and helpers. Legacy posts (content_html IS NULL) render
// from the Markdown `body` column via lib/markdown; posts authored in the
// website CMS (/cms) store sanitized rich-text HTML in `content_html` and
// render that instead. Published (and due-scheduled) posts are read publicly.

export type BlogStatus = "draft" | "published" | "scheduled";

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
}

export interface BlogAuthor {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  content_html: string | null;
  cover_image_url: string | null;
  featured_image_alt: string | null;
  seo_description: string | null;
  seo_title: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  twitter_card: string;
  status: BlogStatus;
  author_id: string | null;
  category_id: string | null;
  author_ref_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A post as returned by the public read paths, with its relations resolved. */
export interface BlogPostWithRelations extends BlogPost {
  category: BlogCategory | null;
  author: BlogAuthor | null;
  tags: BlogTag[];
}

/** Card/list view — the columns the public index and sitemap need. */
export type BlogPostSummary = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image_url"
  | "published_at"
  | "scheduled_at"
  | "status"
> & { category: BlogCategory | null };

/** URL-safe slug from a title. Matches the DB CHECK constraint. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPostDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * A post is publicly live once it's published, or once a scheduled post's
 * scheduled_at has passed — computed at read time, so no cron/worker is
 * needed to "flip" a scheduled post live.
 */
export function isPostLive(post: Pick<BlogPost, "status" | "scheduled_at">): boolean {
  if (post.status === "published") return true;
  if (post.status === "scheduled" && post.scheduled_at) {
    return new Date(post.scheduled_at).getTime() <= Date.now();
  }
  return false;
}

/** The date to display/sort by for a live post: published_at, else scheduled_at. */
export function effectivePublishDate(
  post: Pick<BlogPost, "published_at" | "scheduled_at">,
): string | null {
  return post.published_at ?? post.scheduled_at ?? null;
}

/** Strips tags down to plain text — used for reading time, TOC labels, and
 * the legacy `body` fallback stored alongside CMS-authored `content_html`. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rough reading time at ~200 wpm, minimum one minute. Works for HTML or Markdown. */
export function readingTimeMinutes(bodyOrHtml: string, isHtml = false): number {
  const text = isHtml ? stripHtml(bodyOrHtml) : bodyOrHtml;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function readingTimeForPost(post: Pick<BlogPost, "content_html" | "body">): number {
  return post.content_html
    ? readingTimeMinutes(post.content_html, true)
    : readingTimeMinutes(post.body, false);
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Injects stable `id` attributes into every h2/h3 in sanitized article HTML
 * and returns both the annotated HTML and the resulting table of contents.
 * Regex-based (not a DOM parse) so it runs identically on the server and in
 * the browser — Tiptap's output is well-formed, non-nested heading markup,
 * so this is reliable in practice.
 */
export function annotateHeadingsForToc(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();
  const annotated = html.replace(
    /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs = "", inner: string) => {
      const text = stripHtml(inner);
      let id = slugify(text) || "section";
      const count = seen.get(id) ?? 0;
      seen.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      const level = (tag.toLowerCase() === "h2" ? 2 : 3) as 2 | 3;
      toc.push({ id, text, level });
      const cleanedAttrs = (attrs ?? "").replace(/\sid="[^"]*"/gi, "");
      return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
    },
  );
  return { html: annotated, toc };
}
