import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";
import type { Rider } from "./StartlistTab";

type Classification = "stage" | "gc" | "kom" | "points" | "youth";

const CLASSIFICATION_LABELS: Record<Classification, { name: string; jersey: string; emoji: string }> = {
  stage: { name: "Etappe-uitslag", jersey: "Top 20 finish", emoji: "🏁" },
  gc: { name: "Algemeen klassement", jersey: "Roze trui (GC)", emoji: "🩷" },
  kom: { name: "Bergklassement", jersey: "Bergtrui (KOM)", emoji: "🔵" },
  points: { name: "Puntenklassement", jersey: "Puntentrui", emoji: "🟣" },
  youth: { name: "Jongerenklassement", jersey: "Witte trui", emoji: "⚪" },
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
  const [autoCalc, setAutoCalc] = useState(true);

  const riderById = useMemo(() => {
    const m = new Map<string, { name: string; team: string | null }>();
    for (const r of riders) m.set(r.id, { name: r.name, team: r.team });
    return m;
  }, [riders]);

  async function loadExisting() {
    if (!supabase || !selectedStage) {
      setRows(Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" })));
      return;
    }
    const { data } = await supabase
      .from("classification_results")
      .select("position, rider_id")
      .eq("stage_id", selectedStage)
      .eq("classification", classification)
      .order("position");

    const next = Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" }));
    for (const row of (data ?? []) as ResultRow[]) {
      if (row.position >= 1 && row.position <= 20) next[row.position - 1] = row;
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

    // Check duplicates
    const seen = new Set<string>();
    for (const r of filled) {
      if (seen.has(r.rider_id)) {
        toast.error(`Duplicaat: dezelfde renner staat 2x in dit klassement`);
        return;
      }
      seen.add(r.rider_id);
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("import_classification_results", {
        p_stage_id: selectedStage,
        p_kind: classification,
        p_results: filled,
      });
      if (error) throw error;

      toast.success(`${filled.length} resultaten opgeslagen voor ${CLASSIFICATION_LABELS[classification].name}`);

      if (autoCalc) {
        const { error: calcErr } = await supabase.rpc("calculate_stage_points_v3", { p_stage_id: selectedStage });
        if (calcErr) throw new Error(`Save OK, maar berekening faalde: ${calcErr.message}`);
        await supabase.rpc("update_total_ranking", { p_game_id: activeGameId });
        toast.success("Punten herberekend en klassement bijgewerkt");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function clearResults() {
    if (!confirm(`Weet je zeker dat je het ${CLASSIFICATION_LABELS[classification].name} voor deze etappe wilt wissen?`)) return;
    if (!supabase || !selectedStage) return;
    const { error } = await supabase
      .from("classification_results")
      .delete()
      .eq("stage_id", selectedStage)
      .eq("classification", classification);
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
                <p className="text-sm text-muted-foreground">{CLASSIFICATION_LABELS[classification].jersey} — top 20 invoeren</p>
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
                                  {rider.name}{rider.team ? ` — ${rider.team}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right">{r?.team ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} data-testid="auto-calc-checkbox" />
                Automatisch herberekenen na opslaan
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearResults} data-testid="clear-results-btn">
                  <RotateCcw className="w-4 h-4 mr-2" />Wissen
                </Button>
                <Button onClick={saveResults} disabled={saving} data-testid="save-results-btn">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
