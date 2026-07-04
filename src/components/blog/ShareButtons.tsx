import { useState } from "react";
import { Twitter, Facebook, Linkedin, Link2, Check } from "lucide-react";

/** Social share links + copy-link — plain share-intent URLs, no external SDK. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing to fall back to; the button just won't confirm.
    }
  }

  const links = [
    {
      label: "Share on X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Share on Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "Share on LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">
        Share
      </span>
      {links.map(({ label, icon: Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="size-9 rounded-lg border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-strong transition"
        >
          <Icon className="size-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="size-9 rounded-lg border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-strong transition"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
