import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ImagePlus, Upload, Check } from "lucide-react";
import { listMedia, uploadMedia, type MediaAsset } from "@/lib/media";

/**
 * Image field backed by the media library. Paste a URL directly, or open the
 * library to pick an existing upload or add a new one. Used anywhere an image
 * URL is configured (blog covers, etc.).
 */
export function MediaPicker({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && assets === null)
      listMedia()
        .then(setAssets)
        .catch(() => setAssets([]));
  }, [open, assets]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const a = await uploadMedia(file);
      setAssets((prev) => [a, ...(prev ?? [])]);
      onChange(a.url);
      setOpen(false);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or pick from library"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="shrink-0">
              <ImagePlus className="size-4 mr-1.5" /> Library
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{label} library</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Pick an image or upload a new one.</p>
              <Button
                type="button"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4 mr-1.5" /> {uploading ? "Uploading…" : "Upload"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            </div>
            {assets === null ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No media yet. Upload your first image.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto">
                {assets.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => {
                      onChange(a.url);
                      setOpen(false);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border ${
                      value === a.url
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <img
                      src={a.url}
                      alt={a.alt ?? ""}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                    {value === a.url && (
                      <span className="absolute top-1 right-1 size-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {value && (
        <div className="rounded-lg overflow-hidden border border-border w-full max-w-[240px]">
          <img src={value} alt="" loading="lazy" decoding="async" className="w-full h-auto" />
        </div>
      )}
    </div>
  );
}
