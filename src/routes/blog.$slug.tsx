import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { getPublishedPost } from "@/lib/blog.functions";
import { formatPostDate, readingTimeMinutes } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPublishedPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    const url = `https://fitplancoach.com/blog/${post.slug}`;
    const desc = post.seo_description || post.excerpt || "A guide from the FitPlanCoach team.";
    return {
      meta: [
        { title: `${post.title} — FitPlanCoach` },
        { name: "description", content: desc },
        { property: "og:title", content: post.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(post.cover_image_url ? [{ property: "og:image", content: post.cover_image_url }] : []),
        ...(post.published_at
          ? [{ property: "article:published_time", content: post.published_at }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: desc,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "FitPlanCoach" },
            publisher: {
              "@type": "Organization",
              name: "FitPlanCoach",
              logo: { "@type": "ImageObject", url: "https://fitplancoach.com/icon-512.png" },
            },
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" /> All posts
        </Link>

        {post.cover_image_url && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-8 border border-border">
            <img src={post.cover_image_url} alt="" className="size-full object-cover" />
          </div>
        )}

        <p className="label-overline">
          {formatPostDate(post.published_at)} · {readingTimeMinutes(post.body)} min read
        </p>
        <h1 className="text-3xl md:text-4xl font-display uppercase italic mt-2 mb-3">
          {post.title}
        </h1>
        {post.excerpt && <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>}

        <article>{renderMarkdown(post.body)}</article>

        <div className="mt-12 pt-6 border-t border-border">
          <Link to="/blog" className="text-sm font-bold uppercase tracking-widest text-primary">
            ← Back to all posts
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
