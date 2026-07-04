// Rewrites sanitized article HTML (see sanitize-html.ts) into AMP-valid
// markup. AMP forbids raw <img> and <iframe> entirely — every image must be
// <amp-img>, and the only iframe-like embed allowed here is YouTube, which
// has its own native <amp-youtube> component. The input is already
// constrained to the CMS editor's fixed output shapes (RichTextEditor.tsx +
// callout-extension.ts), so targeted regex rewrites are sufficient — no HTML
// parser dependency needed.

const YOUTUBE_ID = /(?:youtube(?:-nocookie)?\.com)\/embed\/([a-zA-Z0-9_-]{6,})/;

function attr(tag: string, name: string): string {
  const m = new RegExp(`${name}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : "";
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Escapes a plain-text value (title, meta description, ...) for use as
 * HTML text content or a double-quoted attribute value. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True if the given (already AMP-converted) HTML uses <amp-youtube>, so the
 * caller knows whether to include its required extension script. */
export function usesAmpYoutube(ampHtml: string): boolean {
  return ampHtml.includes("<amp-youtube");
}

export function toAmpHtml(html: string): string {
  let out = html ?? "";

  // Tiptap's YouTube node: <div data-youtube-video><iframe ... src="…/embed/ID…"></iframe></div>
  out = out.replace(/<div[^>]*data-youtube-video[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const iframeMatch = /<iframe[^>]*>/i.exec(block);
    const src = iframeMatch ? attr(iframeMatch[0], "src") : "";
    const idMatch = src ? YOUTUBE_ID.exec(src) : null;
    if (!idMatch) return "";
    return `<amp-youtube data-videoid="${idMatch[1]}" layout="responsive" width="480" height="270"></amp-youtube>`;
  });

  // Plain images: <img src=".." alt=".."> -> <amp-img ... layout="responsive">.
  // AMP requires explicit width/height; actual dimensions aren't stored for
  // uploaded media, so a 16:9 default (matching the site's own cover-image
  // aspect ratio) is used — CSS still scales it to the container width.
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, "src");
    if (!src) return "";
    const alt = attr(tag, "alt");
    return `<amp-img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" width="1200" height="675" layout="responsive"></amp-img>`;
  });

  // Safety net: AMP forbids raw <iframe> outright. Anything left here isn't
  // YouTube (already converted above) or was rejected by sanitizeArticleHtml's
  // hostname allowlist in the first place, so drop it rather than emit
  // invalid AMP.
  out = out.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");

  return out;
}
