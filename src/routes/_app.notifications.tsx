import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { markNotificationsRead } from "@/lib/engagement.functions";
import { Bell, CheckCheck, CreditCard, Trophy, User, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FitPlanCoach" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const ICON: Record<string, any> = {
  payment: CreditCard,
  subscription: Sparkles,
  achievement: Trophy,
  goal: Target,
  account: User,
  system: Bell,
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[] | null>(null);
  const markFn = useServerFn(markNotificationsRead);

  async function load() {
    if (!user) return;
    const db: any = supabase;
    const { data } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Notif[]);
  }
  useEffect(() => { load(); }, [user]);

  async function markAll() {
    try {
      await markFn({ data: {} });
      toast.success("All marked as read");
      load();
    } catch {
      toast.error("Could not update notifications");
    }
  }

  const unread = items?.filter((n) => !n.read_at).length ?? 0;

  return (
    <MobileShell>
      <div className="flex items-end justify-between mb-4">
        <div className="min-w-0">
          <p className="label-overline">Inbox</p>
          <h1 className="text-2xl font-display uppercase italic truncate">Notifications</h1>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAll} className="shrink-0">
            <CheckCheck className="size-4 mr-1.5" /> Mark all
          </Button>
        )}
      </div>

      {items === null && (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card/60 border border-border animate-pulse" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="surface-card p-10 text-center">
          <div className="size-14 mx-auto mb-3 rounded-2xl bg-muted inline-flex items-center justify-center">
            <Bell className="size-6 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg uppercase italic">You're all caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">
            New notifications about your subscription, payments, and achievements will appear here.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {items?.map((n) => {
          const Icon = ICON[n.category] ?? Bell;
          const body = (
            <div className={`surface-card p-4 flex items-start gap-3 transition ${n.read_at ? "opacity-70" : "border-primary/30"}`}>
              <div className="size-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{n.title}</p>
                  {!n.read_at && <span className="size-2 rounded-full bg-primary shrink-0" />}
                </div>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </div>
          );
          return n.link ? (
            <Link key={n.id} to={n.link as any} onClick={() => !n.read_at && markFn({ data: { ids: [n.id] } }).then(load)}>
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })}
      </div>
    </MobileShell>
  );
}
