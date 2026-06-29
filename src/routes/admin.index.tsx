import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Sparkles,
  Flame,
} from "lucide-react";
import { AdminHeader, StatCard, AdminSectionLabel } from "@/components/admin-ui";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — FitPlanCoach" }] }),
  component: AdminHome,
});

const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

function AdminHome() {
  const [stats, setStats] = useState({
    users: 0,
    newUsers7: 0,
    newUsers30: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    paidSubs: 0,
    freeUsers: 0,
    conversionRate: 0,
    mrr: 0,
    arr: 0,
    openTickets: 0,
    urgentTickets: 0,
    avgStreak: 0,
  });
  const [eventsDaily, setEventsDaily] = useState<{ day: string; events: number }[]>([]);
  const [signupsDaily, setSignupsDaily] = useState<{ day: string; signups: number }[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const db: any = supabase;
      const [
        { count: users },
        { count: newUsers7 },
        { count: newUsers30 },
        { data: dauData },
        { data: wauData },
        { data: mauData },
        { data: subs },
        { data: events30 },
        { data: signups30 },
        { count: openTickets },
        { count: urgentTickets },
        { data: streakStats },
        { data: topEngaged },
      ] = await Promise.all([
        db.from("profiles").select("*", { count: "exact", head: true }),
        db.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since(7)),
        db
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since(30)),
        db.from("analytics_events").select("user_id").gte("created_at", since(1)),
        db.from("analytics_events").select("user_id").gte("created_at", since(7)),
        db.from("analytics_events").select("user_id").gte("created_at", since(30)),
        db.from("subscriptions").select("plan_type,billing_interval,status"),
        db.from("analytics_events").select("created_at").gte("created_at", since(30)),
        db.from("profiles").select("created_at").gte("created_at", since(30)),
        db
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        db
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("priority", "urgent")
          .in("status", ["open", "in_progress"]),
        db.from("profiles").select("streak_current"),
        db
          .from("profiles")
          .select("id,name,email,streak_current,streak_longest,last_workout_date")
          .order("streak_current", { ascending: false })
          .limit(8),
      ]);

      const dau = new Set((dauData ?? []).map((e: any) => e.user_id).filter(Boolean)).size;
      const wau = new Set((wauData ?? []).map((e: any) => e.user_id).filter(Boolean)).size;
      const mau = new Set((mauData ?? []).map((e: any) => e.user_id).filter(Boolean)).size;
      const paidSubs = (subs ?? []).filter(
        (s: any) => s.plan_type !== "free" && s.status === "active",
      );
      const totalUsers = users ?? 0;
      const conversionRate = totalUsers > 0 ? (paidSubs.length / totalUsers) * 100 : 0;
      const monthlyPriceCents = 500; // Pro monthly (Google Play product price)
      const annualPriceCents = 5000; // Pro annual (Google Play product price)
      const mrr =
        paidSubs.reduce((sum: number, s: any) => {
          if (s.billing_interval === "annual") return sum + annualPriceCents / 12;
          return sum + monthlyPriceCents;
        }, 0) / 100;
      const arr = mrr * 12;

      // bucketed daily series
      const eventBuckets = new Map<string, number>();
      const signupBuckets = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        eventBuckets.set(d, 0);
        signupBuckets.set(d, 0);
      }
      for (const e of events30 ?? []) {
        const d = (e as any).created_at.slice(0, 10);
        if (eventBuckets.has(d)) eventBuckets.set(d, (eventBuckets.get(d) ?? 0) + 1);
      }
      for (const e of signups30 ?? []) {
        const d = (e as any).created_at.slice(0, 10);
        if (signupBuckets.has(d)) signupBuckets.set(d, (signupBuckets.get(d) ?? 0) + 1);
      }
      const avgStreak = streakStats?.length
        ? streakStats.reduce((a: number, r: any) => a + (r.streak_current ?? 0), 0) /
          streakStats.length
        : 0;

      setEventsDaily(
        [...eventBuckets.entries()].map(([day, events]) => ({ day: day.slice(5), events })),
      );
      setSignupsDaily(
        [...signupBuckets.entries()].map(([day, signups]) => ({ day: day.slice(5), signups })),
      );
      setStats({
        users: totalUsers,
        newUsers7: newUsers7 ?? 0,
        newUsers30: newUsers30 ?? 0,
        dau,
        wau,
        mau,
        paidSubs: paidSubs.length,
        freeUsers: totalUsers - paidSubs.length,
        conversionRate,
        mrr,
        arr,
        openTickets: openTickets ?? 0,
        urgentTickets: urgentTickets ?? 0,
        avgStreak,
      });
      setTopUsers(topEngaged ?? []);
    })();
  }, []);

  const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("en-US", opts).format(n);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Owner dashboard"
        subtitle="Real-time metrics across users, revenue, engagement, and support."
      />

      {/* Alerts */}
      {stats.urgentTickets > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Needs attention</p>
            <div className="text-xs text-muted-foreground mt-1">
              <Link to="/admin/support" className="underline hover:text-foreground">
                {stats.urgentTickets} urgent ticket{stats.urgentTickets === 1 ? "" : "s"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Revenue */}
      <div>
        <AdminSectionLabel>Revenue</AdminSectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            icon={DollarSign}
            label="MRR"
            value={`$${fmt(Math.round(stats.mrr))}`}
            accent="text-primary"
          />
          <StatCard
            icon={TrendingUp}
            label="ARR"
            value={`$${fmt(Math.round(stats.arr))}`}
            accent="text-primary"
          />
          <StatCard
            icon={Sparkles}
            label="Paid subs"
            value={stats.paidSubs}
            sub={`${stats.conversionRate.toFixed(1)}% conversion`}
          />
        </div>
      </div>

      {/* Users */}
      <div>
        <AdminSectionLabel>Users</AdminSectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Total users"
            value={fmt(stats.users)}
            sub={`+${stats.newUsers30} in 30d`}
          />
          <StatCard
            icon={Activity}
            label="DAU"
            value={fmt(stats.dau)}
            sub={`${stats.wau} WAU · ${stats.mau} MAU`}
          />
          <StatCard
            icon={Sparkles}
            label="New 7d"
            value={fmt(stats.newUsers7)}
            sub={`+${stats.newUsers30} in 30d`}
          />
          <StatCard
            icon={Flame}
            label="Avg streak"
            value={stats.avgStreak.toFixed(1)}
            sub="days"
            accent="text-orange-500"
          />
        </div>
      </div>

      {/* Support queue */}
      <div className="grid md:grid-cols-2 gap-3">
        <StatCard
          icon={Sparkles}
          label="Free users"
          value={fmt(stats.freeUsers)}
          sub={`${stats.paidSubs} paid`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Open tickets"
          value={stats.openTickets}
          sub={`${stats.urgentTickets} urgent`}
          accent={stats.openTickets > 0 ? "text-amber-500" : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="surface-card p-4">
          <h3 className="font-semibold text-sm mb-3">Signups · last 30d</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={signupsDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface-card p-4">
          <h3 className="font-semibold text-sm mb-3">Activity events · last 30d</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={eventsDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="events" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div>
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Most engaged users</h3>
            <Link to="/admin/users" className="text-xs text-primary hover:underline">
              All →
            </Link>
          </div>
          <div className="space-y-1.5">
            {topUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">No users yet.</p>
            )}
            {topUsers.map((u: any) => (
              <div
                key={u.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name ?? u.email ?? u.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 shrink-0">
                  <Flame className="size-3" /> {u.streak_current ?? 0}
                  <span className="text-muted-foreground font-normal">
                    / {u.streak_longest ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
