import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listPaymentSubmissions,
  reviewPaymentSubmission,
} from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Admin" }] }),
  component: AdminPayments,
});

type StatusFilter = "pending" | "approved" | "rejected" | "expired" | "all";

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

function AdminPayments() {
  const listFn = useServerFn(listPaymentSubmissions);
  const reviewFn = useServerFn(reviewPaymentSubmission);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listFn({ data: { status: filter } });
      setRows(res.submissions);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && !notesById[id]) {
      if (!confirm("Reject without a note?")) return;
    }
    setBusyId(id);
    try {
      await reviewFn({ data: { submission_id: id, action, notes: notesById[id] || undefined } });
      toast.success(action === "approve" ? "Approved & subscription activated" : "Rejected");
      setNotesById((m) => ({ ...m, [id]: "" }));
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const filters: StatusFilter[] = ["pending", "approved", "rejected", "expired", "all"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        Payment submissions{" "}
        <span className="text-sm text-muted-foreground font-normal">({rows.length})</span>
      </h1>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs uppercase font-semibold px-3 py-1.5 rounded-full border ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions in this view.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold">
                    {r.user?.name ?? r.user?.email ?? r.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                    r.status === "approved"
                      ? "bg-primary/10 text-primary"
                      : r.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : r.status === "expired"
                          ? "bg-muted text-muted-foreground"
                          : "bg-warning/10 text-warning-foreground"
                  }`}
                >
                  {r.status === "approved" ? <CheckCircle2 className="size-3" /> : r.status === "rejected" ? <XCircle className="size-3" /> : <Clock className="size-3" />}
                  {r.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Plan</div>
                  <div className="font-semibold capitalize">{r.plan} · {r.billing_interval}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Method</div>
                  <div className="font-semibold uppercase">{r.method}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-semibold">{money(r.amount_cents, r.currency)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Submitted</div>
                  <div className="font-semibold">{new Date(r.submitted_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {r.paypal_transaction_id && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-muted-foreground">PayPal TX</div>
                    <div className="font-mono break-all">{r.paypal_transaction_id}</div>
                  </div>
                )}
                {r.payer_email && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-muted-foreground">Payer email</div>
                    <div className="break-all">{r.payer_email}</div>
                  </div>
                )}
                {r.transaction_ref && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-muted-foreground">Reference</div>
                    <div className="font-mono break-all">{r.transaction_ref}</div>
                  </div>
                )}
                {r.proof_url && (
                  <a
                    href={r.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-muted rounded-lg p-2 hover:bg-accent flex items-center gap-2"
                  >
                    <ExternalLink className="size-3" />
                    View payment proof
                  </a>
                )}
              </div>

              {r.user_notes && (
                <p className="text-xs italic text-muted-foreground">"{r.user_notes}"</p>
              )}
              {r.review_notes && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Decision note:</span> {r.review_notes}
                </p>
              )}

              {r.status === "pending" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea
                    placeholder="Optional note for the user (required if rejecting)…"
                    value={notesById[r.id] ?? ""}
                    onChange={(e) => setNotesById((m) => ({ ...m, [r.id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busyId === r.id}
                      onClick={() => review(r.id, "approve")}
                    >
                      Approve & activate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={busyId === r.id}
                      onClick={() => review(r.id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
