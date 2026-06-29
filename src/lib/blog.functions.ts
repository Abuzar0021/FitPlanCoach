import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BlogPost, BlogPostSummary } from "@/lib/blog";

// Public reads. Run on the server with the service role and explicitly filter to
// published posts, so drafts never leak regardless of the caller.

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogPostSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data } = await db
      .from("blog_posts")
      .select("id,slug,title,excerpt,cover_image_url,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data ?? []) as BlogPostSummary[];
  },
);

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(d))
  .handler(async ({ data }): Promise<BlogPost | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: post } = await db
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return (post ?? null) as BlogPost | null;
  });
