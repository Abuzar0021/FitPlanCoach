import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { getPublishedPost, listRelatedPosts, listAdjacentPosts } from "@/lib/blog.functions";
import {
  formatPostDate,
  readingTimeForPost,
  effectivePublishDate,
  annotateHeadingsForToc,
} from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { TopArticleAd, InContentAd, BottomArticleAd } from "@/components/ads";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, ArrowRight, ListTree } from "lucide-react";

const BASE_URL = "https://fitplancoach.com";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPublishedPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    const effectiveDate = effectivePublishDate(post) ?? post.created_at;
    const [related, adjacent] = await Promise.all([
      listRelatedPosts({ data: { postId: post.id, categoryId: post.category_id, limit: 3 } }),
      listAdjacentPosts({ data: { postId: post.id, effectiveDate } }),
    ]);
    return { post, related, ...adjacent };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    const url = post.canonical_url || `${BASE_URL}/blog/${post.slug}`;
    const desc = post.seo_description || post.excerpt || "A guide from the FitPlanCoach team.";
    const ogImage = post.og_image_url || post.cover_image_url;
    return {
      meta: [
        { title: `${post.seo_title || post.title} — FitPlanCoach` },
        { name: "description", content: desc },
        { property: "og:title", content: post.seo_title || post.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: post.twitter_card || "summary_large_image" },
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
        ...(post.published_at
          ? [{ property: "article:published_time", content: post.published_at }]
          : []),
        ...(post.category ? [{ property: "article:section", content: post.category.name }] : []),
        ...post.tags.map((t) => ({ property: "article:tag", content: t.name })),
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
            ...(ogImage ? { image: ogImage } : {}),
            mainEntityOfPage: url,
            author: post.author
              ? {
                  "@type": "Person",
                  name: post.author.name,
                  url: `${BASE_URL}/blog/author/${post.author.slug}`,
                }
              : { "@type": "Organization", name: "FitPlanCoach" },
            publisher: {
              "@type": "Organization",
              name: "FitPlanCoach",
              logo: { "@type": "ImageObject", url: `${BASE_URL}/icon-512.png` },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post, related, prev, next } = Route.useLoaderData();
  const url = post.canonical_url || `${BASE_URL}/blog/${post.slug}`;
  const readingTime = readingTimeForPost(post);
  const dateLabel = formatPostDate(effectivePublishDate(post) ?? post.created_at);

  const { html: contentHtml, toc } = post.content_html
    ? annotateHeadingsForToc(sanitizeArticleHtml(post.content_html))
    : { html: "", toc: [] as { id: string; text: string; level: 2 | 3 }[] };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-6 pt-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/blog">Blog</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {post.category && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/blog/category/$slug" params={{ slug: post.category.slug }}>
                        {post.category.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">{post.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {post.cover_image_url && (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-8 border border-border">
              <img
                src={post.cover_image_url}
                alt={post.featured_image_alt ?? ""}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="size-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-2">
            {post.category && (
              <Link
                to="/blog/category/$slug"
                params={{ slug: post.category.slug }}
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary"
              >
                {post.category.name}
              </Link>
            )}
            <p className="label-overline">
              {dateLabel} · {readingTime} min read
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-display uppercase italic mb-3">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground mb-5">{post.excerpt}</p>}

          <div className="flex items-center justify-between flex-wrap gap-3 pb-6 mb-2 border-b border-border">
            {post.author ? (
              <Link
                to="/blog/author/$slug"
                params={{ slug: post.author.slug }}
                className="flex items-center gap-2.5 group"
              >
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt=""
                    className="size-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-muted" />
                )}
                <span className="text-sm font-semibold group-hover:text-primary transition">
                  {post.author.name}
                </span>
              </Link>
            ) : (
              <span />
            )}
            <ShareButtons url={url} title={post.title} />
          </div>

          <TopArticleAd />

          {toc.length >= 3 && (
            <nav aria-label="Table of contents" className="surface-card p-4 my-6">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                <ListTree className="size-3.5" /> On this page
              </p>
              <ul className="space-y-1 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.level === 3 ? "ml-4" : ""}>
                    <a
                      href={`#${h.id}`}
                      className="text-muted-foreground hover:text-primary transition"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {post.content_html ? (
            <article
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <article className="prose max-w-none">{renderMarkdown(post.body)}</article>
          )}

          <InContentAd />

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  to="/blog/tag/$slug"
                  params={{ slug: t.slug }}
                  className="px-3 py-1 rounded-full border border-border bg-card text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}

          {post.author?.bio && (
            <div className="surface-card p-5 mt-8 flex gap-4">
              {post.author.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt=""
                  className="size-14 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="size-14 rounded-full bg-muted shrink-0" />
              )}
              <div>
                <Link
                  to="/blog/author/$slug"
                  params={{ slug: post.author.slug }}
                  className="font-semibold hover:text-primary transition"
                >
                  {post.author.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">{post.author.bio}</p>
              </div>
            </div>
          )}

          <BottomArticleAd />

          <div className="grid sm:grid-cols-2 gap-3 mt-10 pt-6 border-t border-border">
            {prev && (
              <Link
                to="/blog/$slug"
                params={{ slug: prev.slug }}
                className="surface-card p-4 hover:border-border-strong transition"
              >
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  <ArrowLeft className="size-3" /> Previous
                </p>
                <p className="text-sm font-semibold line-clamp-2">{prev.title}</p>
              </Link>
            )}
            {next && (
              <Link
                to="/blog/$slug"
                params={{ slug: next.slug }}
                className="surface-card p-4 hover:border-border-strong transition sm:text-right sm:col-start-2"
              >
                <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Next <ArrowRight className="size-3" />
                </p>
                <p className="text-sm font-semibold line-clamp-2">{next.title}</p>
              </Link>
            )}
          </div>

          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="label-overline mb-3">Related articles</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="surface-card overflow-hidden hover:border-border-strong transition group"
                  >
                    {r.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <img
                          src={r.cover_image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-2">{r.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-border">
            <Link to="/blog" className="text-sm font-bold uppercase tracking-widest text-primary">
              ← Back to all posts
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
