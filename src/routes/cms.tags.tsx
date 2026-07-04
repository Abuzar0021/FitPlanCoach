import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CmsHeader } from "@/components/cms/cms-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { slugify, type BlogTag } from "@/lib/blog";

export const Route = createFileRoute("/cms/tags")({
  head: () => ({ meta: [{ title: "Tags — Website CMS" }] }),
  component: TagsAdmin,
});

const db = supabase as any;

function TagsAdmin() {
  const [items, setItems] = useState<BlogTag[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await db.from("blog_tags").select("*").order("name");
    if (error) {
      console.error("[cms] failed to load tags", error);
      toast.error(`Could not load tags: ${error.message}`);
    }
    setItems((data ?? []) as BlogTag[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { error } = await db
        .from("blog_tags")
        .insert({ name: name.trim(), slug: slugify(name) });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Tag created");
      setName("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: BlogTag) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const { error } = await db.from("blog_tags").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <CmsHeader
        title="Tags"
        subtitle="Used to cross-link related articles and generate /blog/tag/* pages."
      />

      <form onSubmit={create} className="surface-card p-5 flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="tag-name">Tag name</Label>
          <Input id="tag-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          <Plus className="size-4 mr-1.5" /> Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border border-border bg-card text-sm"
          >
            {t.name}
            <button
              onClick={() => remove(t)}
              aria-label={`Delete ${t.name}`}
              className="size-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
      </div>
    </div>
  );
}
