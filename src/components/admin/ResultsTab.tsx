import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";
import type { Rider } from "./StartlistTab";

type Classification = "stage" | "gc" | "kom" | "points" | "youth";

const CLASSIFICATION_LABELS: Record<Classification, { name: string; jersey: string; emoji: string; column: string }> = {
  stage: { name: "Etappe-uitslag", jersey: "Top 20 finish", emoji: "🏁", column: "finish_position" },
  gc: { name: "Algemeen klassement", jersey: "Roze trui (GC)", emoji: "🩷", column: "gc_position" },
  kom: { name: "Bergklassement", jersey: "Bergtrui (KOM)", emoji: "🔵", column: "mountain_position" },
  points: { name: "Puntenklassement", jersey: "Puntentrui", emoji: "🟣", column: "points_position" },
  youth: { name: "Jongerenklassement", jersey: "Witte trui", emoji: "⚪", column: "youth_position" },
};

const CLASSIFICATIONS: Classification[] = ["stage", "gc", "kom", "points", "youth"];

type ResultRow = { position: number; rider_id: string };

export default function ResultsTab({
  activeGameId,
  stages,
  riders,
}: {
  activeGameId: string;
  stages: Stage[];
  riders: Rider[];
}) {
  const [selectedStage, setSelectedStage] = useState("");
  const [classification, setClassification] = useState<Classification>("stage");
  const [rows, setRows] = useState<ResultRow[]>(
    Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" }))
  );
  const [saving, setSaving] = useState(false);

  const riderById = useMemo(() => {
    const m = new Map<string, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  async function loadExisting() {
    if (!supabase || !selectedStage) {
      setRows(Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" })));
      return;
    }
    const col = CLASSIFICATION_LABELS[classification].column;
    const { data, error } = await supabase
      .from("stage_results")
      .select(`rider_id, ${col}`)
      .eq("stage_id", selectedStage)
      .not(col, "is", null)
      .order(col, { ascending: true });

    if (error) {
      console.error("Load results error:", error);
    }

    const next = Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" }));
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const pos = Number(r[col]);
      if (pos >= 1 && pos <= 20) next[pos - 1] = { position: pos, rider_id: String(r.rider_id) };
    }
    setRows(next);
  }

  useEffect(() => { loadExisting(); }, [selectedStage, classification]);

  function setRiderAtPosition(position: number, riderId: string) {
    setRows((prev) => prev.map((r) => (r.position === position ? { ...r, rider_id: riderId } : r)));
  }

  async function saveResults() {
    if (!supabase || !selectedStage) {
      toast.error("Selecteer een etappe");
      return;
    }
    const filled = rows.filter((r) => r.rider_id);
    if (filled.length === 0) {
      toast.error("Vul minstens 1 positie in");
      return;
    }

    const seen = new Set<string>();
    for (const r of filled) {
      if (seen.has(r.rider_id)) {
        toast.error("Dezelfde renner staat 2x in dit klassement");
        return;
      }
      seen.add(r.rider_id);
    }

    const col = CLASSIFICATION_LABELS[classification].column;

    setSaving(true);
    try {
      // Stap 1: zet huidig klassement column op NULL voor deze stage
      const { error: clearErr } = await supabase
        .from("stage_results")
        .update({ [col]: null })
        .eq("stage_id", selectedStage)
        .not(col, "is", null);
      if (clearErr) throw clearErr;

      // Stap 2: Upsert row per rider met juiste position-column gezet
      for (const r of filled) {
        const rider = riderById.get(r.rider_id);
        // Probeer eerst update bij bestaande row, anders insert
        const { data: existing } = await supabase
          .from("stage_results")
          .select("id")
          .eq("stage_id", selectedStage)
          .eq("rider_id", r.rider_id)
          .maybeSingle();

        if (existing) {
          const { error: uerr } = await supabase
            .from("stage_results")
            .update({ [col]: r.position })
            .eq("id", existing.id);
          if (uerr) throw uerr;
        } else {
          const payload: Record<string, unknown> = {
            stage_id: selectedStage,
            rider_id: r.rider_id,
            game_id: activeGameId,
            [col]: r.position,
          };
          if (rider?.start_number != null) payload.start_number = rider.start_number;
          if (rider?.name) payload.rider_name = rider.name;
          if (classification === "stage") payload.did_finish = true;
          const { error: ierr } = await supabase.from("stage_results").insert(payload);
          if (ierr) throw ierr;
        }
      }

      toast.success(`${filled.length} resultaten opgeslagen voor ${CLASSIFICATION_LABELS[classification].name}`);
    } catch (e) {
      console.error("Save error:", e);
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function clearResults() {
    if (!confirm(`Weet je zeker dat je het ${CLASSIFICATION_LABELS[classification].name} voor deze etappe wilt wissen?`)) return;
    if (!supabase || !selectedStage) return;
    const col = CLASSIFICATION_LABELS[classification].column;
    const { error } = await supabase
      .from("stage_results")
      .update({ [col]: null })
      .eq("stage_id", selectedStage)
      .not(col, "is", null);
    if (error) {
      toast.error(`Wissen mislukt: ${error.message}`);
      return;
    }
    toast.success("Wissen voltooid");
    await loadExisting();
  }

  const filledCount = rows.filter((r) => r.rider_id).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Selecteer etappe & klassement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Etappe</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger data-testid="results-stage-select"><SelectValue placeholder="Kies etappe" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Etappe {s.stage_number}{s.date ? ` (${s.date})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Klassement</Label>
            <Tabs value={classification} onValueChange={(v) => setClassification(v as Classification)}>
              <TabsList className="grid grid-cols-5 w-full">
                {CLASSIFICATIONS.map((c) => (
                  <TabsTrigger key={c} value={c} data-testid={`classification-${c}`} className="text-xs">
                    {CLASSIFICATION_LABELS[c].emoji} {c.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {selectedStage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <span className="text-2xl">{CLASSIFICATION_LABELS[classification].emoji}</span>
                  {CLASSIFICATION_LABELS[classification].name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{CLASSIFICATION_LABELS[classification].jersey} — top 20</p>
              </div>
              <Badge variant="outline" data-testid="filled-count">{filledCount} / 20 ingevuld</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Pos</TableHead>
                    <TableHead>Renner</TableHead>
                    <TableHead className="w-32 text-right">Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const r = row.rider_id ? riderById.get(row.rider_id) : null;
                    return (
                      <TableRow key={row.position}>
                        <TableCell className="font-bold">{row.position}</TableCell>
                        <TableCell>
                          <Select
                            value={row.rider_id}
                            onValueChange={(v) => setRiderAtPosition(row.position, v)}
                          >
                            <SelectTrigger data-testid={`result-pos-${row.position}`} className="h-8"><SelectValue placeholder="(leeg)" /></SelectTrigger>
                            <SelectContent className="max-h-80">
                              {riders.map((rider) => (
                                <SelectItem key={rider.id} value={rider.id}>
                                  {rider.start_number ? `#${rider.start_number} ` : ""}{rider.name}{rider.team_name ? ` — ${rider.team_name}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right">{r?.team_name ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end flex-wrap gap-3">
              <Button variant="outline" onClick={clearResults} data-testid="clear-results-btn">
                <RotateCcw className="w-4 h-4 mr-2" />Wissen
              </Button>
              <Button onClick={saveResults} disabled={saving} data-testid="save-results-btn">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
