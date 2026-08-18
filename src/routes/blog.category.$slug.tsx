import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PostGrid } from "@/components/blog/PostGrid";
import { BlogPagination } from "@/components/blog/Pagination";
import { BackToBlog } from "@/components/blog/BackToBlog";
import { listPostsByCategory } from "@/lib/blog.functions";

const BASE_URL = "https://fitplancoach.com";

export const Route = createFileRoute("/blog/category/$slug")({
  // See blog.index.tsx for why this is `.optional()` and not `.catch(1)` —
  // `.catch()` makes TanStack Start 307-redirect a bare URL to `?page=1`,
  // which then fights this page's own self-referencing canonical.
  validateSearch: z.object({ page: z.number().int().min(1).optional() }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const result = await listPostsByCategory({ data: { slug: params.slug, page: deps.page } });
    if (!result.category) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    if (!category) return {};
    const url = `${BASE_URL}/blog/category/${category.slug}`;
    const desc = category.description || `${category.name} articles from the FitPlanCoach team.`;
    return {
      meta: [
        { title: `${category.name} — FitPlanCoach Blog` },
        { name: "description", content: desc },
        { property: "og:title", content: `${category.name} — FitPlanCoach Blog` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category, posts, page, hasMore } = Route.useLoaderData();
  if (!category) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <BackToBlog />
        <p className="label-overline">Category</p>
        <h1 className="text-4xl font-display uppercase italic mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mb-8 max-w-xl">{category.description}</p>
        )}
        <PostGrid posts={posts} />
        <BlogPagination
          page={page}
          hasMore={hasMore}
          to="/blog/category/$slug"
          params={{ slug: category.slug }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
