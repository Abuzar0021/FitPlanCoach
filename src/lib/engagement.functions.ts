import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side "today" is the container's UTC clock, not the user's actual
// local day — a US evening workout would silently log against "tomorrow".
// The client always sends its own local date (localDateKey()); this UTC
// fallback only covers callers that predate that param.
const ISO_DAY = () => new Date().toISOString().slice(0, 10);
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SetLog = z.object({
  exercise_name: z.string().min(1).max(120),
  set_number: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(1000).optional(),
  weight_kg: z.number().min(0).max(1000).optional(),
});

export const logWorkoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        focus: z.string().max(80).optional(),
        duration_min: z.number().int().min(1).max(600).optional(),
        notes: z.string().max(500).optional(),
        localDate: z.string().regex(LOCAL_DATE_RE).optional(),
        sets: z.array(SetLog).max(200).optional(),
        planned_sets: z.number().int().min(0).max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const uid = context.userId;
    const today = data.localDate ?? ISO_DAY();
    const loggedSets = data.sets ?? [];

    // Personal records: compare each newly-logged weight against this
    // user's best-ever weight for that exercise BEFORE this session.
    const exerciseNames = [...new Set(loggedSets.map((s) => s.exercise_name))];
    const priorBest = new Map<string, number>();
    if (exerciseNames.length) {
      const { data: history } = await db
        .from("workout_set_logs")
        .select("exercise_name, weight_kg")
        .eq("user_id", uid)
        .in("exercise_name", exerciseNames)
        .not("weight_kg", "is", null);
      for (const row of (history ?? []) as Array<{ exercise_name: string; weight_kg: number }>) {
        const prev = priorBest.get(row.exercise_name) ?? 0;
        if (row.weight_kg > prev) priorBest.set(row.exercise_name, row.weight_kg);
      }
    }
    const prs = new Set<string>();
    for (const s of loggedSets) {
      if (s.weight_kg == null) continue;
      const prev = priorBest.get(s.exercise_name);
      if (prev === undefined || s.weight_kg > prev) {
        prs.add(s.exercise_name);
        priorBest.set(s.exercise_name, s.weight_kg); // so a later, bigger set in the SAME session still counts once
      }
    }

    const { data: session } = await db
      .from("workout_sessions")
      .insert({
        user_id: uid,
        performed_on: today,
        focus: data.focus ?? null,
        duration_min: data.duration_min ?? null,
        notes: data.notes ?? null,
        planned_sets: data.planned_sets ?? null,
      })
      .select("id")
      .single();

    if (session?.id && loggedSets.length) {
      await db.from("workout_set_logs").insert(
        loggedSets.map((s) => ({
          session_id: session.id,
          user_id: uid,
          exercise_name: s.exercise_name,
          set_number: s.set_number,
          reps: s.reps ?? null,
          weight_kg: s.weight_kg ?? null,
        })),
      );
    }

    const completionPct = data.planned_sets
      ? Math.min(100, Math.round((loggedSets.length / data.planned_sets) * 100))
      : loggedSets.length > 0
        ? 100
        : null;

    const { data: prof } = await db
      .from("profiles")
      .select("streak_current, streak_longest, last_workout_date")
      .eq("id", uid)
      .maybeSingle();

    const last = prof?.last_workout_date ? new Date(prof.last_workout_date as string) : null;
    const now = new Date(today);
    let current: number = prof?.streak_current ?? 0;
    if (!last) current = 1;
    else {
      const diff = Math.round((now.getTime() - last.getTime()) / 86_400_000);
      if (diff === 0) current = current || 1;
      else if (diff === 1) current = current + 1;
      else current = 1;
    }
    const longest = Math.max(prof?.streak_longest ?? 0, current);
    await db
      .from("profiles")
      .update({ streak_current: current, streak_longest: longest, last_workout_date: today })
      .eq("id", uid);

    const unlocks: string[] = ["first_workout"];
    if (current >= 3) unlocks.push("streak_3");
    if (current >= 7) unlocks.push("streak_7");
    if (current >= 30) unlocks.push("streak_30");

    const { data: existing } = await db
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", uid)
      .in("achievement_id", unlocks);
    const have = new Set(((existing ?? []) as any[]).map((r) => r.achievement_id));
    const fresh = unlocks.filter((id) => !have.has(id));
    if (fresh.length) {
      await db
        .from("user_achievements")
        .insert(fresh.map((id) => ({ user_id: uid, achievement_id: id })));
      const { data: ach } = await db
        .from("achievements")
        .select("id,title,description")
        .in("id", fresh);
      const list = (ach ?? []) as any[];
      if (list.length) {
        await db.from("notifications").insert(
          list.map((a) => ({
            user_id: uid,
            category: "achievement",
            title: `Achievement unlocked: ${a.title}`,
            body: a.description,
            link: "/profile",
          })),
        );
      }
    }

    return {
      ok: true,
      session_id: session?.id ?? null,
      streak_current: current,
      streak_longest: longest,
      unlocked: fresh,
      prs: [...prs],
      completion_pct: completionPct,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    let q = db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (data.ids && data.ids.length) q = q.in("id", data.ids);
    await q;
    return { ok: true };
  });

export const updateProfileBasic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(80).optional(),
        avatar_url: z.string().url().max(500).nullable().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
    if (Object.keys(patch).length === 0) return { ok: true };
    await db.from("profiles").update(patch).eq("id", context.userId);
    return { ok: true };
  });
