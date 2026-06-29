import type { ReactNode } from "react";

// Minimal, dependency-free Markdown renderer that returns React elements (never
// raw HTML), so blog content can't inject markup even though only staff author
// it. Supports headings, paragraphs, bold/italic, inline code, links, blockquotes,
// horizontal rules, and unordered/ordered lists — enough for editorial content.

const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;
const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      nodes.push(<em key={key}>{m[2]}</em>);
    } else if (m[3] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono">
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined && m[5] !== undefined) {
      const href = m[5].trim();
      if (SAFE_HREF.test(href)) {
        const external = /^https?:/i.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-primary underline underline-offset-2 hover:no-underline"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {m[4]}
          </a>,
        );
      } else {
        nodes.push(m[4]);
      }
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const isHeading = (l: string) => /^#{1,3}\s+/.test(l);
const isHr = (l: string) => /^---+$/.test(l.trim());
const isQuote = (l: string) => /^>\s?/.test(l);
const isUl = (l: string) => /^[-*]\s+/.test(l);
const isOl = (l: string) => /^\d+\.\s+/.test(l);

export function renderMarkdown(md: string): ReactNode {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const content = inline(h[2].trim(), `h${key}`);
      if (h[1].length === 1) {
        blocks.push(
          <h2 key={key++} className="mt-10 mb-3 font-display text-3xl uppercase italic">
            {content}
          </h2>,
        );
      } else if (h[1].length === 2) {
        blocks.push(
          <h3 key={key++} className="mt-8 mb-3 font-display text-2xl uppercase italic">
            {content}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 key={key++} className="mt-6 mb-2 text-lg font-semibold">
            {content}
          </h4>,
        );
      }
      i++;
      continue;
    }

    if (isHr(line)) {
      blocks.push(<hr key={key++} className="my-8 border-border" />);
      i++;
      continue;
    }

    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-5 border-l-2 border-primary pl-4 italic text-muted-foreground"
        >
          {inline(buf.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-4 ml-5 list-disc space-y-1.5 text-muted-foreground">
          {items.map((it, idx) => (
            <li key={idx}>{inline(it, `ul${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-4 ml-5 list-decimal space-y-1.5 text-muted-foreground">
          {items.map((it, idx) => (
            <li key={idx}>{inline(it, `ol${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isHeading(lines[i]) &&
      !isHr(lines[i]) &&
      !isQuote(lines[i]) &&
      !isUl(lines[i]) &&
      !isOl(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-4 leading-relaxed text-muted-foreground">
        {inline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <>{blocks}</>;
}
