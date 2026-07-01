import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/MediaPicker";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";

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
  instructions: string[];
  common_mistakes: string[];
  breathing_tip: string | null;
  safety_tip: string | null;
  image_url: string | null;
};

const empty = {
  name: "",
  muscle_group: "",
  equipment: "",
  difficulty: "beginner",
  instructions: "",
  common_mistakes: "",
  breathing_tip: "",
  safety_tip: "",
  image_url: "",
};

// One instruction/mistake per line in the textarea <-> text[] in the DB.
const toLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const fromLines = (arr: string[]) => arr.join("\n");

function ExAdmin() {
  const [items, setItems] = useState<Ex[]>([]);
  const [f, setF] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("exercises").select("*").order("name");
    setItems((data ?? []) as unknown as Ex[]);
  }
  useEffect(() => {
    load();
  }, []);

  function edit(x: Ex) {
    setEditingId(x.id);
    setF({
      name: x.name,
      muscle_group: x.muscle_group,
      equipment: x.equipment ?? "",
      difficulty: x.difficulty,
      instructions: fromLines(x.instructions ?? []),
      common_mistakes: fromLines(x.common_mistakes ?? []),
      breathing_tip: x.breathing_tip ?? "",
      safety_tip: x.safety_tip ?? "",
      image_url: x.image_url ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setF(empty);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: f.name,
      muscle_group: f.muscle_group,
      equipment: f.equipment || null,
      difficulty: f.difficulty as any,
      instructions: toLines(f.instructions),
      common_mistakes: toLines(f.common_mistakes),
      breathing_tip: f.breathing_tip.trim() || null,
      safety_tip: f.safety_tip.trim() || null,
      image_url: f.image_url.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("exercises").update(payload).eq("id", editingId)
      : await supabase.from("exercises").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Updated" : "Added");
    reset();
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("exercises").delete().eq("id", id);
    if (editingId === id) reset();
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminHeader title="Exercises" />

      <form onSubmit={save} className="surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editingId ? "Edit exercise" : "New exercise"}</h2>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Muscle group</Label>
            <Input
              value={f.muscle_group}
              onChange={(e) => setF({ ...f, muscle_group: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Equipment</Label>
            <Input
              value={f.equipment}
              onChange={(e) => setF({ ...f, equipment: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label>Step-by-step instructions (one per line)</Label>
          <Textarea
            rows={4}
            value={f.instructions}
            onChange={(e) => setF({ ...f, instructions: e.target.value })}
            placeholder="Set up in position...&#10;Perform the movement...&#10;Return to start..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Common mistakes (one per line)</Label>
          <Textarea
            rows={3}
            value={f.common_mistakes}
            onChange={(e) => setF({ ...f, common_mistakes: e.target.value })}
            placeholder="Rounding the back...&#10;Using momentum..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Breathing tip</Label>
            <Input
              value={f.breathing_tip}
              onChange={(e) => setF({ ...f, breathing_tip: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Safety tip</Label>
            <Input
              value={f.safety_tip}
              onChange={(e) => setF({ ...f, safety_tip: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Demonstration image</Label>
          <MediaPicker
            value={f.image_url}
            onChange={(url) => setF({ ...f, image_url: url })}
            label="Demonstration image"
          />
        </div>

        <Button type="submit">{editingId ? "Update exercise" : "Add exercise"}</Button>
      </form>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Muscle</th>
              <th className="text-left p-3">Equipment</th>
              <th className="text-left p-3">Level</th>
              <th className="text-left p-3">Content</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{x.name}</td>
                <td className="p-3">{x.muscle_group}</td>
                <td className="p-3">{x.equipment ?? "—"}</td>
                <td className="p-3 capitalize">{x.difficulty}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {(x.instructions?.length ?? 0) > 0
                    ? `${x.instructions.length} steps`
                    : "No content"}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => edit(x)}
                    className="text-muted-foreground hover:text-foreground mr-3"
                    aria-label={`Edit ${x.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => del(x.id)}
                    className="text-destructive"
                    aria-label={`Delete ${x.name}`}
                  >
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
