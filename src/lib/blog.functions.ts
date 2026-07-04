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
//
// Deliberately does NOT use PostgREST's relationship-embedding syntax
// (`select("*, category:blog_categories(...)")`). Embeds require Supabase's
// PostgREST schema cache to already know about the foreign key, and that
// cache can lag right after adding a new FK via the SQL editor — the
// well-known "Could not find a relationship between X and Y in the schema
// cache" error. blog_categories/blog_authors/blog_post_tags are all brand
// new tables, so every read here fetches the base row with a plain
// `select("*")`/explicit column list, then resolves category/author/tags
// with their own simple `.eq()`/`.in()` queries and joins them in memory.
// Slightly more round trips, but each query only needs the cache to know a
// table exists, never a relationship — and every failure is logged instead
// of silently swallowed, so a real error shows up in server logs instead of
// masquerading as "post not found".

const PAGE_SIZE = 9;

/** PostgREST `.or()` expression matching "published" OR "scheduled and due". */
function liveFilter(): string {
  const now = new Date().toISOString();
  return `status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${now})`;
}

const SUMMARY_COLUMNS =
  "id,slug,title,excerpt,cover_image_url,published_at,scheduled_at,status,category_id";

/** Batches a category lookup for a set of rows carrying category_id, keyed by id. */
async function loadCategoriesByIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  rows: Array<{ category_id?: string | null }>,
): Promise<Map<string, BlogCategory>> {
  const ids = [...new Set(rows.map((r) => r.category_id).filter((v): v is string => Boolean(v)))];
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("blog_categories")
    .select("id,slug,name,description")
    .in("id", ids);
  if (error) {
    console.error("[blog] failed to load categories", error);
    return new Map();
  }
  return new Map((data ?? []).map((c: BlogCategory) => [c.id, c]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(row: any, categories: Map<string, BlogCategory>): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at,
    scheduled_at: row.scheduled_at,
    status: row.status,
    category: row.category_id ? (categories.get(row.category_id) ?? null) : null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabaseAdmin;
      const { data: rows, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .or(liveFilter())
        .order("created_at", { ascending: false })
        .limit(FETCH_WINDOW);
      if (error) {
        console.error("[blog] failed to list published posts", error);
        return { posts: [], page: data.page, hasMore: false };
      }
      const categories = await loadCategoriesByIds(db, rows ?? []);
      const sorted = sortByEffectiveDateDesc(
        (rows ?? []).map((r: any) => toSummary(r, categories)),
      );
      const { items, hasMore } = paginate(sorted, data.page);
      return { posts: items, page: data.page, hasMore };
    },
  );

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { data, error } = await db.from("blog_categories").select("*").order("name");
    if (error) console.error("[blog] failed to list categories", error);
    return (data ?? []) as BlogCategory[];
  },
);

export const listTags = createServerFn({ method: "GET" }).handler(async (): Promise<BlogTag[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabaseAdmin;
  const { data, error } = await db.from("blog_tags").select("*").order("name");
  if (error) console.error("[blog] failed to list tags", error);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabaseAdmin;
      const { data: category, error: catErr } = await db
        .from("blog_categories")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (catErr) console.error(`[blog] failed to load category "${data.slug}"`, catErr);
      if (!category) return { category: null, posts: [], page: data.page, hasMore: false };
      const { data: rows, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("category_id", category.id)
        .or(liveFilter())
        .order("created_at", { ascending: false })
        .limit(FETCH_WINDOW);
      if (error) console.error(`[blog] failed to list posts for category "${data.slug}"`, error);
      const categories = new Map([[category.id, category as BlogCategory]]);
      const sorted = sortByEffectiveDateDesc(
        (rows ?? []).map((r: any) => toSummary(r, categories)),
      );
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabaseAdmin;
      const { data: tag, error: tagErr } = await db
        .from("blog_tags")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (tagErr) console.error(`[blog] failed to load tag "${data.slug}"`, tagErr);
      if (!tag) return { tag: null, posts: [], page: data.page, hasMore: false };
      const { data: links, error: linkErr } = await db
        .from("blog_post_tags")
        .select("post_id")
        .eq("tag_id", tag.id);
      if (linkErr)
        console.error(`[blog] failed to load post links for tag "${data.slug}"`, linkErr);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postIds: string[] = (links ?? []).map((l: any) => l.post_id);
      if (postIds.length === 0)
        return { tag: tag as BlogTag, posts: [], page: data.page, hasMore: false };
      const { data: rows, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .in("id", postIds)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) console.error(`[blog] failed to list posts for tag "${data.slug}"`, error);
      const categories = await loadCategoriesByIds(db, rows ?? []);
      const sorted = sortByEffectiveDateDesc(
        (rows ?? []).map((r: any) => toSummary(r, categories)),
      );
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabaseAdmin;
      const { data: author, error: authErr } = await db
        .from("blog_authors")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (authErr) console.error(`[blog] failed to load author "${data.slug}"`, authErr);
      if (!author) return { author: null, posts: [], page: data.page, hasMore: false };
      const { data: rows, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("author_ref_id", author.id)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) console.error(`[blog] failed to list posts for author "${data.slug}"`, error);
      const categories = await loadCategoriesByIds(db, rows ?? []);
      const sorted = sortByEffectiveDateDesc(
        (rows ?? []).map((r: any) => toSummary(r, categories)),
      );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const like = `%${query.replace(/[%_]/g, "")}%`;
    const { data: rows, error } = await db
      .from("blog_posts")
      .select(SUMMARY_COLUMNS)
      .or(liveFilter())
      .or(`title.ilike.${like},excerpt.ilike.${like},body.ilike.${like}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(30);
    if (error) console.error(`[blog] search failed for "${query}"`, error);
    const categories = await loadCategoriesByIds(db, rows ?? []);
    return sortByEffectiveDateDesc((rows ?? []).map((r: any) => toSummary(r, categories)));
  });

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(d))
  .handler(async ({ data }): Promise<BlogPostWithRelations | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { data: post, error } = await db
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error(`[blog] failed to load post "${data.slug}"`, error);
      return null;
    }
    if (!post || !isPostLive(post)) return null;

    const [categoryResult, authorResult, tagLinksResult] = await Promise.all([
      post.category_id
        ? db
            .from("blog_categories")
            .select("id,slug,name,description")
            .eq("id", post.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      post.author_ref_id
        ? db
            .from("blog_authors")
            .select("id,slug,name,bio,avatar_url")
            .eq("id", post.author_ref_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db.from("blog_post_tags").select("tag_id").eq("post_id", post.id),
    ]);
    if (categoryResult.error)
      console.error(`[blog] failed to load category for "${data.slug}"`, categoryResult.error);
    if (authorResult.error)
      console.error(`[blog] failed to load author for "${data.slug}"`, authorResult.error);
    if (tagLinksResult.error)
      console.error(`[blog] failed to load tag links for "${data.slug}"`, tagLinksResult.error);

    let tags: BlogTag[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tagIds = (tagLinksResult.data ?? []).map((l: any) => l.tag_id);
    if (tagIds.length > 0) {
      const { data: tagRows, error: tagRowsErr } = await db
        .from("blog_tags")
        .select("id,slug,name")
        .in("id", tagIds);
      if (tagRowsErr) console.error(`[blog] failed to load tags for "${data.slug}"`, tagRowsErr);
      tags = (tagRows ?? []) as BlogTag[];
    }

    return {
      ...(post as BlogPost),
      category: (categoryResult.data ?? null) as BlogCategory | null,
      author: (authorResult.data ?? null) as BlogAuthor | null,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = [];
    if (data.categoryId) {
      const { data: r, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .eq("category_id", data.categoryId)
        .neq("id", data.postId)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(data.limit);
      if (error) console.error("[blog] failed to load related posts (same category)", error);
      rows = r ?? [];
    }
    if (rows.length < data.limit) {
      const { data: r, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .neq("id", data.postId)
        .or(liveFilter())
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(data.limit * 2);
      if (error) console.error("[blog] failed to load related posts (fallback)", error);
      const existing = new Set(rows.map((x) => x.id));
      for (const r2 of r ?? []) {
        if (rows.length >= data.limit) break;
        if (!existing.has(r2.id)) rows.push(r2);
      }
    }
    const categories = await loadCategoriesByIds(db, rows);
    return sortByEffectiveDateDesc(
      rows.slice(0, data.limit).map((r: any) => toSummary(r, categories)),
    );
  });

/** The chronologically previous/next live post relative to a given publish date. */
export const listAdjacentPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), effectiveDate: z.string().min(1) }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ prev: BlogPostSummary | null; next: BlogPostSummary | null }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabaseAdmin;
      const { data: rows, error } = await db
        .from("blog_posts")
        .select(SUMMARY_COLUMNS)
        .or(liveFilter())
        .neq("id", data.postId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) console.error("[blog] failed to load adjacent posts", error);
      // Prev/next cards only show the title, so category isn't needed here —
      // skip the extra lookup and pass an empty map.
      const sorted = sortByEffectiveDateDesc((rows ?? []).map((r: any) => toSummary(r, new Map())));
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
