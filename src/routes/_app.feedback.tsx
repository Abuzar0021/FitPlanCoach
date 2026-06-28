import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { EmptyState, PlanScreenSkeleton } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Lightbulb, ChevronUp, MessageSquare, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({ meta: [{ title: "Feature Requests — FitPlanCoach" }] }),
  component: Feedback,
});

type Status = "open" | "planned" | "in_progress" | "completed" | "rejected";
type Category = "feature" | "improvement" | "bug";
type Req = {
  id: string; user_id: string; title: string; description: string | null;
  category: Category; status: Status; vote_count: number; admin_note: string | null; created_at: string;
};
type Comment = { id: string; feature_request_id: string; user_id: string; body: string; created_at: string };

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-muted text-muted-foreground" },
  planned: { label: "Planned", cls: "bg-accent/15 text-accent border border-accent/30" },
  in_progress: { label: "In progress", cls: "bg-warning/15 text-warning border border-warning/30" },
  completed: { label: "Completed", cls: "bg-primary/15 text-primary border border-primary/30" },
  rejected: { label: "Not planned", cls: "bg-destructive/10 text-destructive/80 border border-destructive/20" },
};
const CATEGORY_LABEL: Record<Category, string> = { feature: "Feature", improvement: "Improvement", bug: "Bug" };
const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

function Feedback() {
  const { user } = useAuth();
  const db = supabase as any;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isStaff, setIsStaff] = useState(false);

  const [filter, setFilter] = useState<"all" | Status>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<Category>("feature");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!user) return;
    setError(false);
    try {
      const [{ data: r, error: e1 }, { data: v }, { data: roles }, { data: c }] = await Promise.all([
        db.from("feature_requests").select("*").order("vote_count", { ascending: false }).order("created_at", { ascending: false }),
        db.from("feature_request_votes").select("feature_request_id").eq("user_id", user.id),
        db.from("user_roles").select("role").eq("user_id", user.id),
        db.from("feature_request_comments").select("*").order("created_at"),
      ]);
      if (e1) throw e1;
      setReqs((r ?? []) as Req[]);
      setVoted(new Set(((v ?? []) as { feature_request_id: string }[]).map((x) => x.feature_request_id)));
      setIsStaff(((roles ?? []) as { role: string }[]).some((x) => x.role === "admin" || x.role === "owner"));
      const grouped: Record<string, Comment[]> = {};
      for (const cm of (c ?? []) as Comment[]) (grouped[cm.feature_request_id] ??= []).push(cm);
      setComments(grouped);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleVote(id: string) {
    if (!user) return;
    const has = voted.has(id);
    setVoted((prev) => {
      const n = new Set(prev);
      if (has) n.delete(id); else n.add(id);
      return n;
    });
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, vote_count: Math.max(0, r.vote_count + (has ? -1 : 1)) } : r)));
    const { error: err } = has
      ? await db.from("feature_request_votes").delete().eq("feature_request_id", id).eq("user_id", user.id)
      : await db.from("feature_request_votes").insert({ feature_request_id: id, user_id: user.id });
    if (err) {
      toast.error("Couldn't register your vote.");
      load();
    }
  }

  async function submit() {
    if (!user || title.trim().length < 3) return;
    setSubmitting(true);
    const { data, error: err } = await db
      .from("feature_requests")
      .insert({ user_id: user.id, title: title.trim(), description: desc.trim() || null, category })
      .select()
      .single();
    setSubmitting(false);
    if (err) {
      toast.error("Couldn't submit your idea. Please try again.");
      return;
    }
    setReqs((prev) => [data as Req, ...prev]);
    setTitle(""); setDesc(""); setCategory("feature");
    setDialogOpen(false);
    toast.success("Thanks — your idea is live. Others can vote on it now.");
  }

  async function addComment(reqId: string) {
    if (!user) return;
    const body = (draft[reqId] ?? "").trim();
    if (!body) return;
    const { data, error: err } = await db
      .from("feature_request_comments")
      .insert({ feature_request_id: reqId, user_id: user.id, body })
      .select()
      .single();
    if (err) {
      toast.error("Couldn't post your comment.");
      return;
    }
    setComments((prev) => ({ ...prev, [reqId]: [...(prev[reqId] ?? []), data as Comment] }));
    setDraft((prev) => ({ ...prev, [reqId]: "" }));
  }

  async function setStatus(reqId: string, status: Status) {
    setReqs((prev) => prev.map((r) => (r.id === reqId ? { ...r, status } : r)));
    const { error: err } = await db.from("feature_requests").update({ status }).eq("id", reqId);
    if (err) { toast.error("Couldn't update status."); load(); }
  }

  async function remove(reqId: string) {
    setReqs((prev) => prev.filter((r) => r.id !== reqId));
    const { error: err } = await db.from("feature_requests").delete().eq("id", reqId);
    if (err) { toast.error("Couldn't delete."); load(); }
  }

  const visible = reqs.filter((r) => (filter === "all" ? true : r.status === filter));

  const SubmitDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest an idea</DialogTitle>
          <DialogDescription>Tell us what would make FitPlanCoach better. The community votes on what we build next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="A short, clear title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Textarea placeholder="Describe the idea and why it matters (optional)" value={desc} maxLength={2000} rows={4} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(["feature", "improvement", "bug"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`py-2 rounded-xl border text-xs font-semibold transition ${category === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border-strong"}`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting || title.trim().length < 3} className="w-full font-bold uppercase tracking-wider">
            {submitting ? "Submitting…" : "Submit idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) return <MobileShell><PlanScreenSkeleton /></MobileShell>;

  return (
    <MobileShell>
      <div className="flex items-end justify-between mb-1">
        <div>
          <p className="label-overline">Shape the roadmap</p>
          <h1 className="text-3xl font-display uppercase italic">Ideas</h1>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="font-bold uppercase tracking-wide">
          <Plus className="size-4 mr-1" /> Suggest
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Suggest features, vote on what matters most, and follow what we're building.</p>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 mb-4 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition ${filter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-border-strong"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="pt-10 text-center space-y-3">
          <p className="text-sm text-destructive">We couldn't load the board.</p>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={filter === "all" ? "No ideas yet" : "Nothing here yet"}
          description={filter === "all" ? "Be the first to suggest a feature. Good ideas rise to the top as people vote." : "No requests with this status yet."}
          action={<Button onClick={() => setDialogOpen(true)} className="font-bold uppercase tracking-wider h-11 px-6"><Plus className="size-4 mr-1" /> Suggest an idea</Button>}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const open = expanded === r.id;
            const cms = comments[r.id] ?? [];
            const hasVoted = voted.has(r.id);
            return (
              <div key={r.id} className="surface-card overflow-hidden">
                <div className="p-4 flex gap-3">
                  <button
                    onClick={() => toggleVote(r.id)}
                    aria-pressed={hasVoted}
                    aria-label={hasVoted ? "Remove vote" : "Vote"}
                    className={`shrink-0 w-12 rounded-xl border flex flex-col items-center justify-center py-1.5 transition ${hasVoted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border-strong"}`}
                  >
                    <ChevronUp className="size-4" strokeWidth={hasVoted ? 3 : 2} />
                    <span className="text-sm font-bold tabular-nums">{r.vote_count}</span>
                  </button>

                  <button onClick={() => setExpanded(open ? null : r.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_META[r.status].cls}`}>{STATUS_META[r.status].label}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{CATEGORY_LABEL[r.category]}</span>
                    </div>
                    <p className="font-semibold mt-1.5 leading-snug">{r.title}</p>
                    {!open && r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageSquare className="size-3" /> {cms.length} {cms.length === 1 ? "comment" : "comments"}
                    </div>
                  </button>
                </div>

                {open && (
                  <div className="px-4 pb-4 border-t border-border pt-3 animate-in fade-in duration-200">
                    {r.description && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{r.description}</p>}
                    {r.admin_note && (
                      <div className="mt-3 text-xs bg-primary/5 border border-primary/20 rounded-xl p-3">
                        <span className="font-bold text-primary uppercase tracking-widest text-[10px]">Team note</span>
                        <p className="text-muted-foreground mt-1">{r.admin_note}</p>
                      </div>
                    )}

                    {/* Staff controls */}
                    {isStaff && (
                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={r.status}
                          onChange={(e) => setStatus(r.id, e.target.value as Status)}
                          className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          aria-label="Set status"
                        >
                          {(Object.keys(STATUS_META) as Status[]).map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                        <button onClick={() => remove(r.id)} aria-label="Delete request" className="size-9 rounded-lg border border-destructive/30 text-destructive inline-flex items-center justify-center hover:bg-destructive/10">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="mt-4 space-y-2.5">
                      {cms.map((cm) => (
                        <div key={cm.id} className="text-sm bg-card/60 border border-border rounded-xl p-2.5">
                          <p className="text-foreground leading-relaxed whitespace-pre-line">{cm.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(cm.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        placeholder="Add a comment"
                        value={draft[r.id] ?? ""}
                        maxLength={1000}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") addComment(r.id); }}
                      />
                      <Button size="icon" onClick={() => addComment(r.id)} disabled={!(draft[r.id] ?? "").trim()} aria-label="Post comment">
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {SubmitDialog}
    </MobileShell>
  );
}
