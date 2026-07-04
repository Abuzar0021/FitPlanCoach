import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { usePageView } from "../lib/analytics";
import { SiteScripts } from "../components/SiteScripts";
import { ADSENSE_CLIENT_ID } from "../lib/adsense-config";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl primary-gradient mb-6 shadow-[var(--shadow-glow)]">
          <span className="font-display text-2xl text-primary-foreground">404</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "FitPlanCoach — Personalized Fitness Coaching" },
      {
        name: "description",
        content:
          "Personalized meal plans, workouts, and progress tracking, tuned to your body, goal, and budget.",
      },
      { name: "author", content: "FitPlanCoach" },
      { name: "theme-color", content: "#0a0f0c" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FitPlanCoach" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "FitPlanCoach — Personalized Fitness Coaching" },
      {
        property: "og:description",
        content:
          "Personalized meal plans, workouts, and progress tracking, tuned to your body, goal, and budget.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "FitPlanCoach" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FitPlanCoach — Personalized Fitness Coaching" },
      {
        name: "twitter:description",
        content:
          "Personalized meal plans, workouts, and progress tracking, tuned to your body, goal, and budget.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/45a4247d-e5c0-4201-afee-9846d6ed9422",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/45a4247d-e5c0-4201-afee-9846d6ed9422",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Barlow+Condensed:ital,wght@0,600;0,700;1,700&display=swap",
      },
    ],
    // Google AdSense loader — registered once here on the root route (which
    // is present in every page's route match), so it renders exactly once
    // in <head> across the whole site rather than being copy-pasted into
    // individual page components. No ad units are placed by this script
    // alone; see src/components/ads for the actual ad placements, which
    // stay inert until an ad unit id is configured.
    scripts: [
      {
        async: true,
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`,
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  usePageView();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SiteScripts />
      <Toaster />
    </QueryClientProvider>
  );
}
