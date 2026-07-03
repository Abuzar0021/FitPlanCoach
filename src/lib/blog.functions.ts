import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BlogPost,
  BlogPostSummary,
  BlogPostWithRelations,
  BlogCategory,
  BlogTag,
  BlogAuthor,
} from "@/lib/blog";
import { effectivePublishDate, isPostLive } from "@/lib/blog";

// Public reads. Run on the server with the service role and explicitly filter to
// live posts (published, or scheduled with scheduled_at in the past), so drafts
// and future-dated posts never leak regardless of the caller.

const PAGE_SIZE = 9;

/** PostgREST `.or()` expression matching "published" OR "scheduled and due". */
function liveFilter(): string {
  const now = new Date().toISOString();
  return `status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${now})`;
}

const SUMMARY_COLUMNS =
  "id,slug,title,excerpt,cover_image_url,published_at,scheduled_at,status,category:blog_categories(id,slug,name,description)";

function toSummary(row: any): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at,
    scheduled_at: row.scheduled_at,
    status: row.status,
    category: row.category ?? null,
  };
}

function sortByEffectiveDateDesc(posts: BlogPostSummary[]): BlogPostSummary[] {
  return [...posts].sort((a, b) => {
    const da = effectivePublishDate(a) ?? "";
    const db = effectivePublishDate(b) ?? "";
    return db.localeCompare(da);
  });
}

// A due-but-still-"scheduled" post has published_at = NULL, so ordering by
// published_at in SQL and paginating with .range() would silently drop it
// off page 1 even though it's the newest live post by effective date. Fetch
// a generous bounded window instead (blog post counts are small in
// practice) and paginate the effective-date-sorted result in JS — correct
// at the cost of an upper bound on total live posts this can paginate over.
const FETCH_WINDOW = 500;

function paginate<T>(sorted: T[], page: number): { items: T[]; hasMore: boolean } {
  const from = (page - 1) * PAGE_SIZE;
  return { items: sorted.slice(from, from + PAGE_SIZE), hasMore: sorted.length > from + PAGE_SIZE };
}

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ page: z.number().int().min(1).default(1) }).parse(d ?? {}),
  )
  .handler(
    async ({ data }): Promise<{ posts: BlogPostSummary[]; page: number; hasMore: boolean }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: rows } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .or(liveFilter())
        .order("created_at", { ascending: false })
        .limit(FETCH_WINDOW);
      const sorted = sortByEffectiveDateDesc((rows ?? []).map(toSummary));
      const { items, hasMore } = paginate(sorted, data.page);
      return { posts: items, page: data.page, hasMore };
    },
  );

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data } = await db.from("blog_categories").select("*").order("name");
    return (data ?? []) as BlogCategory[];
  },
);

export const listTags = createServerFn({ method: "GET" }).handler(async (): Promise<BlogTag[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const { data } = await db.from("blog_tags").select("*").order("name");
  return (data ?? []) as BlogTag[];
});

export const listPostsByCategory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().min(1).max(100), page: z.number().int().min(1).default(1) })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      category: BlogCategory | null;
      posts: BlogPostSummary[];
      page: number;
      hasMore: boolean;
    }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: category } = await db
        .from("blog_categories")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!category) return { category: null, posts: [], page: data.page, hasMore: false };
      const { data: rows } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("category_id", category.id)
        .or(liveFilter())
        .order("created_at", { ascending: false })
        .limit(FETCH_WINDOW);
      const sorted = sortByEffectiveDateDesc((rows ?? []).map(toSummary));
      const { items, hasMore } = paginate(sorted, data.page);
      return { category: category as BlogCategory, posts: items, page: data.page, hasMore };
    },
  );

export const listPostsByTag = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().min(1).max(100), page: z.number().int().min(1).default(1) })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      tag: BlogTag | null;
      posts: BlogPostSummary[];
      page: number;
      hasMore: boolean;
    }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: tag } = await db
        .from("blog_tags")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!tag) return { tag: null, posts: [], page: data.page, hasMore: false };
      const { data: links } = await db
        .from("blog_post_tags")
        .select("post_id")
        .eq("tag_id", tag.id);
      const postIds: string[] = (links ?? []).map((l: any) => l.post_id);
      if (postIds.length === 0)
        return { tag: tag as BlogTag, posts: [], page: data.page, hasMore: false };
      const { data: rows } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .in("id", postIds)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false });
      const sorted = sortByEffectiveDateDesc((rows ?? []).map(toSummary));
      const { items, hasMore } = paginate(sorted, data.page);
      return { tag: tag as BlogTag, posts: items, page: data.page, hasMore };
    },
  );

export const getAuthorBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().min(1).max(100), page: z.number().int().min(1).default(1) })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      author: BlogAuthor | null;
      posts: BlogPostSummary[];
      page: number;
      hasMore: boolean;
    }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: author } = await db
        .from("blog_authors")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!author) return { author: null, posts: [], page: data.page, hasMore: false };
      const { data: rows } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("author_ref_id", author.id)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false });
      const sorted = sortByEffectiveDateDesc((rows ?? []).map(toSummary));
      const { items, hasMore } = paginate(sorted, data.page);
      return { author: author as BlogAuthor, posts: items, page: data.page, hasMore };
    },
  );

export const searchPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ q: z.string().max(120) }).parse(d))
  .handler(async ({ data }): Promise<BlogPostSummary[]> => {
    const query = data.q.trim();
    if (query.length < 2) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const like = `%${query.replace(/[%_]/g, "")}%`;
    const { data: rows } = await db
      .from("blog_posts")
      .select(SUMMARY_COLUMNS)
      .or(liveFilter())
      .or(`title.ilike.${like},excerpt.ilike.${like},body.ilike.${like}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(30);
    return sortByEffectiveDateDesc((rows ?? []).map(toSummary));
  });

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(d))
  .handler(async ({ data }): Promise<BlogPostWithRelations | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: post } = await db
      .from("blog_posts")
      .select(
        "*, category:blog_categories(id,slug,name,description), author:blog_authors(id,slug,name,bio,avatar_url), post_tags:blog_post_tags(tag:blog_tags(id,slug,name))",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (!post || !isPostLive(post)) return null;
    const tags: BlogTag[] = ((post as any).post_tags ?? [])
      .map((pt: any) => pt.tag)
      .filter(Boolean);
    const { post_tags: _postTags, ...rest } = post as any;
    return {
      ...(rest as BlogPost),
      category: (post as any).category ?? null,
      author: (post as any).author ?? null,
      tags,
    };
  });

/** Up to `limit` other live posts in the same category, excluding this one. */
export const listRelatedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        categoryId: z.string().uuid().nullable(),
        limit: z.number().int().min(1).max(6).default(3),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<BlogPostSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    let rows: any[] = [];
    if (data.categoryId) {
      const { data: r } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("category_id", data.categoryId)
        .neq("id", data.postId)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(data.limit);
      rows = r ?? [];
    }
    if (rows.length < data.limit) {
      const { data: r } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .neq("id", data.postId)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(data.limit * 2);
      const existing = new Set(rows.map((x) => x.id));
      for (const r2 of r ?? []) {
        if (rows.length >= data.limit) break;
        if (!existing.has(r2.id)) rows.push(r2);
      }
    }
    return sortByEffectiveDateDesc(rows.slice(0, data.limit).map(toSummary));
  });

/** The chronologically previous/next live post relative to a given publish date. */
export const listAdjacentPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), effectiveDate: z.string().min(1) }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ prev: BlogPostSummary | null; next: BlogPostSummary | null }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: rows } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .or(liveFilter())
        .neq("id", data.postId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(500);
      const sorted = sortByEffectiveDateDesc((rows ?? []).map(toSummary));
      const target = data.effectiveDate;
      // sorted is newest-first: "next" (newer) is the closest entry with a later
      // date, "prev" (older) is the closest entry with an earlier date.
      let prev: BlogPostSummary | null = null;
      let next: BlogPostSummary | null = null;
      for (const p of sorted) {
        const d = effectivePublishDate(p) ?? "";
        if (d < target && !prev) prev = p;
        if (d > target) next = p;
      }
      return { prev, next };
    },
  );
