import type { ComponentType } from "react";
import { Instagram, Twitter, Facebook, Music2, Youtube } from "lucide-react";
import type { SocialLinks as SocialLinksType } from "@/lib/site-config";

const ICONS: Record<keyof SocialLinksType, ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
};

const LABELS: Record<keyof SocialLinksType, string> = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** Renders an icon link for each social profile that has a URL set. */
export function SocialLinks({
  links,
  className = "",
}: {
  links: SocialLinksType;
  className?: string;
}) {
  const entries = (Object.keys(ICONS) as (keyof SocialLinksType)[]).filter((k) => links[k]?.trim());
  if (entries.length === 0) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {entries.map((k) => {
        const Icon = ICONS[k];
        return (
          <a
            key={k}
            href={links[k]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={LABELS[k]}
            className="size-9 rounded-xl border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-strong transition"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}
