// Media library helpers. One upload/list/delete path shared by the admin media
// screen and the MediaPicker, so neither re-implements storage logic. Uploads go
// to the public `media` bucket and are tracked in `media_assets` for browsing.
import { supabase } from "@/integrations/supabase/client";

export interface MediaAsset {
  id: string;
  path: string;
  url: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  alt: string | null;
  created_by: string | null;
  created_at: string;
}

export const MEDIA_BUCKET = "media";
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024; // 8MB

export function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listMedia(): Promise<MediaAsset[]> {
  const db: any = supabase;
  const { data } = await db
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as MediaAsset[];
}

/** Upload a file to the media bucket and record it. Cleans up on failure. */
export async function uploadMedia(file: File): Promise<MediaAsset> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error("File is larger than 8MB.");
  const { data: u } = await supabase.auth.getUser();

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "file";
  const path = `${Date.now()}-${base}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const db: any = supabase;
  const { data, error } = await db
    .from("media_assets")
    .insert({
      path,
      url: pub.publicUrl,
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: u.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw error;
  }
  return data as MediaAsset;
}

export async function deleteMedia(asset: MediaAsset): Promise<void> {
  await supabase.storage.from(MEDIA_BUCKET).remove([asset.path]);
  const db: any = supabase;
  const { error } = await db.from("media_assets").delete().eq("id", asset.id);
  if (error) throw error;
}

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  const db: any = supabase;
  const { error } = await db
    .from("media_assets")
    .update({ alt: alt.trim() || null })
    .eq("id", id);
  if (error) throw error;
}
