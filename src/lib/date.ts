// Local-timezone date helpers. `Date#toISOString()` always converts to UTC,
// so `.toISOString().slice(0, 10)` silently returns the WRONG calendar day
// for any user not near UTC (an evening workout in the US logs against
// "tomorrow"; a morning one in Asia/Oceania logs against "yesterday"). Use
// these instead anywhere "today" needs to mean the user's actual local day.
// Automatically follows DST since it reads the runtime's local date parts.

/** YYYY-MM-DD in the local timezone of wherever this runs. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar days between two YYYY-MM-DD keys (b - a). */
export function daysBetweenKeys(a: string, b: string): number {
  const toUTC = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}
