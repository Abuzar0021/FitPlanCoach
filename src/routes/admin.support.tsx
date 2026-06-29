import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { replySupportTicket, updateTicketStatus } from "@/lib/support.functions";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support — Admin" }] }),
  component: AdminSupport,
});

const STATUSES = ["open", "in_progress", "waiting_user", "resolved", "closed"] as const;
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  waiting_user: "bg-purple-500/15 text-purple-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};

function AdminSupport() {
  const { user } = useAuth();
  const replyFn = useServerFn(replySupportTicket);
  const statusFn = useServerFn(updateTicketStatus);
  const [tickets, setTickets] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<string>("open");
  const [busy, setBusy] = useState(false);

  async function load() {
    const db: any = supabase;
    let q = db
      .from("support_tickets")
      .select("*, profiles!inner(name,email)")
      .order("last_activity_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setTickets(data ?? []);
  }
  useEffect(() => {
    load();
  }, [filter]);

  async function openTicket(t: any) {
    setActive(t);
    const db: any = supabase;
    const { data } = await db
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at");
    setMessages(data ?? []);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setBusy(true);
    try {
      await replyFn({ data: { ticket_id: active.id, body: reply.trim() } });
      setReply("");
      await openTicket(active);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(s: (typeof STATUSES)[number]) {
    if (!active) return;
    try {
      await statusFn({ data: { ticket_id: active.id, status: s } });
      toast.success(`Marked ${s.replace("_", " ")}`);
      setActive({ ...active, status: s });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="Support tickets" />
      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-4">
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {tickets.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No tickets in this view.</p>
          )}
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => openTicket(t)}
              className={`w-full text-left p-3 rounded-xl border transition ${active?.id === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-border-strong"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[t.status]}`}
                >
                  {t.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {t.profiles?.email ?? "—"} · {t.category} ·{" "}
                {new Date(t.last_activity_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        <div className="surface-card p-5">
          {!active ? (
            <p className="text-sm text-muted-foreground">Select a ticket.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3 border-b border-border pb-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{active.subject}</h2>
                  <p className="text-xs text-muted-foreground">
                    {active.profiles?.email} · {active.category} · #{active.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      disabled={s === active.status}
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${s === active.status ? STATUS_COLORS[s] : "bg-muted hover:bg-muted/70"}`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-3 max-h-[50vh] overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-sm ${m.author_role === "staff" ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-border"}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-muted-foreground">
                      {m.author_role === "staff" ? "Support" : "User"} ·{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>

              {active.status !== "closed" && (
                <form onSubmit={send} className="flex gap-2 items-end">
                  <Textarea
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply to user…"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={busy || !reply.trim()}>
                    <Send className="size-4 mr-1.5" /> Send
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
