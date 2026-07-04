import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pure layout for every /blog/* route (index, $slug, category/$slug,
// tag/$slug, author/$slug, search). It must do nothing but render an
// Outlet — page-specific loaders, search validation, and head tags belong
// on the individual child routes, not here, since anything defined on this
// route runs for every child match too.
export const Route = createFileRoute("/blog")({
  component: () => <Outlet />,
});
