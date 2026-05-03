// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";
import type { Rider } from "./StartlistTab";
import RiderSearchSelect, { type RiderOption } from "@/components/RiderSearchSelect";

type GameType = "giro" | "tdf" | "vuelta" | null;

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
  gameType,
  gameYear,
}: {
  activeGameId: string;
  stages: Stage[];
  riders: Rider[];
  gameType?: GameType;
  gameYear?: number | null;
}) {
  const [selectedStage, setSelectedStage] = useState("");
  const [classification, setClassification] = useState<Classification>("stage");
  const [rows, setRows] = useState<ResultRow[]>(
    Array.from({ length: 20 }, (_, i) => ({ position: i + 1, rider_id: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingCF, setImportingCF] = useState(false);
  const [importPreview, setImportPreview] = useState<null | {
    source_url: string;
    matched: Record<Classification, Array<{ position: number; rider_id: string; rider_name: string; start_number: number }>>;
    unmatched: Record<Classification, Array<{ position: number; bib: number | null; name: string }>>;
  }>(null);
  const [savingImport, setSavingImport] = useState(false);

  const selectedStageObj = useMemo(() => stages.find((s) => s.id === selectedStage), [stages, selectedStage]);
  const canImport = gameType === "tdf" || gameType === "vuelta";
  const canImportCF = !!gameType && !!gameYear;

  const riderById = useMemo(() => {
    const m = new Map<string, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  const riderOptions = useMemo<RiderOption[]>(
    () =>
      riders.map((r) => ({
        id: r.id,
        name: r.name,
        start_number: r.start_number ?? null,
        teamName: r.team_name ?? undefined,
      })),
    [riders]
  );

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
    for (const r of (data ?? []) as unknown as Array<Record<string, unknown>>) {
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

  async function startImport() {
    if (!supabase || !selectedStage || !selectedStageObj) {
      toast.error("Selecteer eerst een etappe");
      return;
    }
    if (!canImport) {
      toast.error("Importeren is alleen beschikbaar voor Tour de France en Vuelta");
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-stage-results", {
        body: {
          race_type: gameType,
          stage_number: selectedStageObj.stage_number,
          game_id: activeGameId,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Onbekende fout");
      setImportPreview({
        source_url: data.source_url,
        matched: data.matched,
        unmatched: data.unmatched,
      });
    } catch (e) {
      console.error("Import error:", e);
      toast.error(`Importeren mislukt: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  async function applyImport() {
    if (!supabase || !selectedStage || !importPreview) return;
    setSavingImport(true);
    try {
      const classifs: Classification[] = ["stage", "gc", "kom", "points", "youth"];
      // Map import key (mountain) → our key (kom)
      const importKeyMap: Record<Classification, string> = {
        stage: "stage", gc: "gc", kom: "mountain", points: "points", youth: "youth",
      };
      let totalSaved = 0;
      for (const c of classifs) {
        const list = importPreview.matched[importKeyMap[c] as keyof typeof importPreview.matched];
        if (!list || list.length === 0) continue;
        const col = CLASSIFICATION_LABELS[c].column;
        // 1. Clear column for this stage
        const { error: clearErr } = await supabase
          .from("stage_results")
          .update({ [col]: null })
          .eq("stage_id", selectedStage)
          .not(col, "is", null);
        if (clearErr) throw clearErr;
        // 2. Upsert per rider
        for (const r of list) {
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
              start_number: r.start_number,
              rider_name: r.rider_name,
              [col]: r.position,
            };
            if (c === "stage") payload.did_finish = true;
            const { error: ierr } = await supabase.from("stage_results").insert(payload);
            if (ierr) throw ierr;
          }
          totalSaved++;
        }
      }
      toast.success(`${totalSaved} resultaten geïmporteerd uit ${importPreview.source_url}`);
      setImportPreview(null);
      await loadExisting();
    } catch (e) {
      console.error("Apply import error:", e);
      toast.error(`Opslaan mislukt: ${(e as Error).message}`);
    } finally {
      setSavingImport(false);
    }
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
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Download className="w-5 h-5" /> Importeer uitslag van internet
                </h3>
                <p className="text-sm text-muted-foreground">
                  {canImport
                    ? `Haalt etappe + GC + Punten + Bergen + Jongeren in één keer op van ${gameType === "tdf" ? "letour.fr" : "lavuelta.es"}. Matcht op rugnummer.`
                    : gameType === "giro"
                      ? "Giro is niet automatisch importeerbaar (giroditalia.it laadt data via JavaScript). Vul handmatig in."
                      : "Selecteer eerst een race."}
                </p>
              </div>
              <Button onClick={startImport} disabled={!canImport || importing} data-testid="import-btn">
                <Download className="w-4 h-4 mr-2" />
                {importing ? "Ophalen..." : `Importeer etappe ${selectedStageObj?.stage_number ?? ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    const excludeIds = rows
                      .filter((x) => x.position !== row.position && x.rider_id)
                      .map((x) => x.rider_id);
                    return (
                      <TableRow key={row.position}>
                        <TableCell className="font-bold">{row.position}</TableCell>
                        <TableCell data-testid={`result-pos-${row.position}`}>
                          <RiderSearchSelect
                            riders={riderOptions}
                            value={row.rider_id}
                            onChange={(v) => setRiderAtPosition(row.position, v)}
                            excludeIds={excludeIds}
                            placeholder="Zoek renner op naam, rugnummer of ploeg..."
                          />
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

      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Download className="w-5 h-5" /> Import voorbeeld
            </DialogTitle>
            <DialogDescription>
              Bron: <a href={importPreview?.source_url} target="_blank" rel="noreferrer" className="underline">{importPreview?.source_url}</a>
              <br />Controleer de gevonden resultaten en bevestig om op te slaan. Bestaande klassementen voor deze etappe worden overschreven.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              {(["stage", "gc", "points", "mountain", "youth"] as const).map((c) => {
                const labelKey = c === "mountain" ? "kom" : c;
                const label = CLASSIFICATION_LABELS[labelKey as Classification];
                const matched = importPreview.matched[c] ?? [];
                const unmatched = importPreview.unmatched[c] ?? [];
                return (
                  <div key={c} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-xl">{label.emoji}</span> {label.name}
                      </h4>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {matched.length} gematcht
                        </Badge>
                        {unmatched.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {unmatched.length} niet gevonden
                          </Badge>
                        )}
                      </div>
                    </div>
                    {matched.length > 0 && (
                      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                        {matched.slice(0, 8).map((r) => (
                          <span key={r.position}>{r.position}. #{r.start_number} {r.rider_name}</span>
                        ))}
                        {matched.length > 8 && <span className="italic">+{matched.length - 8} meer…</span>}
                      </div>
                    )}
                    {unmatched.length > 0 && (
                      <div className="mt-2 text-xs text-destructive">
                        <strong>Niet gematcht:</strong>{" "}
                        {unmatched.map((r) => `${r.position}. ${r.bib != null ? `#${r.bib} ` : ""}${r.name}`).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)}>Annuleren</Button>
            <Button onClick={applyImport} disabled={savingImport} data-testid="apply-import-btn">
              <Save className="w-4 h-4 mr-2" />
              {savingImport ? "Opslaan..." : "Bevestig en sla op"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
