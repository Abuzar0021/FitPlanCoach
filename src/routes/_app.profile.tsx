import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { updateProfileBasic } from "@/lib/engagement.functions";
import { Camera, Flame, Trophy, Crown, Dumbbell, Scale, Target, UserCheck, Sparkles, CheckCircle2, LogOut, Settings } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — FitPlanCoach" }] }),
  component: Profile,
});

const ICONS: Record<string, any> = {
  dumbbell: Dumbbell, flame: Flame, crown: Crown, scale: Scale,
  target: Target, "user-check": UserCheck, sparkles: Sparkles, trophy: Trophy,
};

const PROFILE_FIELDS = ["name", "age", "gender", "height_cm", "weight_kg", "goal", "activity_level", "avatar_url"] as const;

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateFn = useServerFn(updateProfileBasic);
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!user) return;
    const db: any = supabase;
    const [{ data: p }, { data: s }, { data: ach }, { data: ua }] = await Promise.all([
      db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      db.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("achievements").select("*").order("sort_order"),
      db.from("user_achievements").select("achievement_id").eq("user_id", user.id),
    ]);
    setProfile(p);
    setSub(s);
    setAllAchievements(ach ?? []);
    setUnlocked(new Set((ua ?? []).map((r: any) => r.achievement_id)));
  }
  useEffect(() => { load(); }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Max 3MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateFn({ data: { avatar_url: pub.publicUrl } });
      toast.success("Avatar updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!profile) {
    return (
      <MobileShell>
        <div className="space-y-3 pt-6">
          <div className="h-32 rounded-2xl bg-card/60 border border-border animate-pulse" />
          <div className="h-24 rounded-2xl bg-card/60 border border-border animate-pulse" />
          <div className="h-40 rounded-2xl bg-card/60 border border-border animate-pulse" />
        </div>
      </MobileShell>
    );
  }

  const filled = PROFILE_FIELDS.filter((k) => profile[k] != null && profile[k] !== "").length;
  const completion = Math.round((filled / PROFILE_FIELDS.length) * 100);
  const planType = sub?.plan_type ?? "free";

  return (
    <MobileShell>
      <div className="flex items-end justify-between mb-4">
        <div className="min-w-0">
          <p className="label-overline">Account</p>
          <h1 className="text-2xl font-display uppercase italic truncate">Profile</h1>
        </div>
        <button onClick={signOut} className="size-10 rounded-xl bg-card border border-border inline-flex items-center justify-center hover:bg-muted transition" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </div>

      {/* Identity card */}
      <section className="surface-card p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-20 rounded-2xl overflow-hidden bg-muted border border-border inline-flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-muted-foreground">
                  {(profile.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow border-2 border-background disabled:opacity-50"
              aria-label="Upload avatar"
            >
              <Camera className="size-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">{profile.name ?? "Athlete"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${planType === "free" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                {planType}
              </span>
              {(profile.streak_current ?? 0) > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 text-orange-500">
                  <Flame className="size-3" /> {profile.streak_current}d
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5">
            <span className="text-muted-foreground">Profile completion</span>
            <span className="text-primary tabular-nums">{completion}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="metric-card"><p className="label-overline">Height</p><p className="text-lg font-display tabular-nums mt-0.5">{profile.height_cm ?? "—"}<span className="text-[10px] text-muted-foreground ml-1">cm</span></p></div>
        <div className="metric-card"><p className="label-overline">Weight</p><p className="text-lg font-display tabular-nums mt-0.5">{profile.weight_kg ?? "—"}<span className="text-[10px] text-muted-foreground ml-1">kg</span></p></div>
        <div className="metric-card"><p className="label-overline">Goal</p><p className="text-sm font-semibold capitalize mt-0.5">{(profile.goal ?? "—").replace("_", " ")}</p></div>
        <div className="metric-card"><p className="label-overline">Activity</p><p className="text-sm font-semibold capitalize mt-0.5">{profile.activity_level ?? "—"}</p></div>
        <div className="metric-card"><p className="label-overline">Current streak</p><p className="text-lg font-display tabular-nums mt-0.5 text-orange-500">{profile.streak_current ?? 0}</p></div>
        <div className="metric-card"><p className="label-overline">Longest streak</p><p className="text-lg font-display tabular-nums mt-0.5">{profile.streak_longest ?? 0}</p></div>
      </div>

      {/* Achievements */}
      <h2 className="label-overline mb-2">Achievements <span className="text-primary">· {unlocked.size}/{allAchievements.length}</span></h2>
      {allAchievements.length === 0 ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground mb-4">No achievements yet</div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {allAchievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            const got = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                title={`${a.title} — ${a.description}`}
                className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition ${
                  got
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted/30 border-border text-muted-foreground/50 grayscale"
                }`}
              >
                <Icon className="size-6 mb-1" />
                <p className="text-[8px] font-bold uppercase tracking-wider leading-tight line-clamp-2">{a.title}</p>
                {got && <CheckCircle2 className="size-3 mt-1" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 mb-4">
        <Button variant="outline" className="w-full justify-start h-12" onClick={() => navigate({ to: "/subscription" })}>
          <Sparkles className="size-4 mr-2 text-primary" /> Manage subscription
        </Button>
        <Button variant="outline" className="w-full justify-start h-12" onClick={() => navigate({ to: "/billing" })}>
          <Scale className="size-4 mr-2" /> Billing history
        </Button>
        <Button variant="outline" className="w-full justify-start h-12" onClick={() => navigate({ to: "/onboarding" })}>
          <Settings className="size-4 mr-2" /> Edit fitness details
        </Button>
      </div>
    </MobileShell>
  );
}
