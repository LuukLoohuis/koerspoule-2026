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
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle2, ImageUp, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";
import type { Rider } from "./StartlistTab";
import RiderSearchSelect, { type RiderOption } from "@/components/RiderSearchSelect";
import StageApprovalCard from "./StageApprovalCard";
import {
  buildScreenshotImportPreview,
  type ImportClassification,
  type ScreenshotExtraction,
} from "@/lib/screenshotResultImport";

type GameType = "giro" | "tdf" | "vuelta" | "femmes" | null;

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

type ImportPreview = {
  source_url: string;
  source_label?: string;
  source_kind?: "url" | "screenshot";
  source_title?: string;
  detected_classification?: string;
  detected_stage_number?: number | null;
  matched: Record<string, Array<{
    position: number;
    rider_id: string;
    rider_name: string;
    start_number: number | null;
    confidence?: number;
  }>>;
  unmatched: Record<string, Array<{
    position: number;
    bib: number | null;
    name: string;
    confidence?: number;
  }>>;
  diagnostics?: Record<string, { status: number; bytes: number; rows: number; attempts: number }>;
  counts?: Record<string, { matched: number; unmatched: number; total: number }>;
  warnings?: string[];
  blocking_warnings?: string[];
};

async function functionErrorMessage(error: unknown): Promise<string> {
  const edgeError = error as { message?: string; context?: Response };
  let detail = edgeError?.message || "Onbekende fout";
  const ctx = edgeError?.context;
  if (!ctx || typeof ctx.text !== "function") return detail;

  try {
    const body = await ctx.text();
    const parsed = JSON.parse(body) as {
      error?: string;
      diagnostics?: Record<string, { status?: number; rows?: number; attempts?: number }>;
    };
    detail = parsed.error || body || detail;
    if (parsed.diagnostics) {
      const sourceState = Object.entries(parsed.diagnostics)
        .map(([key, d]) =>
          `${key}: HTTP ${d.status ?? 0}, ${d.rows ?? 0} rijen` +
          ((d.attempts ?? 0) > 1 ? `, ${d.attempts} pogingen` : "")
        )
        .join(" · ");
      if (sourceState) detail += ` — ${sourceState}`;
    }
  } catch {
    // De standaardmelding van supabase-js blijft bruikbaar.
  }
  return detail;
}

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
  const [importingPCS, setImportingPCS] = useState(false);
  const [importingScreenshot, setImportingScreenshot] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<{ url: string; name: string } | null>(null);
  // Manual overrides for unmatched rows: key = `${importKey}-${position}` -> rider_id
  const [manualPicks, setManualPicks] = useState<Record<string, string>>({});
  const [savingImport, setSavingImport] = useState(false);

  useEffect(() => {
    return () => {
      if (screenshotPreview?.url) URL.revokeObjectURL(screenshotPreview.url);
    };
  }, [screenshotPreview?.url]);

  const selectedStageObj = useMemo(() => stages.find((s) => s.id === selectedStage), [stages, selectedStage]);
  const canImport = gameType === "tdf" || gameType === "femmes" || gameType === "vuelta";
  const canImportPCS = !!gameType && !!gameYear;

  function closeImportPreview() {
    setImportPreview(null);
    setScreenshotPreview(null);
  }

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
      toast.error("Importeren is alleen beschikbaar voor Tour de France, Tour de France Femmes en Vuelta");
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
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      if (!data?.success) throw new Error(data?.error || "Onbekende fout");
      setImportPreview({
        source_url: data.source_url,
        source_kind: "url",
        matched: data.matched,
        unmatched: data.unmatched,
        diagnostics: data.diagnostics,
        counts: data.counts,
        warnings: data.warnings,
      });
    } catch (e) {
      console.error("Import error:", e);
      toast.error(`Importeren mislukt: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  async function startImportPCS() {
    if (!supabase || !selectedStage || !selectedStageObj) {
      toast.error("Selecteer eerst een etappe");
      return;
    }
    if (!canImportPCS) {
      toast.error("Race-type of jaar ontbreekt");
      return;
    }
    setImportingPCS(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-procyclingstats", {
        body: {
          race_type: gameType,
          stage_number: selectedStageObj.stage_number,
          game_id: activeGameId,
          year: gameYear,
        },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      if (!data?.success) throw new Error(data?.error || "Onbekende fout");
      setManualPicks({});
      setImportPreview({
        source_url: data.source_url,
        source_kind: "url",
        matched: data.matched,
        unmatched: data.unmatched,
        diagnostics: data.diagnostics,
        counts: data.counts,
        warnings: data.warnings,
      });
    } catch (e) {
      console.error("ProCyclingStats import error:", e);
      toast.error(`Importeren mislukt: ${(e as Error).message}`);
    } finally {
      setImportingPCS(false);
    }
  }

  async function startImportScreenshot(file: File) {
    if (!supabase || !selectedStageObj) {
      toast.error("Selecteer eerst een etappe");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Gebruik een PNG-, JPG- of WebP-screenshot");
      return;
    }
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      toast.error("Screenshot mag maximaal 8 MB zijn");
      return;
    }

    const importClassification: ImportClassification = classification === "kom" ? "mountain" : classification;
    const form = new FormData();
    form.append("file", file);
    form.append("expected_classification", importClassification);
    form.append("expected_stage_number", String(selectedStageObj.stage_number));

    setImportingScreenshot(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-results-screenshot", { body: form });
      if (error) throw new Error(await functionErrorMessage(error));
      if (!data?.success || !data?.extraction) throw new Error(data?.error || "Geen uitslag herkend");

      const preview = buildScreenshotImportPreview({
        extraction: data.extraction as ScreenshotExtraction,
        riders,
        expectedClassification: importClassification,
        expectedStageNumber: selectedStageObj.stage_number,
        filename: file.name,
      });
      setManualPicks({});
      setScreenshotPreview({ url: URL.createObjectURL(file), name: file.name });
      setImportPreview(preview);
    } catch (e) {
      console.error("Screenshot import error:", e);
      toast.error(`Screenshot uitlezen mislukt: ${(e as Error).message}`);
    } finally {
      setImportingScreenshot(false);
    }
  }

  async function applyImport() {
    if (!supabase || !selectedStage || !importPreview) return;

    if (importPreview.blocking_warnings?.length) {
      toast.error(importPreview.blocking_warnings[0]);
      return;
    }

    if (importPreview.source_kind === "screenshot" && importPreview.detected_classification) {
      const key = importPreview.detected_classification;
      const count = importPreview.counts?.[key];
      if (!count || count.total < 10) {
        toast.error("De screenshot bevat te weinig herkenbare rijen om veilig op te slaan.");
        return;
      }
      const unresolved = (importPreview.unmatched[key] ?? []).filter(
        (row) => !manualPicks[`${key}-${row.position}`],
      );
      if (unresolved.length > 0) {
        toast.error(`Koppel eerst de ${unresolved.length} rode regel(s) handmatig.`);
        return;
      }
    }

    // Een onvolledige stage/GC mag nooit stil de bestaande top-20 vervangen.
    // Handmatige koppelingen tellen mee als opgelost.
    for (const key of ["stage", "gc"] as const) {
      const count = importPreview.counts?.[key];
      if (!count || count.total < 10) continue;
      const manualCount = (importPreview.unmatched[key] ?? []).filter(
        (u) => manualPicks[`${key}-${u.position}`],
      ).length;
      const resolved = (importPreview.matched[key] ?? []).length + manualCount;
      if (resolved / count.total < 0.8) {
        toast.error(
          `${key === "stage" ? "Etappe" : "GC"} is nog niet betrouwbaar: ` +
          `${resolved} van ${count.total} renners gekoppeld. Los eerst de rode regels op.`,
        );
        return;
      }
    }

    if (
      importPreview.warnings?.length &&
      !confirm(
        `De import bevat ${importPreview.warnings.length} waarschuwing(en):\n\n` +
        `${importPreview.warnings.join("\n")}\n\nToch als concept opslaan?`,
      )
    ) return;

    setSavingImport(true);
    try {
      const classifs: Classification[] = ["stage", "gc", "kom", "points", "youth"];
      // Map import key (mountain) → our key (kom)
      const importKeyMap: Record<Classification, string> = {
        stage: "stage", gc: "gc", kom: "mountain", points: "points", youth: "youth",
      };
      let totalSaved = 0;
      for (const c of classifs) {
        const importKey = importKeyMap[c];
        const matchedList = importPreview.matched[importKey] ?? [];
        const unmatchedList = importPreview.unmatched[importKey] ?? [];
        // Merge in manual picks for unmatched rows
        const merged: Array<{ position: number; rider_id: string; rider_name: string; start_number: number | null }> = [...matchedList];
        for (const u of unmatchedList) {
          const pick = manualPicks[`${importKey}-${u.position}`];
          if (pick) {
            const r = riderById.get(pick);
            merged.push({
              position: u.position,
              rider_id: pick,
              rider_name: r?.name ?? u.name,
              start_number: r?.start_number ?? null,
            });
          }
        }
        if (merged.length === 0) continue;
        // Dedupe (keep first per rider, first per position)
        const seenRider = new Set<string>();
        const seenPos = new Set<number>();
        const final = merged.filter((r) => {
          if (seenRider.has(r.rider_id) || seenPos.has(r.position)) return false;
          seenRider.add(r.rider_id); seenPos.add(r.position); return true;
        });

        const col = CLASSIFICATION_LABELS[c].column;
        const { error: clearErr } = await supabase
          .from("stage_results")
          .update({ [col]: null })
          .eq("stage_id", selectedStage)
          .not(col, "is", null);
        if (clearErr) throw clearErr;
        for (const r of final) {
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
              rider_name: r.rider_name,
              [col]: r.position,
            };
            if (r.start_number != null) payload.start_number = r.start_number;
            if (c === "stage") payload.did_finish = true;
            const { error: ierr } = await supabase.from("stage_results").insert(payload);
            if (ierr) throw ierr;
          }
          totalSaved++;
        }
      }
      toast.success(`${totalSaved} resultaten geïmporteerd uit ${importPreview.source_label ?? importPreview.source_url}`);
      closeImportPreview();
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
        <StageApprovalCard stageId={selectedStage} onChanged={loadExisting} />
      )}

      {selectedStage && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Download className="w-5 h-5" /> Importeer uitslag van internet
                </h3>
                <p className="text-sm text-muted-foreground">
                  {canImport
                    ? `Officiële bron: ${
                        gameType === "femmes"
                          ? "letourfemmes.fr"
                          : gameType === "tdf"
                            ? "letour.fr"
                            : "lavuelta.es"
                      } — etappe + cumulatieve GC, Punten, Bergen en Jongeren; matcht op rugnummer.`
                    : gameType === "giro"
                      ? "Officiële Giro-site werkt niet automatisch — gebruik ProCyclingStats hieronder of vul handmatig in."
                      : "Selecteer eerst een race."}
                </p>
              </div>
              <Button onClick={startImport} disabled={!canImport || importing} data-testid="import-btn">
                <Download className="w-4 h-4 mr-2" />
                {importing ? "Ophalen..." : `Officiële site (etappe ${selectedStageObj?.stage_number ?? ""})`}
              </Button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-primary/20">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  ⚡ Auto-import (ProCyclingStats)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gratis scrape van procyclingstats.com — werkt voor Giro, Tour & Vuelta. Matcht renners op rugnummer (met naam-fallback).</p>
              </div>
              <Button
                variant="secondary"
                onClick={startImportPCS}
                disabled={!canImportPCS || importingPCS}
                data-testid="import-cf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                {importingPCS ? "Ophalen..." : `ProCyclingStats (etappe ${selectedStageObj?.stage_number ?? ""})`}
              </Button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-primary/20">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  <ImageUp className="w-5 h-5" /> Screenshot import (AI)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload een uitslag van PCS of een officiële site. De afbeelding wordt voor uitlezing naar OpenAI verzonden,
                  niet door Koerspoule opgeslagen en altijd eerst als controlevoorbeeld getoond.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className={importingScreenshot ? "pointer-events-none opacity-60" : "cursor-pointer"}
                data-testid="import-screenshot-btn"
              >
                <label>
                  {importingScreenshot ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageUp className="w-4 h-4 mr-2" />}
                  {importingScreenshot ? "Uitlezen..." : "Upload screenshot"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={importingScreenshot}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void startImportScreenshot(file);
                    }}
                  />
                </label>
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

      <Dialog open={!!importPreview} onOpenChange={(open) => !open && closeImportPreview()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Download className="w-5 h-5" /> Import voorbeeld
            </DialogTitle>
            <DialogDescription>
              Bron:{" "}
              {importPreview?.source_kind === "screenshot" ? (
                <span className="font-medium text-foreground">{importPreview.source_label}</span>
              ) : (
                <a href={importPreview?.source_url} target="_blank" rel="noreferrer" className="underline">{importPreview?.source_url}</a>
              )}
              <br />Controleer de gevonden resultaten en bevestig om op te slaan. Bestaande klassementen voor deze etappe worden overschreven.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              {importPreview.source_kind === "screenshot" && screenshotPreview && (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[180px_1fr]">
                  <img
                    src={screenshotPreview.url}
                    alt={`Geüploade uitslag ${screenshotPreview.name}`}
                    className="max-h-52 w-full rounded border bg-white object-contain"
                  />
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{importPreview.source_title || "Uitslag uit screenshot"}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">AI-uitlezing</Badge>
                      {importPreview.detected_classification && (
                        <Badge variant="secondary">{importPreview.detected_classification.toUpperCase()}</Badge>
                      )}
                      {importPreview.detected_stage_number != null && (
                        <Badge variant="secondary">Etappe {importPreview.detected_stage_number}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      De afbeelding is naar OpenAI verzonden voor uitlezing. Koerspoule bewaart het bestand niet in Supabase Storage.
                    </p>
                  </div>
                </div>
              )}

              {importPreview.blocking_warnings && importPreview.blocking_warnings.length > 0 && (
                <div className="rounded-md border border-destructive/60 bg-destructive/10 p-3">
                  <div className="font-medium text-destructive flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Deze import kan niet worden opgeslagen
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-destructive space-y-1">
                    {importPreview.blocking_warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {importPreview.warnings && importPreview.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <div className="font-medium text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Controleer deze import extra goed
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-amber-900 space-y-1">
                    {importPreview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(["stage", "gc", "points", "mountain", "youth"] as const)
                .filter((c) => importPreview.source_kind !== "screenshot" || (importPreview.counts?.[c]?.total ?? 0) > 0)
                .map((c) => {
                const labelKey = c === "mountain" ? "kom" : c;
                const label = CLASSIFICATION_LABELS[labelKey as Classification];
                const matched = importPreview.matched[c] ?? [];
                const unmatched = importPreview.unmatched[c] ?? [];
                const diagnostic = importPreview.diagnostics?.[c];
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
                        {diagnostic && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            Bron {diagnostic.status} · {diagnostic.rows} rijen
                            {diagnostic.attempts > 1 ? ` · ${diagnostic.attempts} pogingen` : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {matched.length > 0 && (
                      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                        {matched.slice(0, 8).map((r) => (
                          <span key={r.position}>
                            {r.position}. #{r.start_number} {r.rider_name}
                            {r.confidence != null ? ` · ${Math.round(r.confidence * 100)}%` : ""}
                          </span>
                        ))}
                        {matched.length > 8 && <span className="italic">+{matched.length - 8} meer…</span>}
                      </div>
                    )}
                    {unmatched.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Niet automatisch gematcht — kies handmatig:
                        </div>
                        {unmatched.map((u) => {
                          const key = `${c}-${u.position}`;
                          const matchedIds = matched.map((m) => m.rider_id);
                          const otherManual = Object.entries(manualPicks)
                            .filter(([k, v]) => k !== key && k.startsWith(`${c}-`) && v)
                            .map(([, v]) => v);
                          return (
                            <div key={key} className="grid grid-cols-[60px_1fr] items-center gap-2 text-xs">
                              <div className="font-bold">
                                {u.position}.{u.bib != null ? ` #${u.bib}` : ""}
                                <div className="text-muted-foreground font-normal truncate">{u.name}</div>
                                {u.confidence != null && (
                                  <div className="text-amber-700 font-normal">beeld {Math.round(u.confidence * 100)}%</div>
                                )}
                              </div>
                              <RiderSearchSelect
                                riders={riderOptions}
                                value={manualPicks[key] ?? ""}
                                onChange={(v) => setManualPicks((p) => ({ ...p, [key]: v }))}
                                excludeIds={[...matchedIds, ...otherManual]}
                                placeholder={`Zoek "${u.name}"...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeImportPreview}>Annuleren</Button>
            <Button
              onClick={applyImport}
              disabled={savingImport || !!importPreview?.blocking_warnings?.length}
              data-testid="apply-import-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingImport ? "Opslaan..." : "Bevestig en sla op"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
