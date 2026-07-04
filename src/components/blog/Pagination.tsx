import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Prev/next pager used by every paginated blog listing (index, category, tag, author, search). */
export function BlogPagination({
  page,
  hasMore,
  to,
  params,
}: {
  page: number;
  hasMore: boolean;
  to: string;
  params?: Record<string, string>;
}) {
  if (page <= 1 && !hasMore) return null;
  // `to` varies per page (/blog, /blog/category/$slug, ...) so its param/search
  // shape can't be known generically here — cast the whole props bag once
  // rather than fighting Link's per-route overload resolution.
  const LinkAny = Link as unknown as React.ComponentType<Record<string, unknown>>;
  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <LinkAny
        to={to}
        params={params}
        search={{ page: page - 1 }}
        disabled={page <= 1}
        className="size-9 rounded-lg border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </LinkAny>
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <LinkAny
        to={to}
        params={params}
        search={{ page: page + 1 }}
        disabled={!hasMore}
        className="size-9 rounded-lg border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </LinkAny>
    </div>
  );
}
