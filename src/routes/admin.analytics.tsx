import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Activity,
  UserPlus,
  Dumbbell,
  Crown,
  Eye,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/analytics-admin.functions";
import { AdminHeader, StatCard } from "@/components/admin-ui";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AnalyticsAdmin,
});

const RANGES = [7, 30, 90] as const;

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  signup: "Signups",
  login: "Logins",
  onboarded: "Onboarded",
  plan_generated: "Plans generated",
  meal_generated: "Meals generated",
  subscription_purchased: "Subscriptions",
  play_store_click: "Play Store clicks",
  web_signup_click: "Signup clicks",
};

function AnalyticsAdmin() {
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSummary({ data: { days } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, fetchSummary]);

  const cards = data
    ? [
        { label: "Total events", value: data.totalEvents, icon: Activity },
        { label: "Active users", value: data.uniqueUsers, icon: Users },
        { label: "Signups", value: data.keyMetrics.signups, icon: UserPlus },
        { label: "Onboarded", value: data.keyMetrics.onboarded, icon: CheckCircle2 },
        { label: "Plans generated", value: data.keyMetrics.plansGenerated, icon: Dumbbell },
        { label: "Subscriptions", value: data.keyMetrics.subscriptions, icon: Crown },
        { label: "Page views", value: data.keyMetrics.pageViews, icon: Eye },
        { label: "Play Store clicks", value: data.keyMetrics.playStoreClicks, icon: Smartphone },
      ]
    : [];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Analytics"
        actions={
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  days === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          Couldn't load analytics.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((c) => (
              <StatCard
                key={c.label}
                icon={c.icon}
                label={c.label}
                value={c.value.toLocaleString()}
                accent="text-primary"
              />
            ))}
          </div>

          <div className="surface-card p-5">
            <h2 className="font-semibold mb-3">Events over time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.daily.map((d) => ({ date: d.date.slice(5), events: d.events }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-semibold mb-3">Events by type</h2>
            {data.byEvent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded in this range.</p>
            ) : (
              <div className="space-y-2">
                {data.byEvent.map((e) => {
                  const pct = data.totalEvents ? Math.round((e.count / data.totalEvents) * 100) : 0;
                  return (
                    <div key={e.event} className="flex items-center gap-3">
                      <div className="w-40 text-sm truncate">
                        {EVENT_LABELS[e.event] ?? e.event}
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm tabular-nums">
                        {e.count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
