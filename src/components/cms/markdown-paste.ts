// Detects and converts plain-text Markdown on paste, so an article generated
// by ChatGPT/Claude and pasted as *plain text* still lands in the editor as
// real headings/lists/tables instead of literal "## " characters. When the
// clipboard carries HTML (e.g. copying a rendered ChatGPT reply, which puts
// real HTML on the clipboard), Tiptap's default paste handling already does
// the right thing and this path is skipped entirely.
import { marked } from "marked";

const MARKDOWN_LINE_PATTERNS = [
  /^#{1,6}\s+\S/m, // headings
  /^\s*[-*+]\s+\S/m, // bullet list
  /^\s*\d+\.\s+\S/m, // ordered list
  /^>\s?\S/m, // blockquote
  /^```/m, // fenced code block
  /\*\*[^*\n]+\*\*/, // bold
  /^\s*\|.+\|\s*$/m, // table row
];

/** Heuristic: does this plain-text paste look like Markdown source? */
export function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return false;
  const hits = MARKDOWN_LINE_PATTERNS.reduce((n, re) => n + (re.test(trimmed) ? 1 : 0), 0);
  return hits >= 2;
}

export function markdownToHtml(text: string): string {
  return marked.parse(text, { async: false, gfm: true, breaks: false }) as string;
}
