// Daily tips engine.
//
// Goals: relevant, human, never-repeating micro-education that appears once a
// day and can be dismissed — never spam. Selection is deterministic per day
// (stable within a day, rotates the next) and avoids recently-shown tips via a
// small localStorage ring buffer, so users don't see the same tip twice soon.
//
// Tips are hand-written and specific on purpose; generic "drink water, stay
// motivated" filler is deliberately avoided.

export type TipCategory =
  | "workout"
  | "nutrition"
  | "hydration"
  | "recovery"
  | "sleep"
  | "motivation"
  | "mindset";

export type Goal = "lose_fat" | "build_muscle" | "maintain";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Tip {
  id: string;
  category: TipCategory;
  text: string;
  /** If set, only shown to users with one of these goals. */
  goals?: Goal[];
  /** If set, only shown during these parts of the day. */
  timeOfDay?: TimeOfDay[];
}

export const TIPS: Tip[] = [
  // Workout
  { id: "wk_small_jumps", category: "workout", text: "Add 2.5 kg before you add reps. Small, frequent jumps compound faster than big, rare ones — and your joints prefer them too." },
  { id: "wk_tempo", category: "workout", text: "Struggling to finish a set cleanly? Slow the lowering phase to three seconds. More control, less momentum, better results." },
  { id: "wk_warmup", category: "workout", text: "Warm up the movement, not just the muscle. Two light sets of today's first lift beats five minutes on a treadmill.", timeOfDay: ["morning", "afternoon"] },
  { id: "wk_avoided", category: "workout", text: "Train the lift you avoid. The exercise you keep skipping usually has the most progress still left in it." },
  { id: "wk_rest", category: "workout", text: "Rest fully between heavy sets — two to three minutes. Rushing turns strength work into cardio and leaves gains on the table.", goals: ["build_muscle"] },
  { id: "wk_form_first", category: "workout", text: "If your form breaks down, the set is over — that last ugly rep trains compensation, not strength." },

  // Nutrition
  { id: "nu_protein_first", category: "nutrition", text: "Build every plate around protein first, then fill the rest. It's the one macro that protects muscle whether you're cutting or gaining." },
  { id: "nu_breakfast_protein", category: "nutrition", text: "Aim for 30 g of protein at breakfast. It blunts cravings for hours and is the easiest meal to get right.", timeOfDay: ["morning"] },
  { id: "nu_eating_out", category: "nutrition", text: "Eating out tonight? Pick a protein and a veg side, skip the bread basket, and you've already won the meal.", timeOfDay: ["evening"] },
  { id: "nu_fiber", category: "nutrition", text: "Fiber is the quiet hero — beans, oats, berries. It keeps you full on fewer calories without any willpower required.", goals: ["lose_fat"] },
  { id: "nu_clean_surplus", category: "nutrition", text: "A surplus builds muscle, but a modest one builds it leaner. Add 250–300 calories, not a free-for-all.", goals: ["build_muscle"] },
  { id: "nu_plan_ahead", category: "nutrition", text: "Decide dinner before you're hungry. Hunger is a terrible negotiator; your calmer self makes the better call.", timeOfDay: ["afternoon"] },

  // Hydration
  { id: "hy_preload", category: "hydration", text: "Thirsty mid-workout means you started behind. Drink a glass of water about 30 minutes before you train." },
  { id: "hy_electrolytes", category: "hydration", text: "On heavy training days, a pinch of salt in your water helps. Hydration is about electrolytes, not just volume." },
  { id: "hy_coffee", category: "hydration", text: "Coffee counts toward your fluids — the dehydration myth is overblown. Just try to keep it before mid-afternoon.", timeOfDay: ["morning"] },

  // Recovery
  { id: "re_soreness", category: "recovery", text: "Soreness isn't a scoreboard. You can build muscle without being wrecked the next day — consistency beats punishment." },
  { id: "re_walk", category: "recovery", text: "A 10-minute walk after dinner does more for recovery and digestion than another supplement ever will.", timeOfDay: ["evening"] },
  { id: "re_deload", category: "recovery", text: "Deload before you have to. A lighter week every 6–8 weeks keeps progress climbing instead of stalling." },

  // Sleep
  { id: "sl_growth", category: "sleep", text: "Most of your recovery happens asleep. Seven hours is part of your program, not a reward for finishing it." },
  { id: "sl_screens", category: "sleep", text: "Screens in the last hour cost you deep sleep. Charge your phone across the room and watch your recovery improve.", timeOfDay: ["evening"] },
  { id: "sl_consistency", category: "sleep", text: "Same wake-up time every day — weekends included. A steady rhythm beats chasing lost sleep on Sundays.", timeOfDay: ["morning"] },

  // Motivation
  { id: "mo_start", category: "motivation", text: "Motivation gets you started; the plan keeps you going. On the days you don't feel it, just open today's session and begin." },
  { id: "mo_four_of_seven", category: "motivation", text: "You don't need a perfect week. Four good days out of seven, repeated for months, is what actually changes a body." },
  { id: "mo_past_self", category: "motivation", text: "Compare today to the you from three months ago — never to someone else's highlight reel." },

  // Mindset
  { id: "mi_discipline", category: "mindset", text: "Discipline is just remembering what you want. Picture the version of you who already trained today." },
  { id: "mi_flat_week", category: "mindset", text: "Progress is rarely a straight line. A flat week on the scale is data, not failure — keep showing up." },
  { id: "mi_one_rep", category: "mindset", text: "Make the next rep the only one that matters. Whole workouts feel heavy; single reps rarely do." },
];

export interface TipContext {
  goal?: Goal | null;
  timeOfDay?: TimeOfDay;
}

const SEEN_KEY = "myfp:seen_tips";
const SEEN_MAX = 18;

export function currentTimeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Record a tip as shown so it isn't surfaced again until the buffer cycles. */
export function markTipSeen(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = readSeen().filter((x) => x !== id);
    seen.push(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-SEEN_MAX)));
  } catch {
    /* ignore */
  }
}

function dayHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Pick today's tip for the given context. Stable within a day, rotates the
 * next, and prefers tips the user hasn't seen recently.
 */
export function pickDailyTip(ctx: TipContext = {}): Tip | null {
  const tod = ctx.timeOfDay ?? currentTimeOfDay();
  const goal = ctx.goal ?? undefined;

  const eligible = TIPS.filter(
    (t) =>
      (!t.goals || (goal !== undefined && t.goals.includes(goal))) &&
      (!t.timeOfDay || t.timeOfDay.includes(tod)),
  );
  if (eligible.length === 0) return TIPS[0] ?? null;

  const seen = readSeen();
  const fresh = eligible.filter((t) => !seen.includes(t.id));
  const pool = fresh.length > 0 ? fresh : eligible;

  const key = `${new Date().toISOString().slice(0, 10)}|${tod}`;
  return pool[dayHash(key) % pool.length];
}
