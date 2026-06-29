// Shared blog types and helpers. Body is Markdown; see lib/markdown for the
// safe renderer. Posts are authored in the admin and read publicly when
// published.

export type BlogStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  seo_description: string | null;
  status: BlogStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Card/list view — the columns the public index and sitemap need. */
export type BlogPostSummary = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "cover_image_url" | "published_at"
>;

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

/** Rough reading time at ~200 wpm, minimum one minute. */
export function readingTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
