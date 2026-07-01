import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image";
import { localDateKey } from "@/lib/date";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, X } from "lucide-react";

type Photo = { id: string; image_path: string; recorded_at: string; url: string | null };

export function ProgressPhotoGallery({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const db: any = supabase;
    const { data } = await db
      .from("progress_photos")
      .select("id,image_path,recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(30);
    const rows = (data ?? []) as Array<{ id: string; image_path: string; recorded_at: string }>;
    if (rows.length === 0) {
      setPhotos([]);
      return;
    }
    const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrls(
      rows.map((r) => r.image_path),
      3600,
    );
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    setPhotos(rows.map((r) => ({ ...r, url: urlByPath.get(r.image_path) ?? null })));
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Max 12MB");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1280, quality: 0.85 });
      const path = `${userId}/progress-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, compressed, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase
        .from("progress_photos")
        .insert({ user_id: userId, image_path: path, recorded_at: localDateKey() });
      if (insErr) throw insErr;
      toast.success("Photo added");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(photo: Photo) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("progress-photos").remove([photo.image_path]);
    await supabase.from("progress_photos").delete().eq("id", photo.id);
    setPhotos((cur) => (cur ?? []).filter((p) => p.id !== photo.id));
    setViewing(null);
    toast.success("Photo removed");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="label-overline">Progress photos</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary inline-flex items-center justify-center hover:bg-primary/20 transition disabled:opacity-50"
          aria-label="Add progress photo"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
      </div>

      {photos === null ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">
          Your progress photos are private — only you can see them. Add one to start a visual
          timeline.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewing(p)}
              className="aspect-square rounded-xl overflow-hidden bg-muted border border-border relative"
            >
              {p.url && (
                <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
              )}
              <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                {p.recorded_at.slice(5)}
              </span>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <button
            onClick={() => setViewing(null)}
            aria-label="Close"
            className="absolute top-4 right-4 size-9 rounded-full bg-white/10 text-white inline-flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
          {viewing.url && (
            <img
              src={viewing.url}
              alt=""
              className="max-w-full max-h-[75vh] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(viewing);
            }}
            className="absolute bottom-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-destructive bg-white/10 px-4 py-2 rounded-full"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
