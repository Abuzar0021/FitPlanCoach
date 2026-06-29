import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublishedPosts } from "@/lib/blog.functions";
import { formatPostDate } from "@/lib/blog";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
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
    links: [{ rel: "canonical", href: "https://fitplancoach.com/blog" }],
  }),
  loader: async () => ({ posts: await listPublishedPosts() }),
  component: BlogIndex,
});

function BlogIndex() {
  const { posts } = Route.useLoaderData();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <p className="label-overline">FitPlanCoach</p>
        <h1 className="text-4xl font-display uppercase italic mb-2">The Blog</h1>
        <p className="text-muted-foreground mb-8 max-w-xl">
          Practical training, nutrition, and habit guides — written to help you make real progress.
        </p>

        {posts.length === 0 ? (
          <div className="surface-card p-12 text-center text-muted-foreground">
            No posts yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="surface-card overflow-hidden hover:border-border-strong transition group flex flex-col"
              >
                {p.cover_image_url && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={p.cover_image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <p className="label-overline">{formatPostDate(p.published_at)}</p>
                  <h2 className="text-lg font-semibold mt-1 leading-snug">{p.title}</h2>
                  {p.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-primary">
                    Read <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
