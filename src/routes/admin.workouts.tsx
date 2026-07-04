import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/workouts")({
  head: () => ({ meta: [{ title: "Workout templates — Admin" }] }),
  component: WtAdmin,
});

type Wt = {
  id: string;
  name: string;
  goal: string;
  level: string;
  schedule: unknown;
  enabled: boolean;
};

function WtAdmin() {
  const [items, setItems] = useState<Wt[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newTpl, setNewTpl] = useState({ name: "", goal: "lose_fat", level: "beginner" });

  async function load() {
    const { data } = await supabase.from("workout_templates").select("*").order("name");
    setItems((data ?? []) as Wt[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("workout_templates").insert({
      name: newTpl.name,
      goal: newTpl.goal as any,
      level: newTpl.level as any,
      schedule: [],
    });
    if (error) toast.error(error.message);
    else {
      setNewTpl({ name: "", goal: "lose_fat", level: "beginner" });
      load();
    }
  }
  async function save(id: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    const { error } = await supabase
      .from("workout_templates")
      .update({ schedule: parsed as any })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setEditing(null);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="Workout templates" />

      <form
        onSubmit={create}
        className="surface-card p-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-end"
      >
        <div>
          <label className="text-xs">Name</label>
          <Input
            required
            value={newTpl.name}
            onChange={(e) => setNewTpl({ ...newTpl, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs">Goal</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={newTpl.goal}
            onChange={(e) => setNewTpl({ ...newTpl, goal: e.target.value })}
          >
            {["lose_fat", "build_muscle", "maintain"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs">Level</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={newTpl.level}
            onChange={(e) => setNewTpl({ ...newTpl, level: e.target.value })}
          >
            {["beginner", "intermediate", "advanced"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Create</Button>
      </form>

      <div className="space-y-3">
        {items.map((x) => (
          <div key={x.id} className="surface-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{x.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {x.goal.replace("_", " ")} · {x.level}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(x.id);
                    setDraft(JSON.stringify(x.schedule, null, 2));
                  }}
                >
                  Edit JSON
                </Button>
                <button onClick={() => del(x.id)} className="text-destructive p-2">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {editing === x.id && (
              <div className="mt-3">
                <textarea
                  className="w-full h-64 font-mono text-xs p-3 rounded-lg border border-input bg-background"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => save(x.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
