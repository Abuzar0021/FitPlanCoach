import { createFileRoute } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { getPublishedPost } from "@/lib/blog.functions";
import { formatPostDate, effectivePublishDate, readingTimeForPost } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { toAmpHtml, usesAmpYoutube, escapeHtml } from "@/lib/amp-html";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense-config";

// The AMP counterpart to /blog/$slug, for Google's AMP Auto Ads. This is a
// fully separate, hand-built HTML document — not the React app — because
// valid AMP HTML forbids custom JavaScript entirely, which the React SPA
// obviously depends on. It reuses the same data layer (getPublishedPost) and
// content sanitizer as the real page so the two can never drift out of sync
// on what counts as a "live" post.
const BASE_URL = "https://fitplancoach.com";

const AMP_BOILERPLATE =
  "<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>";

const AMP_CUSTOM_CSS = `
body{margin:0;background:oklch(0.11 0.012 160);color:oklch(0.98 0.005 150);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:oklch(0.88 0.20 130)}
.amp-header{padding:14px 20px;border-bottom:1px solid oklch(1 0 0/8%);font-weight:800;text-transform:uppercase;letter-spacing:.04em;font-size:14px}
.amp-header a{color:inherit;text-decoration:none}
.amp-main{max-width:700px;margin:0 auto;padding:24px 20px 60px}
.amp-meta{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:oklch(0.68 0.012 150);margin:0 0 8px}
h1{font-family:"Barlow Condensed",Inter,system-ui,sans-serif;font-style:italic;text-transform:uppercase;font-size:32px;line-height:1.15;margin:0 0 16px}
.amp-article h2{font-family:"Barlow Condensed",Inter,system-ui,sans-serif;font-style:italic;text-transform:uppercase;font-size:24px;margin:32px 0 12px}
.amp-article h3{font-size:19px;margin:24px 0 10px}
.amp-article p,.amp-article li{line-height:1.7;color:oklch(0.92 0.006 150)}
.amp-article a{text-decoration:underline}
.amp-article blockquote{margin:20px 0;padding-left:16px;border-left:3px solid oklch(0.88 0.20 130);font-style:italic;color:oklch(0.68 0.012 150)}
.amp-article pre{background:oklch(0.16 0.012 160);padding:14px;border-radius:10px;overflow-x:auto}
.amp-article code{background:oklch(0.16 0.012 160);padding:2px 5px;border-radius:4px;font-size:.9em}
.amp-article pre code{background:none;padding:0}
.amp-article table{width:100%;border-collapse:collapse;margin:20px 0}
.amp-article th,.amp-article td{border:1px solid oklch(1 0 0/8%);padding:8px 10px;text-align:left}
.amp-article amp-img{border-radius:14px}
.amp-article .callout{border-radius:14px;padding:16px 18px;border:1px solid oklch(1 0 0/8%);border-left-width:4px;background:oklch(0.20 0.012 160);margin:20px 0}
.amp-article .callout-info{border-left-color:oklch(0.88 0.20 130)}
.amp-article .callout-tip,.amp-article .callout-success{border-left-color:#22c55e}
.amp-article .callout-warning{border-left-color:#f59e0b}
.amp-cover{border-radius:16px;overflow:hidden;margin:0 0 20px}
.amp-footer{margin-top:40px;padding-top:20px;border-top:1px solid oklch(1 0 0/8%);font-size:13px}
`.trim();

export const Route = createFileRoute("/amp/blog/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const post = await getPublishedPost({ data: { slug: params.slug } });
        if (!post) {
          return new Response("Not found", { status: 404 });
        }

        const canonicalUrl = post.canonical_url || `${BASE_URL}/blog/${post.slug}`;
        const title = post.seo_title || post.title;
        const description = post.seo_description || post.excerpt || "";
        const dateLabel = formatPostDate(effectivePublishDate(post) ?? post.created_at);
        const readingTime = readingTimeForPost(post);

        const articleHtml = post.content_html
          ? toAmpHtml(sanitizeArticleHtml(post.content_html))
          : renderToStaticMarkup(renderMarkdown(post.body));

        const extensionScripts = [
          '<script async custom-element="amp-auto-ads" src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"></script>',
          ...(usesAmpYoutube(articleHtml)
            ? [
                '<script async custom-element="amp-youtube" src="https://cdn.ampproject.org/v0/amp-youtube-0.1.js"></script>',
              ]
            : []),
        ].join("\n  ");

        const coverImage = post.og_image_url || post.cover_image_url;

        const html = `<!doctype html>
<html ⚡ lang="en">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  ${extensionScripts}
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  ${AMP_BOILERPLATE}
  <style amp-custom>${AMP_CUSTOM_CSS}</style>
</head>
<body>
  <amp-auto-ads type="adsense" data-ad-client="${ADSENSE_CLIENT_ID}"></amp-auto-ads>
  <header class="amp-header"><a href="${BASE_URL}/">FitPlanCoach</a></header>
  <main class="amp-main">
    <p class="amp-meta">${escapeHtml(dateLabel)} · ${readingTime} min read</p>
    <h1>${escapeHtml(title)}</h1>
    ${
      coverImage
        ? `<div class="amp-cover"><amp-img src="${coverImage}" alt="${escapeHtml(post.featured_image_alt ?? "")}" width="1200" height="675" layout="responsive"></amp-img></div>`
        : ""
    }
    <article class="amp-article">${articleHtml}</article>
    <div class="amp-footer">
      <a href="${canonicalUrl}">View the full site version of this article →</a>
    </div>
  </main>
</body>
</html>`;

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
