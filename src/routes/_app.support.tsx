import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { createSupportTicket, replySupportTicket } from "@/lib/support.functions";
import { toast } from "sonner";
import { HelpCircle, Plus, Send, Mail, Zap } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { useSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/_app/support")({
  head: () => ({ meta: [{ title: "Support — FitPlanCoach" }] }),
  component: SupportPage,
});

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  last_activity_at: string;
};
type Msg = { id: string; author_role: string; body: string; created_at: string };

const CATEGORIES = [
  { v: "account", l: "Account" },
  { v: "billing", l: "Billing" },
  { v: "payment", l: "Payment issue" },
  { v: "technical", l: "Technical bug" },
  { v: "feedback", l: "Feedback" },
  { v: "other", l: "Other" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  waiting_user: "bg-purple-500/15 text-purple-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};

function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { has } = usePlan();
  const priority = has("priority_support");
  const { config } = useSiteConfig();
  const createFn = useServerFn(createSupportTicket);
  const replyFn = useServerFn(replySupportTicket);

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // New ticket form
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "technical" as typeof CATEGORIES[number]["v"], message: "" });

  async function load() {
    if (!user) return;
    const db: any = supabase;
    const { data } = await db
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  }
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    const db: any = supabase;
    db.from("support_ticket_messages").select("*").eq("ticket_id", active).order("created_at").then(({ data }: any) => {
      setMessages((data ?? []) as Msg[]);
    });
  }, [active]);

  const activeTicket = useMemo(() => tickets?.find((t) => t.id === active) ?? null, [tickets, active]);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createFn({ data: form });
      toast.success("Ticket created — we'll reply soon");
      setForm({ subject: "", category: "technical", message: "" });
      setCreating(false);
      await load();
      setActive(res.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create ticket");
    } finally { setBusy(false); }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setBusy(true);
    try {
      await replyFn({ data: { ticket_id: active, body: reply.trim() } });
      setReply("");
      const db: any = supabase;
      const { data } = await db.from("support_ticket_messages").select("*").eq("ticket_id", active).order("created_at");
      setMessages((data ?? []) as Msg[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reply");
    } finally { setBusy(false); }
  }

  return (
    <MobileShell>
      <div className="flex items-end justify-between mb-4">
        <div className="min-w-0">
          <p className="label-overline">Support</p>
          <h1 className="text-2xl font-display uppercase italic truncate">Help center</h1>
        </div>
        <Button size="sm" onClick={() => { setActive(null); setCreating(true); }} className="shrink-0">
          <Plus className="size-4 mr-1.5" /> New
        </Button>
      </div>

      {priority && (
        <div className="surface-card p-3 mb-4 flex items-center gap-3 animate-fade-in">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/30 inline-flex items-center justify-center shrink-0">
            <Zap className="size-4 text-primary" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="label-overline text-primary">Priority support</p>
            <p className="text-xs text-muted-foreground">Your tickets are answered first — usually within one business day.</p>
          </div>
        </div>
      )}

      {/* New ticket form */}
      {creating && (
        <form onSubmit={submitNew} className="surface-card p-4 mb-4 space-y-3 animate-fade-in">
          <div>
            <Label className="label-overline">Subject</Label>
            <Input required maxLength={140} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="What's going on?" />
          </div>
          <div>
            <Label className="label-overline">Category</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {CATEGORIES.map((c) => (
                <button key={c.v} type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.v }))}
                  className={`text-xs font-semibold py-2 rounded-lg border ${form.category === c.v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}
                >{c.l}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="label-overline">Message</Label>
            <Textarea required maxLength={4000} rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Describe what happened, with steps if possible." />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">{busy ? "Sending…" : "Send ticket"}</Button>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Active conversation */}
      {activeTicket && (
        <div className="surface-card p-4 mb-4 animate-fade-in">
          <button onClick={() => setActive(null)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground mb-2">← Back</button>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-semibold text-sm truncate">{activeTicket.subject}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[activeTicket.status]}`}>
              {activeTicket.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{activeTicket.category} · #{activeTicket.id.slice(0, 8)}</p>

          <div className="space-y-2 mb-3 max-h-[55vh] overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-xl text-sm ${m.author_role === "staff" ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-border"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-muted-foreground">
                  {m.author_role === "staff" ? "Support" : "You"} · {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>

          {activeTicket.status !== "closed" && (
            <form onSubmit={submitReply} className="flex gap-2 items-end">
              <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" className="flex-1" />
              <Button type="submit" disabled={busy || !reply.trim()} size="sm"><Send className="size-4" /></Button>
            </form>
          )}
        </div>
      )}

      {/* Ticket list */}
      {!creating && !activeTicket && (
        <>
          {tickets === null ? (
            <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-card/60 border border-border animate-pulse" />)}</div>
          ) : tickets.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <div className="size-14 mx-auto mb-3 rounded-2xl bg-muted inline-flex items-center justify-center">
                <HelpCircle className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg uppercase italic">No tickets yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Stuck on something? Open a ticket and we'll get back to you within {priority ? "one business day" : "1–2 business days"}.
              </p>
              <Button onClick={() => setCreating(true)}><Plus className="size-4 mr-1.5" /> Open a ticket</Button>
              <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> Or email {config.support_email}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => (
                <button key={t.id} onClick={() => setActive(t.id)}
                  className="w-full text-left surface-card p-4 hover:border-border-strong transition">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-semibold text-sm truncate">{t.subject}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t.category} · {new Date(t.last_activity_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </MobileShell>
  );
}
