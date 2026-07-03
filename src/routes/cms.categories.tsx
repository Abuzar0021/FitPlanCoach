import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CmsHeader } from "@/components/cms/cms-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { slugify, type BlogCategory } from "@/lib/blog";

export const Route = createFileRoute("/cms/categories")({
  head: () => ({ meta: [{ title: "Categories — Website CMS" }] }),
  component: CategoriesAdmin,
});

const db = supabase as any;

function CategoriesAdmin() {
  const [items, setItems] = useState<BlogCategory[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await db.from("blog_categories").select("*").order("name");
    setItems((data ?? []) as BlogCategory[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { error } = await db.from("blog_categories").insert({
        name: name.trim(),
        slug: (slug || slugify(name)).trim(),
        description: description.trim() || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Category created");
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: BlogCategory) {
    if (!confirm(`Delete "${c.name}"? Articles in this category will become uncategorized.`))
      return;
    const { error } = await db.from("blog_categories").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <CmsHeader
        title="Categories"
        subtitle="Used to organize articles and generate /blog/category/* pages."
      />

      <form onSubmit={create} className="surface-card p-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-desc">Description (optional)</Label>
          <Textarea
            id="cat-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          <Plus className="size-4 mr-1.5" /> Add category
        </Button>
      </form>

      <div className="surface-card divide-y divide-border overflow-hidden">
        {items.map((c) => (
          <div key={c.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">/blog/category/{c.slug}</p>
            </div>
            <button
              onClick={() => remove(c)}
              aria-label={`Delete ${c.name}`}
              className="size-8 rounded-lg hover:bg-destructive/10 inline-flex items-center justify-center text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No categories yet.</div>
        )}
      </div>
    </div>
  );
}
