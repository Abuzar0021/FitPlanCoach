import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PostGrid } from "@/components/blog/PostGrid";
import { BlogPagination } from "@/components/blog/Pagination";
import { listPublishedPosts, listCategories } from "@/lib/blog.functions";
import { TopArticleAd, BottomArticleAd } from "@/components/ads";
import { Search } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  validateSearch: z.object({ page: z.number().int().min(1).catch(1) }),
  head: () => ({
    meta: [
      { title: "Blog — FitPlanCoach" },
      {
        name: "description",
        content:
          "Training, nutrition, and habit guides from the FitPlanCoach team — practical, no-nonsense advice to help you train smarter and eat better.",
      },
      { property: "og:title", content: "The FitPlanCoach Blog" },
      { property: "og:description", content: "Practical training and nutrition guides." },
      { property: "og:url", content: "https://fitplancoach.com/blog" },
    ],
    links: [
      { rel: "canonical", href: "https://fitplancoach.com/blog" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "FitPlanCoach Blog",
        href: "/blog/rss.xml",
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    const [postsResult, categories] = await Promise.all([
      listPublishedPosts({ data: { page: deps.page } }),
      listCategories(),
    ]);
    return { ...postsResult, categories };
  },
  component: BlogIndex,
});

function BlogIndex() {
  const { posts, page, hasMore, categories } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <p className="label-overline">FitPlanCoach</p>
            <h1 className="text-4xl font-display uppercase italic">The Blog</h1>
          </div>
          <Link
            to="/blog/search"
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4" /> Search
          </Link>
        </div>
        <p className="text-muted-foreground mb-6 max-w-xl">
          Practical training, nutrition, and habit guides — written to help you make real progress.
        </p>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/blog/category/$slug"
                params={{ slug: c.slug }}
                className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <TopArticleAd />
        <PostGrid posts={posts} />
        <BottomArticleAd />
        <BlogPagination page={page} hasMore={hasMore} to="/blog" />
      </main>
      <PublicFooter />
    </div>
  );
}
