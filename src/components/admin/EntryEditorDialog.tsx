import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

type Rider = { id: string; name: string };
type Category = { id: string; name: string; max_picks: number };

const CLASS_LABELS: Record<string, string> = {
  gc: "GC podium",
  points: "Puntentrui",
  kom: "Bergtrui",
  youth: "Jongerentrui",
};

export default function EntryEditorDialog({
  entryId, gameId, open, onOpenChange, onSaved,
}: {
  entryId: string | null;
  gameId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [picks, setPicks] = useState<Record<string, string[]>>({}); // category_id -> rider ids
  const [jokers, setJokers] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<{ classification: string; position: number; rider_id: string }[]>([]);
  const [status, setStatus] = useState<string>("draft");

  useEffect(() => {
    if (!entryId || !open || !supabase) return;
    (async () => {
      setLoading(true);
      const [cats, ridersRes, entryRes, picksRes, jokersRes, predsRes] = await Promise.all([
        supabase.from("categories").select("id,name,max_picks").eq("game_id", gameId).order("sort_order"),
        supabase.from("riders").select("id,name,team_id, teams!inner(game_id)").eq("teams.game_id", gameId).order("name"),
        supabase.from("entries").select("status").eq("id", entryId).single(),
        supabase.from("entry_picks").select("category_id,rider_id").eq("entry_id", entryId),
        supabase.from("entry_jokers").select("rider_id").eq("entry_id", entryId),
        supabase.from("entry_predictions").select("classification,position,rider_id").eq("entry_id", entryId),
      ]);
      setCategories((cats.data ?? []) as Category[]);
      setRiders(((ridersRes.data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name })));
      setStatus(entryRes.data?.status ?? "draft");
      const grouped: Record<string, string[]> = {};
      (picksRes.data ?? []).forEach((p: any) => {
        grouped[p.category_id] = [...(grouped[p.category_id] ?? []), p.rider_id];
      });
      setPicks(grouped);
      setJokers((jokersRes.data ?? []).map((j: any) => j.rider_id));
      setPredictions((predsRes.data ?? []) as any);
      setLoading(false);
    })();
  }, [entryId, open, gameId]);

  function setPickAt(catId: string, idx: number, riderId: string) {
    setPicks((p) => {
      const arr = [...(p[catId] ?? [])];
      arr[idx] = riderId;
      return { ...p, [catId]: arr };
    });
  }

  function setJokerAt(idx: number, riderId: string) {
    setJokers((j) => {
      const arr = [...j];
      arr[idx] = riderId;
      return arr;
    });
  }

  function setPredictionAt(classification: string, position: number, riderId: string) {
    setPredictions((preds) => {
      const without = preds.filter((p) => !(p.classification === classification && p.position === position));
      return [...without, { classification, position, rider_id: riderId }];
    });
  }

  function getPrediction(classification: string, position: number) {
    return predictions.find((p) => p.classification === classification && p.position === position)?.rider_id ?? "";
  }

  async function save() {
    if (!entryId || !supabase) return;
    setSaving(true);
    try {
      // Status update
      await supabase.rpc("admin_update_entry_status", { p_entry_id: entryId, p_status: status });

      // Picks: replace per category — easiest is to delete existing picks then re-insert via save_entry_pick (single) or toggle.
      // Use direct delete + insert (admin RLS allows it via entry_picks_modify which bypasses for admin).
      await supabase.from("entry_picks").delete().eq("entry_id", entryId);
      const newPicks: { entry_id: string; category_id: string; rider_id: string }[] = [];
      for (const [catId, ids] of Object.entries(picks)) {
        for (const rid of ids) if (rid) newPicks.push({ entry_id: entryId, category_id: catId, rider_id: rid });
      }
      if (newPicks.length > 0) {
        const { error } = await supabase.from("entry_picks").insert(newPicks);
        if (error) throw error;
      }

      // Jokers via RPC (validates uniqueness etc.)
      const validJokers = jokers.filter(Boolean);
      const { error: jErr } = await supabase.rpc("save_entry_jokers", { p_entry_id: entryId, p_rider_ids: validJokers });
      if (jErr) throw jErr;

      // Predictions via RPC
      const validPreds = predictions.filter((p) => p.rider_id);
      const { error: pErr } = await supabase.rpc("save_entry_predictions", {
        p_entry_id: entryId,
        p_predictions: validPreds,
      });
      if (pErr) throw pErr;

      toast.success("Inzending opgeslagen");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Opslaan mislukt: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry() {
    if (!entryId || !supabase) return;
    if (!confirm("Inzending definitief verwijderen?")) return;
    const { error } = await supabase.rpc("admin_delete_entry", { p_entry_id: entryId });
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Inzending verwijderd");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inzending bekijken & wijzigen</DialogTitle>
          <DialogDescription>Als admin kun je picks, jokers, voorspellingen en status aanpassen.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Status:</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <section>
              <h3 className="font-display text-lg mb-2">Categorieën</h3>
              <div className="space-y-3">
                {categories.map((c) => (
                  <div key={c.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline">{c.max_picks} pick{c.max_picks > 1 ? "s" : ""}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {Array.from({ length: c.max_picks }).map((_, idx) => (
                        <RiderSelect
                          key={idx}
                          value={picks[c.id]?.[idx] ?? ""}
                          riders={riders}
                          onChange={(v) => setPickAt(c.id, idx, v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-display text-lg mb-2">Jokers (max 2)</h3>
              <div className="grid gap-2">
                {[0, 1].map((idx) => (
                  <RiderSelect
                    key={idx}
                    value={jokers[idx] ?? ""}
                    riders={riders}
                    onChange={(v) => setJokerAt(idx, v)}
                  />
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-display text-lg mb-2">Voorspellingen</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">{CLASS_LABELS.gc}</p>
                  <div className="grid gap-2">
                    {[1, 2, 3].map((pos) => (
                      <div key={pos} className="flex items-center gap-2">
                        <span className="text-xs w-8">#{pos}</span>
                        <RiderSelect
                          value={getPrediction("gc", pos)}
                          riders={riders}
                          onChange={(v) => setPredictionAt("gc", pos, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {(["points", "kom", "youth"] as const).map((cls) => (
                  <div key={cls}>
                    <p className="text-sm font-medium mb-1">{CLASS_LABELS[cls]}</p>
                    <RiderSelect
                      value={getPrediction(cls, 1)}
                      riders={riders}
                      onChange={(v) => setPredictionAt(cls, 1, v)}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" onClick={deleteEntry} disabled={saving || loading}>
            <Trash2 className="w-4 h-4 mr-1" />Verwijder inzending
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Opslaan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RiderSelect({ value, onChange, riders }: { value: string; onChange: (v: string) => void; riders: Rider[] }) {
  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder="Kies renner..." /></SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="__none__">— leeg —</SelectItem>
        {riders.map((r) => (
          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
