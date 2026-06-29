import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/exercises")({
  head: () => ({ meta: [{ title: "Exercises — Admin" }] }),
  component: ExAdmin,
});

type Ex = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  difficulty: string;
  enabled: boolean;
};
const empty = { name: "", muscle_group: "", equipment: "", difficulty: "beginner" };

function ExAdmin() {
  const [items, setItems] = useState<Ex[]>([]);
  const [f, setF] = useState(empty);
  async function load() {
    const { data } = await supabase.from("exercises").select("*").order("name");
    setItems((data ?? []) as Ex[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("exercises").insert({
      name: f.name,
      muscle_group: f.muscle_group,
      equipment: f.equipment || null,
      difficulty: f.difficulty as any,
    });
    if (error) toast.error(error.message);
    else {
      setF(empty);
      toast.success("Added");
      load();
    }
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("exercises").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="Exercises" />
      <form
        onSubmit={add}
        className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end"
      >
        <div>
          <label className="text-xs">Name</label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs">Muscle group</label>
          <Input
            value={f.muscle_group}
            onChange={(e) => setF({ ...f, muscle_group: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs">Equipment</label>
          <Input value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} />
        </div>
        <div>
          <label className="text-xs">Difficulty</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={f.difficulty}
            onChange={(e) => setF({ ...f, difficulty: e.target.value })}
          >
            {["beginner", "intermediate", "advanced"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Add</Button>
      </form>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Muscle</th>
              <th className="text-left p-3">Equipment</th>
              <th className="text-left p-3">Level</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className="border-t border-border">
                <td className="p-3 font-medium">{x.name}</td>
                <td className="p-3">{x.muscle_group}</td>
                <td className="p-3">{x.equipment ?? "—"}</td>
                <td className="p-3 capitalize">{x.difficulty}</td>
                <td className="p-3 text-right">
                  <button onClick={() => del(x.id)} className="text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
