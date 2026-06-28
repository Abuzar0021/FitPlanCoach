import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import {
  adminResetSubscription,
  setAdminRole,
  transferOwnership,
} from "@/lib/admin-subscriptions.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersAdmin,
});

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  goal: string | null;
  country: string | null;
  banned: boolean;
  created_at: string;
  plan_type: string;
  status: string;
  role: "owner" | "admin" | "user";
};

function UsersAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const resetSubFn = useServerFn(adminResetSubscription);
  const setAdminFn = useServerFn(setAdminRole);
  const transferFn = useServerFn(transferOwnership);

  async function load() {
    const [{ data: profiles }, { data: subs }, { data: rolesRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,name,goal,country,banned,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id,plan_type,status"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const subMap: Map<string, any> = new Map((subs ?? []).map((s: any) => [s.user_id, s]));
    const roleMap = new Map<string, "owner" | "admin" | "user">();
    for (const r of rolesRows ?? []) {
      const cur = roleMap.get((r as any).user_id);
      const next = (r as any).role as "owner" | "admin" | "user";
      // Highest-priority wins: owner > admin > user
      if (!cur || next === "owner" || (next === "admin" && cur === "user")) {
        roleMap.set((r as any).user_id, next);
      }
    }
    if (user) setIsOwner(roleMap.get(user.id) === "owner");
    setRows(
      (profiles ?? []).map((p: any) => ({
        ...p,
        plan_type: subMap.get(p.id)?.plan_type ?? "free",
        status: subMap.get(p.id)?.status ?? "active",
        role: roleMap.get(p.id) ?? "user",
      })),
    );
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function ban(id: string, banned: boolean) {
    await supabase.from("profiles").update({ banned: !banned }).eq("id", id);
    load();
    toast.success(!banned ? "User banned" : "Unbanned");
  }
  async function resetSub(id: string) {
    try {
      await resetSubFn({ data: { userId: id } });
      toast.success("Subscription reset");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }
  async function toggleAdmin(id: string, currentRole: Row["role"]) {
    if (currentRole === "owner") {
      toast.error("Cannot modify the owner's role");
      return;
    }
    const grant = currentRole !== "admin";
    try {
      await setAdminFn({ data: { userId: id, grant } });
      toast.success(grant ? "Granted admin" : "Revoked admin");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }
  async function doTransfer(id: string, email: string | null) {
    if (!confirm(`Transfer ownership to ${email ?? id}? You will be demoted to admin.`)) return;
    try {
      await transferFn({ data: { newOwnerId: id } });
      toast.success("Ownership transferred");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  const filtered = rows.filter(
    (r) =>
      !q ||
      (r.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (r.name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        Users <span className="text-sm text-muted-foreground font-normal">({rows.length})</span>
      </h1>
      <Input
        placeholder="Search by email or name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={`border-t border-border ${r.banned ? "opacity-50" : ""}`}>
                <td className="p-3 font-medium">{r.name ?? "—"}</td>
                <td className="p-3">{r.email ?? "—"}</td>
                <td className="p-3">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      r.role === "owner"
                        ? "bg-primary text-primary-foreground"
                        : r.role === "admin"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.role}
                  </span>
                </td>
                <td className="p-3 capitalize">{r.plan_type}</td>
                <td className="p-3">
                  <span className={r.banned ? "text-destructive" : ""}>
                    {r.banned ? "Banned" : r.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  {isOwner && r.id !== user?.id && r.role !== "owner" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAdmin(r.id, r.role)}
                      >
                        {r.role === "admin" ? "− admin" : "+ admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => doTransfer(r.id, r.email)}
                      >
                        Transfer ownership
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => resetSub(r.id)}>
                    Reset sub
                  </Button>
                  <Button
                    size="sm"
                    variant={r.banned ? "outline" : "destructive"}
                    onClick={() => ban(r.id, r.banned)}
                  >
                    {r.banned ? "Unban" : "Ban"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isOwner && (
        <p className="text-xs text-muted-foreground">
          Role management (grant/revoke admin, transfer ownership) is restricted to the platform
          owner.
        </p>
      )}
    </div>
  );
}

