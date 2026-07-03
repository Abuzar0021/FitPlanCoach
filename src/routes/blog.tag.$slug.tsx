import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PostGrid } from "@/components/blog/PostGrid";
import { BlogPagination } from "@/components/blog/Pagination";
import { BackToBlog } from "@/components/blog/BackToBlog";
import { listPostsByTag } from "@/lib/blog.functions";

const BASE_URL = "https://fitplancoach.com";

export const Route = createFileRoute("/blog/tag/$slug")({
  validateSearch: z.object({ page: z.number().int().min(1).catch(1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    const result = await listPostsByTag({ data: { slug: params.slug, page: deps.page } });
    if (!result.tag) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const tag = loaderData?.tag;
    if (!tag) return {};
    const url = `${BASE_URL}/blog/tag/${tag.slug}`;
    const desc = `Articles tagged "${tag.name}" from the FitPlanCoach team.`;
    return {
      meta: [
        { title: `#${tag.name} — FitPlanCoach Blog` },
        { name: "description", content: desc },
        { property: "og:title", content: `#${tag.name} — FitPlanCoach Blog` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TagPage,
});

function TagPage() {
  const { tag, posts, page, hasMore } = Route.useLoaderData();
  if (!tag) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <BackToBlog />
        <p className="label-overline">Tag</p>
        <h1 className="text-4xl font-display uppercase italic mb-8">#{tag.name}</h1>
        <PostGrid posts={posts} />
        <BlogPagination
          page={page}
          hasMore={hasMore}
          to="/blog/tag/$slug"
          params={{ slug: tag.slug }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
