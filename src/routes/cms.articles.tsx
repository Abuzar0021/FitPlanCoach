import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pure layout for /cms/articles, /cms/articles/new, and /cms/articles/$id.
// It must do nothing but render an Outlet — page-specific logic belongs on
// the individual child routes, since anything defined here runs for every
// child match too (this is what broke "new" and "edit" before: the old
// single cms.articles.tsx rendered the article list directly with no
// Outlet, so its child routes could never actually display).
export const Route = createFileRoute("/cms/articles")({
  component: () => <Outlet />,
});
