import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatPostDate, effectivePublishDate, type BlogPostSummary } from "@/lib/blog";

/** The post-card grid shared by the blog homepage, category, tag, author, and search pages. */
export function PostGrid({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-muted-foreground">No posts here yet.</div>
    );
  }
  return (
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
            <p className="label-overline">
              {p.category ? `${p.category.name} · ` : ""}
              {formatPostDate(effectivePublishDate(p))}
            </p>
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
  );
}
