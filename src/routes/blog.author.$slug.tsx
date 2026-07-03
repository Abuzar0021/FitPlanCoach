import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PostGrid } from "@/components/blog/PostGrid";
import { BlogPagination } from "@/components/blog/Pagination";
import { BackToBlog } from "@/components/blog/BackToBlog";
import { getAuthorBySlug } from "@/lib/blog.functions";

const BASE_URL = "https://fitplancoach.com";

export const Route = createFileRoute("/blog/author/$slug")({
  validateSearch: z.object({ page: z.number().int().min(1).catch(1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    const result = await getAuthorBySlug({ data: { slug: params.slug, page: deps.page } });
    if (!result.author) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const author = loaderData?.author;
    if (!author) return {};
    const url = `${BASE_URL}/blog/author/${author.slug}`;
    const desc = author.bio || `Articles by ${author.name} on the FitPlanCoach blog.`;
    return {
      meta: [
        { title: `${author.name} — FitPlanCoach Blog` },
        { name: "description", content: desc },
        { property: "og:title", content: `${author.name} — FitPlanCoach Blog` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AuthorPage,
});

function AuthorPage() {
  const { author, posts, page, hasMore } = Route.useLoaderData();
  if (!author) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <BackToBlog />
        <div className="flex items-center gap-4 mb-8">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt=""
              className="size-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="size-16 rounded-full bg-muted" />
          )}
          <div>
            <p className="label-overline">Author</p>
            <h1 className="text-3xl font-display uppercase italic">{author.name}</h1>
          </div>
        </div>
        {author.bio && <p className="text-muted-foreground mb-8 max-w-xl">{author.bio}</p>}
        <PostGrid posts={posts} />
        <BlogPagination
          page={page}
          hasMore={hasMore}
          to="/blog/author/$slug"
          params={{ slug: author.slug }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
