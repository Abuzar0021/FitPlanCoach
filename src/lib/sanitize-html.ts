// Sanitizes rich-text HTML produced by the website CMS editor before it is
// stored or rendered. Only staff (admin/owner role) can author this content,
// but we sanitize anyway as defense-in-depth against XSS — a compromised
// staff session or a bug in the editor's paste handling shouldn't be able to
// inject a <script> that runs in every visitor's browser.
//
// Works both server-side (SSR, jsdom) and client-side (real DOM) via
// isomorphic-dompurify, so the exact same allowlist applies everywhere the
// content is ever rendered.
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
  "iframe",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "class",
  "id",
  "data-callout",
  "data-youtube-video",
  "frameborder",
  "allow",
  "allowfullscreen",
  "colspan",
  "rowspan",
];

const ALLOWED_IFRAME_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);

let hooksInstalled = false;
function installIframeHostGuard() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const el = node as unknown as HTMLIFrameElement;
    const src = el.getAttribute?.("src") ?? "";
    try {
      const host = new URL(src, "https://x.invalid").hostname;
      if (!ALLOWED_IFRAME_HOSTS.has(host)) el.remove();
    } catch {
      el.remove();
    }
  });
}

/** Sanitize CMS-authored article HTML down to a safe, known-good allowlist. */
export function sanitizeArticleHtml(html: string): string {
  installIframeHostGuard();
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
