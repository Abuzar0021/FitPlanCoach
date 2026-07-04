import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PostGrid } from "@/components/blog/PostGrid";
import { BackToBlog } from "@/components/blog/BackToBlog";
import { searchPosts } from "@/lib/blog.functions";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog";

export const Route = createFileRoute("/blog/search")({
  validateSearch: z.object({ q: z.string().max(120).catch("") }),
  head: () => ({
    meta: [{ title: "Search — FitPlanCoach Blog" }, { name: "robots", content: "noindex,follow" }],
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }) => (deps.q ? await searchPosts({ data: { q: deps.q } }) : []),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const initialResults = Route.useLoaderData();
  const navigate = useNavigate();
  const searchFn = useServerFn(searchPosts);

  const [input, setInput] = useState(q);
  const [results, setResults] = useState<BlogPostSummary[]>(initialResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(q);
    setResults(initialResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === q) return; // already reflects the URL/loader state
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchFn({ data: { q: trimmed } });
      setResults(r);
      setLoading(false);
      navigate({ to: "/blog/search", search: { q: trimmed }, replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full mx-auto max-w-5xl px-6 py-12">
        <BackToBlog />
        <p className="label-overline">FitPlanCoach Blog</p>
        <h1 className="text-4xl font-display uppercase italic mb-6">Search</h1>

        <div className="relative max-w-md mb-8">
          <SearchIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="pl-9"
          />
          {loading && (
            <Loader2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
        </div>

        {input.trim().length >= 2 ? (
          <PostGrid posts={results} />
        ) : (
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
