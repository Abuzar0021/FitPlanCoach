// Reusable ad placements for the website. Each wraps AdSlot with the right
// slot id and default layout for where it's meant to go — drop one of these
// into a page rather than reaching for AdSlot + AD_SLOTS directly.
import { AdSlot } from "./AdSlot";
import { AD_SLOTS } from "@/lib/adsense-config";

/** Above the article title/content — wide, horizontal. */
export function TopArticleAd({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      slot={AD_SLOTS.topArticle}
      format="horizontal"
      label="Top of article advertisement"
      className={`w-full max-w-3xl mx-auto my-6 ${className}`}
    />
  );
}

/** Dropped mid-article, between content sections. */
export function InContentAd({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      slot={AD_SLOTS.inContent}
      format="fluid"
      label="In-article advertisement"
      className={`w-full max-w-2xl mx-auto my-8 ${className}`}
    />
  );
}

/** Narrow vertical unit for a sidebar rail (desktop layouts). */
export function SidebarAd({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      slot={AD_SLOTS.sidebar}
      format="auto"
      label="Sidebar advertisement"
      className={`w-full max-w-[300px] mx-auto ${className}`}
    />
  );
}

/** Below the article content, before related-posts/comments. */
export function BottomArticleAd({ className = "" }: { className?: string }) {
  return (
    <AdSlot
      slot={AD_SLOTS.bottomArticle}
      format="horizontal"
      label="Bottom of article advertisement"
      className={`w-full max-w-3xl mx-auto my-8 ${className}`}
    />
  );
}
