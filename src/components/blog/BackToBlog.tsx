import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackToBlog() {
  return (
    <Link
      to="/blog"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
    >
      <ArrowLeft className="size-4" /> All posts
    </Link>
  );
}
