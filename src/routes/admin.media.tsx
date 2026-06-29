import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Copy, ImageIcon } from "lucide-react";
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  updateMediaAlt,
  formatBytes,
  type MediaAsset,
} from "@/lib/media";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media — Admin" }] }),
  component: MediaAdmin,
});

function MediaAdmin() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setAssets(await listMedia());
  }
  useEffect(() => {
    load();
  }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const a = await uploadMedia(file);
        setAssets((prev) => [a, ...(prev ?? [])]);
      }
      toast.success(files.length > 1 ? `${files.length} files uploaded` : "Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(asset: MediaAsset) {
    if (!confirm(`Delete ${asset.filename}? This can't be undone.`)) return;
    try {
      await deleteMedia(asset);
      setAssets((prev) => (prev ?? []).filter((a) => a.id !== asset.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function saveAlt(asset: MediaAsset, alt: string) {
    if (alt === (asset.alt ?? "")) return;
    try {
      await updateMediaAlt(asset.id, alt);
      setAssets((prev) =>
        (prev ?? []).map((a) => (a.id === asset.id ? { ...a, alt: alt || null } : a)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save alt text");
    }
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(
      () => toast.success("URL copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Media{" "}
          <span className="text-sm text-muted-foreground font-normal">({assets?.length ?? 0})</span>
        </h1>
        <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="size-4 mr-1.5" /> {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      </div>

      {assets === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="size-14 mx-auto mb-3 rounded-2xl bg-muted inline-flex items-center justify-center">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">No media yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload images to reuse across blog posts and the site.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="aspect-square bg-muted">
                <img
                  src={a.url}
                  alt={a.alt ?? ""}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs font-medium truncate" title={a.filename}>
                  {a.filename}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {formatBytes(a.size_bytes)}
                </p>
                <Input
                  defaultValue={a.alt ?? ""}
                  placeholder="Alt text"
                  aria-label={`Alt text for ${a.filename}`}
                  className="h-8 text-xs"
                  onBlur={(e) => saveAlt(a, e.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => copy(a.url)}
                  >
                    <Copy className="size-3.5 mr-1" /> Copy URL
                  </Button>
                  <button
                    onClick={() => remove(a)}
                    title="Delete"
                    aria-label={`Delete ${a.filename}`}
                    className="size-8 rounded-lg border border-border inline-flex items-center justify-center text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
