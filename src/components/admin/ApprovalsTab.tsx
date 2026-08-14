// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetchAll";
import { runLefevereBatch, fetchLefevereCount, type LefevereCount } from "@/lib/lefevereBatch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Undo2, RefreshCw, ChevronDown, ChevronRight, Sparkles, Mic, Briefcase, Loader2, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getCalculationProgress, isCalculationActive, isFiatReady } from "@/lib/calculationProgress";
import { useNavigate } from "react-router-dom";

type BreakdownRow = {
  entry_id: string;
  team_name: string | null;
  display_name: string;
  total_stage_points: number;
  breakdown: Array<{
    rider_id?: string;
    rider_name: string | null;
    finish_position: number | null;
    base_pts: number;
    is_joker: boolean;
    multiplier: number;
    total: number;
    classification?: string;
    position?: number;
  }>;
};

function StageBreakdown({ stageId }: { stageId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BreakdownRow[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isGcBreakdown, setIsGcBreakdown] = useState(false);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: stage, error: stageError } = await supabase
        .from("stages")
        .select("game_id, is_gc")
        .eq("id", stageId)
        .single();
      if (stageError) throw stageError;
      setIsGcBreakdown(Boolean(stage.is_gc));

      // De GC-etappe heeft geen gewone etappepunten. Toon hier de reeds
      // berekende GC-/truibonussen; dit is een lichte, geïndexeerde tabelquery
      // en voorkomt de zware picks × deelnemers-berekening die eerder timeoutte.
      if (stage.is_gc) {
        const predictionRows = await fetchAllRows<any>((from, to) =>
          supabase!
            .from("entry_prediction_points")
            .select(
              "entry_id, classification, position, points, entries!inner(team_name, user_id, game_id, status)",
            )
            .eq("entries.game_id", stage.game_id)
            .eq("entries.status", "submitted")
            .order("points", { ascending: false })
            .range(from, to),
        );
        // entries.user_id heeft in het huidige schema geen expliciete FK naar
        // profiles; PostgREST kan die relatie dus niet nesten. Los ophalen
        // voorkomt schema-cachefouten en houdt de puntenquery eenvoudig.
        const profiles = await fetchAllRows<{ id: string; display_name: string | null }>((from, to) =>
          supabase!
            .from("profiles")
            .select("id, display_name")
            .range(from, to),
        );
        const displayNameByUser = new Map(profiles.map((p) => [p.id, p.display_name]));

        const grouped = new Map<string, BreakdownRow>();
        for (const row of predictionRows) {
          const entry = row.entries;
          const current = grouped.get(row.entry_id) ?? {
            entry_id: row.entry_id,
            team_name: entry?.team_name ?? null,
            display_name: displayNameByUser.get(entry?.user_id) ?? "Onbekend",
            total_stage_points: 0,
            breakdown: [],
          };
          const points = Number(row.points ?? 0);
          const existingIndex = current.breakdown.findIndex(
            (item) =>
              item.classification === row.classification &&
              item.position === row.position,
          );
          const detail = {
            rider_name: null,
            finish_position: null,
            base_pts: points,
            is_joker: false,
            multiplier: 1,
            total: points,
            classification: row.classification,
            position: row.position,
          };
          if (existingIndex >= 0) {
            // Bestaande dubbele database-regels niet dubbel tonen/tellen.
            current.breakdown[existingIndex] = detail;
          } else {
            current.breakdown.push(detail);
          }
          current.total_stage_points = current.breakdown.reduce(
            (sum, item) => sum + Math.max(0, Number(item.total ?? 0)),
            0,
          );
          grouped.set(row.entry_id, current);
        }
        setRows(
          [...grouped.values()].sort(
            (a, b) =>
              b.total_stage_points - a.total_stage_points ||
              a.display_name.localeCompare(b.display_name),
          ),
        );
        return;
      }

      // Gepagineerd: ook RPC's kapt PostgREST op de Max rows-limiet (1000+ deelnemers).
      const all = await fetchAllRows<BreakdownRow>((from, to) =>
        supabase!.rpc("admin_stage_points_breakdown", { p_stage_id: stageId }).range(from, to),
      );
      setRows(all);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onToggle(o: boolean) {
    setOpen(o);
    if (o && rows === null) load();
  }

  return (
    <Collapsible open={open} onOpenChange={onToggle} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          {open ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
          <Sparkles className="w-3 h-3 mr-1" />
          Toon puntenberekening per deelnemer
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 border rounded-md p-2 bg-muted/30">
        {loading && <p className="text-xs text-muted-foreground italic">Berekening laden…</p>}
        {!loading && rows && rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            {isGcBreakdown
              ? "Nog geen GC- of truibonussen berekend. Ga naar Berekening en kies ‘Bereken eindklassement (GC)’."
              : "Geen ingediende deelnemers gevonden."}
          </p>
        )}
        {!loading && rows && rows.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {isGcBreakdown && (
              <p className="px-1 pb-1 text-[11px] text-muted-foreground">
                Alleen deelnemers met toegekende GC- of truibonuspunten worden getoond.
              </p>
            )}
            {rows.map((r) => {
              const isOpen = expanded[r.entry_id] ?? false;
              const isPrediction = r.breakdown.some((b) => b.classification);
              return (
                <div key={r.entry_id} className="border-b last:border-0 pb-1">
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => ({ ...s, [r.entry_id]: !isOpen }))}
                    className="w-full flex items-center justify-between gap-2 py-1 text-left text-sm hover:bg-muted/50 rounded px-1"
                  >
                    <span className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <strong>{r.display_name}</strong>
                      {r.team_name && <span className="text-xs text-muted-foreground">— {r.team_name}</span>}
                    </span>
                    <Badge variant="secondary">{r.total_stage_points} pt</Badge>
                  </button>
                  {isOpen && (
                    <table className="w-full text-xs mt-1 mb-2">
                      <thead>
                        {isPrediction ? (
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1 pr-2">Voorspelling</th>
                            <th className="py-1 pr-2">Positie</th>
                            <th className="py-1 pr-2 text-right">Bonus</th>
                          </tr>
                        ) : (
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1 pr-2">Renner</th>
                            <th className="py-1 pr-2">Finish</th>
                            <th className="py-1 pr-2">Basis</th>
                            <th className="py-1 pr-2">×</th>
                            <th className="py-1 pr-2 text-right">Totaal</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {r.breakdown.map((b, i) => (
                          <tr key={`${b.rider_id ?? b.classification}-${i}`} className="border-t border-muted">
                            {isPrediction ? (
                              <>
                                <td className="py-0.5 pr-2">
                                  {b.classification === "gc"
                                    ? "GC-podium"
                                    : b.classification === "points"
                                      ? "Puntentrui"
                                      : b.classification === "mountain"
                                        ? "Bergtrui"
                                        : b.classification === "youth"
                                          ? "Jongerentrui"
                                          : b.classification}
                                </td>
                                <td className="py-0.5 pr-2">{b.position ?? "—"}</td>
                                <td className="py-0.5 pr-2 text-right font-mono">{b.total} pt</td>
                              </>
                            ) : (
                              <>
                                <td className="py-0.5 pr-2">
                                  {b.rider_name ?? "—"}
                                  {b.is_joker && <Badge className="ml-1 text-[10px] py-0" variant="outline">Joker</Badge>}
                                </td>
                                <td className="py-0.5 pr-2">{b.finish_position ?? "—"}</td>
                                <td className="py-0.5 pr-2">{b.base_pts}</td>
                                <td className="py-0.5 pr-2">{b.multiplier}</td>
                                <td className="py-0.5 pr-2 text-right font-mono">{b.total}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

type Row = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  stage_date: string | null;
  results_status: "draft" | "pending" | "approved";
  submitted_for_approval_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  calculation_status: "idle" | "processing" | "finalizing" | "completed" | "failed";
  processed_count: number;
  total_count: number;
  calculation_started_at: string | null;
  calculation_completed_at: string | null;
  calculation_error: string | null;
};

function GcClassificationSummary({ stageId }: { stageId: string }) {
  type GcResultRow = {
    gc_position: number | null;
    points_position: number | null;
    mountain_position: number | null;
    youth_position: number | null;
    rider_name: string | null;
    riders: { name: string | null } | Array<{ name: string | null }> | null;
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Array<{ label: string; note: string; winners: string[] }>>([]);

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      if (!supabase) return;
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("stage_results")
        .select("gc_position, points_position, mountain_position, youth_position, rider_name, riders(name)")
        .eq("stage_id", stageId);
      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as GcResultRow[];
      const riderName = (row: GcResultRow) => {
        const rider = Array.isArray(row.riders) ? row.riders[0] : row.riders;
        return rider?.name ?? row.rider_name ?? "Onbekende renner";
      };
      const podium = [1, 2, 3].map((position) => {
        const row = rows.find((candidate) => candidate.gc_position === position);
        return row ? `${position}  ${riderName(row)}` : `${position}  Niet ingevuld`;
      });
      const winner = (column: "points_position" | "mountain_position" | "youth_position") => {
        const row = rows.find((candidate) => candidate[column] === 1);
        return row ? riderName(row) : "Niet ingevuld";
      };
      setSummary([
        { label: "Algemeen klassement", note: "Podium · eind-GC", winners: podium },
        { label: "Puntenklassement", note: "Groene trui", winners: [winner("points_position")] },
        { label: "Bergklassement", note: "Bergtrui", winners: [winner("mountain_position")] },
        { label: "Jongerenklassement", note: "Witte trui", winners: [winner("youth_position")] },
      ]);
      setError(null);
      setLoading(false);
    }
    void loadSummary();
    return () => { active = false; };
  }, [stageId]);

  if (loading) return <p className="p-4 text-sm text-muted-foreground italic">Eindklassement laden…</p>;
  if (error) return <p className="p-4 text-sm text-destructive">Eindklassement kon niet worden geladen: {error}</p>;

  return (
    <div className="divide-y">
      {summary.map((classification) => (
        <div key={classification.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(150px,.8fr)_minmax(0,1.5fr)] sm:items-center">
          <div>
            <p className="text-sm font-semibold">{classification.label}</p>
            <p className="text-xs text-muted-foreground">{classification.note}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {classification.winners.map((winner) => (
              <span key={winner} className="border border-border bg-secondary/50 px-2 py-1 text-xs">
                {winner}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GcApprovalCard({
  row,
  busy,
  onApprove,
}: {
  row: Row;
  busy: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="overflow-hidden border border-amber-400/70 bg-card shadow-sm" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-amber-50/60 p-4 dark:bg-amber-950/15">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-xl font-bold">Eindklassement fiatteren</h3>
            <Badge className="gap-1 bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" />Klaar voor fiat</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Controleer de officiële klassementen en publiceer daarna direct naar Uitslagen → Klassement → GC.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Etappe {row.stage_number}{row.stage_name ? ` · ${row.stage_name}` : ""}</span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1.55fr)_minmax(240px,.72fr)]">
        <div className="min-w-0 md:border-r">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h4 className="font-display font-semibold">Officieel eindklassement</h4>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">4 klassementen</span>
          </div>
          <GcClassificationSummary stageId={row.stage_id} />
          <div className="border-t px-2 py-1">
            <StageBreakdown stageId={row.stage_id} />
          </div>
        </div>

        <aside className="flex flex-col p-4">
          <h4 className="font-display font-semibold">Publicatiecheck</h4>
          <div className="mt-3 flex-1 space-y-3 text-sm">
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>Laatste etappe en einduitslag zijn ingevuld</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>Voorspellingsbonussen zijn berekend</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>{row.total_count || "Alle"} deelnemers verwerkt</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>Totaalstand is bijgewerkt</span></div>
          </div>
          <p className="my-4 text-xs leading-relaxed text-muted-foreground">
            Na fiatteren opent automatisch het definitieve eindklassement. Je controleert dus direct dezelfde GC-weergave als de deelnemers.
          </p>
          <Button onClick={onApprove} disabled={busy} className="w-full bg-amber-500 text-black hover:bg-amber-600">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {busy ? "Fiatteren…" : "Fiatteer en bekijk eindklassement"}
          </Button>
        </aside>
      </div>
    </div>
  );
}

export default function ApprovalsTab({ activeGameId }: { activeGameId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lefBusy, setLefBusy] = useState(false);
  // Lefevère-batch: voortgangsteller (per huidige stand) + generatie-status.
  const [lefCount, setLefCount] = useState<LefevereCount | null>(null);
  const [lefGenBusy, setLefGenBusy] = useState(false);
  const [lefFailed, setLefFailed] = useState<Array<{ entry_id: string; error: string }>>([]);
  const [gcStageIds, setGcStageIds] = useState<Set<string>>(new Set());

  // Genereert Lefevère-rapporten voor ALLE inzendingen voor de huidige stand
  // (client-driven batch). Idempotent; toont voortgang + ververst de teller.
  async function generateAllLefevere() {
    if (!supabase || !activeGameId || lefGenBusy) return;
    setLefGenBusy(true);
    const toastId = "lef-batch";
    const MAX_ROUNDS = 20;
    const onProgress = (done: number, total: number) =>
      setLefCount((prev) => ({ metRapport: done, totaal: total, stageCount: prev?.stageCount ?? 0 }));
    try {
      let allFailed: Array<{ entry_id: string; error: string }> = [];
      let prevMet = -1;
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const res = await runLefevereBatch(supabase, activeGameId, { onProgress });
        allFailed = res.failed;
        const c = await fetchLefevereCount(supabase, activeGameId);
        setLefCount(c);
        toast.loading(`🖋️ bezig… ${c.metRapport}/${c.totaal} deelnemers`, { id: toastId });
        if (!res.timedOut) break;
        if (res.generated === 0 && c.metRapport <= prevMet) break;
        prevMet = c.metRapport;
      }
      setLefFailed(allFailed);
      const c = await fetchLefevereCount(supabase, activeGameId);
      setLefCount(c);
      toast.success(`🖋️ klaar: ${c.metRapport}/${c.totaal} deelnemers voorzien`, { id: toastId });
      if (allFailed.length > 0) toast.error(`${allFailed.length} mislukt — zie de lijst.`);
    } catch (e) {
      toast.error(`Lefevère-batch faalde: ${(e as Error).message}`, { id: toastId });
    } finally {
      setLefGenBusy(false);
    }
  }
  // Per etappe: subpoules die na de laatste commentaar-run nog leeg zijn (+reden).
  const [emptyByStage, setEmptyByStage] = useState<Record<string, Array<{ id: string; name: string; reason: string }>>>({});
  const [commBusy, setCommBusy] = useState<string | null>(null);
  // Per etappe: hoeveel subpoules commentaar hebben t.o.v. het totaal in de game.
  const [commCounts, setCommCounts] = useState<Record<string, { met: number; totaal: number }>>({});

  // Telt per stage het aantal subpoules mét een etappe_commentaren-rij, en het
  // totaal aantal subpoules in de game. Gepagineerd (Max rows-limiet).
  async function fetchCommCount(stageId: string): Promise<{ met: number; totaal: number }> {
    const { count: totaal } = await supabase
      .from("subpoules")
      .select("id", { count: "exact", head: true })
      .eq("game_id", activeGameId);
    const rows = await fetchAllRows<{ subpoule_id: string }>((from, to) =>
      supabase!.from("etappe_commentaren").select("subpoule_id").eq("stage_id", stageId).range(from, to),
    );
    const met = new Set(rows.map((r) => r.subpoule_id)).size;
    return { met, totaal: totaal ?? 0 };
  }

  async function refreshCommCount(stageId: string): Promise<{ met: number; totaal: number }> {
    const c = await fetchCommCount(stageId);
    setCommCounts((prev) => ({ ...prev, [stageId]: c }));
    return c;
  }

  // Vult de tellers voor alle gefiatteerde etappes (bij laden).
  async function loadCommCounts(stageRows: Row[]) {
    if (!supabase || !activeGameId) return;
    const approved = stageRows.filter((r) => r.results_status === "approved").map((r) => r.stage_id);
    const entries = await Promise.all(approved.map(async (sid) => [sid, await fetchCommCount(sid)] as const));
    setCommCounts(Object.fromEntries(entries));
  }

  // Genereert commentaar met ÉÉN klik: blijft de edge-functie aanroepen zolang
  // die timedOut=true teruggeeft (elke ronde verwerkt een deel binnen het 90s-
  // budget van de functie). Transiënte fouten worden per ronde tot 3× opnieuw
  // geprobeerd (3s pauze). Idempotent — na ronde 1 altijd force=false, zodat al
  // gegenereerde subpoules niet opnieuw gedaan worden.
  async function runCommentary(stageId: string, force: boolean) {
    setCommBusy(stageId);
    const toastId = `comm-${stageId}`;
    const MAX_ROUNDS = 20;
    let totalGenerated = 0;
    let prevMet = -1;
    let retryCount = 0;
    let empty: Array<{ id: string; name: string; reason: string }> = [];
    try {
      let round = 1;
      while (round <= MAX_ROUNDS) {
        const { data, error } = await supabase.functions.invoke("generate-stage-commentary", {
          body: { stage_id: stageId, force: round === 1 ? force : false },
        });
        if (error) {
          // Transiënte fout (netwerkhik, edge-restart): zelfde ronde opnieuw,
          // max 3 pogingen met 3s pauze. Pas daarna echt stoppen.
          let detail = error.message;
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.text === "function") {
            try { const body = await ctx.text(); if (body) detail = body; } catch { /* keep fallback */ }
          }
          retryCount++;
          if (retryCount >= 3) throw new Error(detail);
          toast.loading(`🎙️ ronde herstart na fout (${retryCount}/3)…`, { id: toastId });
          await new Promise((r) => setTimeout(r, 3000));
          continue; // zelfde ronde opnieuw
        }
        retryCount = 0;
        const generated = (data as { generated?: number })?.generated ?? 0;
        const timedOut = Boolean((data as { timedOut?: boolean })?.timedOut);
        empty = ((data as { emptySubpoules?: Array<{ id: string; name: string; reason: string }> })?.emptySubpoules) ?? [];
        totalGenerated += generated;
        const c = await refreshCommCount(stageId);
        toast.loading(`🎙️ bezig… ${c.met}/${c.totaal} subpoules`, { id: toastId });
        // Klaar zodra de functie alles binnen de tijd afwerkte. De geen-voortgang-
        // guard geldt pas vanaf ronde 3, zodat een trage eerste ronde met alleen
        // skips de lus niet voortijdig stopt.
        if (!timedOut) break;
        if (round >= 3 && generated === 0 && c.met <= prevMet) break;
        prevMet = c.met;
        round++;
      }
      setEmptyByStage((prev) => ({ ...prev, [stageId]: empty }));
      const c = await refreshCommCount(stageId);
      toast.success(`🎙️ klaar: ${c.met}/${c.totaal} subpoules voorzien`, { id: toastId });
      return { generated: totalGenerated, empty, timedOut: false };
    } catch (e) {
      toast.error(`Commentaargenerator faalde: ${(e as Error).message}`, { id: toastId });
      return null;
    } finally {
      setCommBusy(null);
    }
  }

  // Wist alle Lefevère-rapporten van deze game → elke deelnemer krijgt een vers
  // rapport bij de volgende weergave (nu via het nieuwe model / verbeterde prompt).
  async function regenerateLefevere() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Lefevère-rapporten van alle deelnemers wissen? Ze worden opnieuw gegenereerd zodra een deelnemer zijn rapport opent.")) return;
    setLefBusy(true);
    try {
      const { data: entries, error: e1 } = await supabase
        .from("entries")
        .select("id")
        .eq("game_id", activeGameId);
      if (e1) throw e1;
      const ids = (entries ?? []).map((x: { id: string }) => x.id);
      if (ids.length === 0) { toast.info("Geen deelnemers in deze game."); return; }
      const { error: e2, count } = await supabase
        .from("lefevere_rapporten")
        .delete({ count: "exact" })
        .in("entry_id", ids);
      if (e2) throw e2;
      toast.success(`Lefevère-cache gewist (${count ?? 0} rapporten). Regenereren bij volgende weergave.`);
    } catch (e) {
      toast.error(`Lefevère wissen faalde: ${(e as Error).message}`);
    } finally {
      setLefBusy(false);
    }
  }

  async function load(silent = false) {
    if (!supabase || !activeGameId) return;
    if (!silent) setLoading(true);
    const [{ data, error }, { data: gcStages, error: gcError }] = await Promise.all([
      supabase.rpc("admin_pending_approvals", { p_game_id: activeGameId }),
      supabase.from("stages").select("id").eq("game_id", activeGameId).eq("is_gc", true),
    ]);
    if (!silent) setLoading(false);
    if (error || gcError) {
      const message = error?.message ?? gcError?.message ?? "Status laden mislukt";
      setLoadError(message);
      if (!silent) toast.error(message);
      return;
    }
    setLoadError(null);
    setGcStageIds(new Set((gcStages ?? []).map((stage) => stage.id)));
    const stageRows = (data ?? []) as Row[];
    setRows(stageRows);
    if (!silent) {
      loadCommCounts(stageRows);
      fetchLefevereCount(supabase, activeGameId).then(setLefCount).catch(() => setLefCount(null));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  const hasActiveCalculation = rows.some((r) => isCalculationActive(r.calculation_status));

  // Alleen pollen zolang werkelijk werk loopt. Het custom event zorgt dat een
  // berekening uit de andere admintab direct zichtbaar wordt, zonder Herlaad.
  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener("stage-calculation-changed", refresh);
    if (!hasActiveCalculation) {
      return () => window.removeEventListener("stage-calculation-changed", refresh);
    }
    const timer = window.setInterval(refresh, 1500);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("stage-calculation-changed", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId, hasActiveCalculation]);

  async function approve(stageId: string) {
    const isGc = gcStageIds.has(stageId);
    const question = isGc
      ? "Eindklassement definitief fiatteren? De GC- en truibonussen tellen daarna mee in de totaalstand."
      : "Uitslag fiatteren? Deelnemers zien dit pas zodra de game op Live staat. Met testmodus zie je zelf direct de volledige live-weergave.";
    if (!confirm(question)) return;
    setBusyId(stageId);
    const { error } = await supabase.rpc("approve_stage_results", { p_stage_id: stageId });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (isGc) {
      toast.success("Eindklassement gefiatteerd — definitieve stand geopend");
      navigate(`/uitslagen?game=${encodeURIComponent(activeGameId)}&view=klassement&stage=gc`);
    } else {
      toast.success("Uitslag gefiatteerd");
      load();
    }
    // Bewust GEEN automatische commentaargeneratie meer bij fiatteren: het
    // commentaar wordt on-demand per subpoule gegenereerd zodra een deelnemer
    // 'm opent (of via de handmatige knoppen hieronder).
  }

  async function submitForApproval(stageId: string) {
    setBusyId(stageId);
    const { error } = await supabase.rpc("submit_stage_for_approval", { p_stage_id: stageId });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Klaargezet voor controle");
    load();
  }

  const pending = rows.filter((r) => r.results_status === "pending");
  const calculationAttention = rows.filter((r) =>
    r.results_status !== "approved" && ["processing", "finalizing", "failed"].includes(r.calculation_status)
  );
  const approvalQueue = [...calculationAttention, ...pending.filter((r) => !calculationAttention.some((a) => a.stage_id === r.stage_id))];
  const drafts = rows.filter((r) =>
    r.results_status === "draft" && !["processing", "finalizing", "failed"].includes(r.calculation_status)
  );
  const approved = rows.filter((r) => r.results_status === "approved");

  function StatusBadge({ s }: { s: Row["results_status"] }) {
    if (s === "approved")
      return <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Goedgekeurd</Badge>;
    if (s === "pending")
      return <Badge className="bg-orange-500 hover:bg-orange-500 gap-1"><Clock className="w-3 h-3" />In afwachting</Badge>;
    return <Badge variant="secondary" className="gap-1"><FileEdit className="w-3 h-3" />Concept</Badge>;
  }

  return (
    <div className="space-y-6">

      <Card className="border-orange-300">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />Te fiatteren
              {approvalQueue.length > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500">{approvalQueue.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Herlaad
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stap 3 — De punten zijn al berekend. Klap per etappe de puntenberekening uit om te controleren waarom een deelnemer een bepaald aantal punten heeft, en publiceer daarna naar de deelnemers.
          </p>
          {loadError && (
            <p className="text-xs text-destructive flex items-center gap-1" role="alert">
              <AlertTriangle className="h-3.5 w-3.5" /> Status tijdelijk niet bereikbaar: {loadError}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {approvalQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Geen uitslagen wachten op goedkeuring.</p>
          ) : (
            approvalQueue.map((r) => {
              const calculating = r.calculation_status === "processing";
              const finalizing = r.calculation_status === "finalizing";
              const failed = r.calculation_status === "failed";
              const ready = isFiatReady(r.results_status, r.calculation_status);
              const progress = getCalculationProgress(r.processed_count, r.total_count);
              if (gcStageIds.has(r.stage_id) && ready) {
                return (
                  <GcApprovalCard
                    key={r.stage_id}
                    row={r}
                    busy={busyId === r.stage_id}
                    onApprove={() => approve(r.stage_id)}
                  />
                );
              }
              return (
              <div key={r.stage_id} className="min-w-0 border rounded-md p-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold">Etappe {r.stage_number}</span>
                      {r.stage_name && <span className="text-sm text-muted-foreground">— {r.stage_name}</span>}
                      {calculating || finalizing ? (
                        <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />{finalizing ? "Berekening afronden" : "Punten verwerken"}</Badge>
                      ) : failed ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Berekening mislukt</Badge>
                      ) : ready ? (
                        <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Klaar voor fiat</Badge>
                      ) : <StatusBadge s={r.results_status} />}
                    </div>
                    {(calculating || finalizing) && (
                      <div className="max-w-md space-y-1.5">
                        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>{r.total_count > 0 ? `${r.processed_count} van ${r.total_count} deelnemers verwerkt` : "Voortgang wordt voorbereid"}</span>
                          {progress != null && <span className="shrink-0 font-mono">{progress}%</span>}
                        </div>
                        {progress != null ? (
                          <div className="h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`Voortgang puntenberekening etappe ${r.stage_number}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                            <div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                          </div>
                        ) : (
                          <div className="h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`Puntenberekening etappe ${r.stage_number} wordt voorbereid`}>
                            <div className="h-full w-1/3 animate-pulse bg-primary motion-reduce:animate-none" />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">{finalizing ? "Controlestatus bijwerken…" : "De punten worden berekend. Deze pagina ververst automatisch."}</p>
                      </div>
                    )}
                    {failed && (
                      <p className="text-xs text-destructive" role="alert">{r.calculation_error ?? "Onbekende fout tijdens de berekening."}</p>
                    )}
                    {ready && r.calculation_completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Berekening voltooid op {new Date(r.calculation_completed_at).toLocaleString("nl-NL")}
                        {r.total_count > 0 ? ` · ${r.total_count} deelnemers verwerkt` : ""}
                      </p>
                    )}
                    {ready && r.submitted_for_approval_at && (
                      <p className="text-xs text-muted-foreground">
                        Ingediend op {new Date(r.submitted_for_approval_at).toLocaleString("nl-NL")}
                      </p>
                    )}
                  </div>
                  {ready ? (
                    <Button onClick={() => approve(r.stage_id)} disabled={busyId !== null} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                      {busyId === r.stage_id ? <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      {busyId === r.stage_id ? "Fiatteren…" : "Fiatteren"}
                    </Button>
                  ) : failed ? (
                    <Button variant="outline" onClick={() => load()} className="w-full sm:w-auto"><RefreshCw className="h-4 w-4 mr-2" />Opnieuw controleren</Button>
                  ) : (
                    <Button disabled className="w-full sm:w-auto min-w-[180px]">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" />Punten berekenen…
                    </Button>
                  )}
                </div>
                {ready && <StageBreakdown stageId={r.stage_id} />}
              </div>
            );})
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Concepten ({drafts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground italic">Geen concepten.</p>
          ) : drafts.map((r) => {
            const isGc = gcStageIds.has(r.stage_id);
            return (
            <div key={r.stage_id} className={`border rounded-md p-2 ${isGc ? "border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <StatusBadge s={r.results_status} />
                  <span>{isGc ? "Eindklassement" : `Etappe ${r.stage_number}`}</span>
                  {r.stage_name && <span className="text-muted-foreground">— {r.stage_name}</span>}
                </div>
                <Button
                  size="sm"
                  disabled={busyId === r.stage_id}
                  onClick={() => submitForApproval(r.stage_id)}
                >
                  {isGc ? <Trophy className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  {busyId === r.stage_id ? "Bezig…" : isGc ? "Bereken en zet klaar voor fiat" : "Klaar voor controle"}
                </Button>
              </div>
            </div>
          );})}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Goedgekeurd ({approved.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {/* Game-level Lefevère-batch — genereert rapporten voor ALLE deelnemers
              voor de huidige stand. Niet automatisch bij fiatteren. */}
          {approved.length > 0 && (
            <div className="mb-3 rounded-md border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-[hsl(var(--vintage-gold))] text-black hover:brightness-95"
                  disabled={lefGenBusy || !activeGameId}
                  onClick={generateAllLefevere}
                >
                  <Briefcase className={`w-3 h-3 mr-1 ${lefGenBusy ? "animate-pulse" : ""}`} />
                  {lefGenBusy
                    ? `Bezig… ${lefCount ? `${lefCount.metRapport}/${lefCount.totaal}` : ""}`
                    : "Genereer Lefevère (alle deelnemers)"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lefBusy || !activeGameId}
                  title="Wist alle Lefevère-rapporten van deze game; ze regenereren pas bij de volgende weergave of via de generatie-knop."
                  onClick={regenerateLefevere}
                >
                  <Undo2 className={`w-3 h-3 mr-1 ${lefBusy ? "animate-pulse" : ""}`} />Wis Lefevère-cache
                </Button>
              </div>
              {lefCount && (() => {
                const done = lefCount.totaal > 0 && lefCount.metRapport === lefCount.totaal;
                const pct = lefCount.totaal > 0 ? Math.round((lefCount.metRapport / lefCount.totaal) * 100) : 0;
                return (
                  <div className="max-w-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={done ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        Lefevère: {lefCount.metRapport}/{lefCount.totaal} deelnemers
                      </span>
                      {done && <span className="text-green-600">✓</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${done ? "bg-green-600" : "bg-muted-foreground/50"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
              {lefFailed.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-orange-600">
                      <ChevronRight className="w-3 h-3 mr-1" />{lefFailed.length} mislukt
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="text-xs text-muted-foreground pl-6 py-1 space-y-0.5">
                      {lefFailed.map((f) => (<li key={f.entry_id}>{f.entry_id.slice(0, 8)}… — {f.error}</li>))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
          {approved.length === 0 ? (
            <p className="text-muted-foreground italic">Nog niets gefiatteerd.</p>
          ) : approved.slice(0, 30).map((r) => (
            <div key={r.stage_id} className="border-b last:border-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge s={r.results_status} />
                <span>Etappe {r.stage_number}</span>
                {r.approved_at && (
                  <span className="text-xs text-muted-foreground">
                    · {new Date(r.approved_at).toLocaleDateString("nl-NL")}
                    {r.approved_by_name ? ` · ${r.approved_by_name}` : ""}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]"
                  disabled={commBusy === r.stage_id}
                  title="Vult alleen de subpoules aan die nog geen commentaar hebben (idempotent). Eén klik draait door tot alles voorzien is."
                  onClick={() => runCommentary(r.stage_id, false)}
                >
                  <Mic className={`w-3 h-3 mr-1 ${commBusy === r.stage_id ? "animate-pulse" : ""}`} />Vul ontbrekend commentaar aan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]"
                  disabled={commBusy === r.stage_id}
                  onClick={async () => {
                    if (!confirm("Commentaar regenereren voor alle subpoules? Overschrijft bestaand commentaar voor deze etappe.")) return;
                    await runCommentary(r.stage_id, true);
                  }}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${commBusy === r.stage_id ? "animate-pulse" : ""}`} />Regenereer Michel &amp; José
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm("Goedkeuring intrekken?")) return;
                    const { error } = await supabase.rpc("revoke_stage_approval", { p_stage_id: r.stage_id });
                    if (error) toast.error(error.message);
                    else { toast.success("Ingetrokken"); load(); }
                  }}
                >
                  <Undo2 className="w-3 h-3 mr-1" />Intrekken
                </Button>
              </div>

              {/* Blijvende voortgang: hoeveel subpoules hebben commentaar */}
              {(() => {
                const c = commCounts[r.stage_id];
                if (!c) return null;
                const done = c.totaal > 0 && c.met === c.totaal;
                const pct = c.totaal > 0 ? Math.round((c.met / c.totaal) * 100) : 0;
                return (
                  <div className="mt-2 max-w-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={done ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        Commentaar: {c.met}/{c.totaal} subpoules
                      </span>
                      {done && <span className="text-green-600">✓</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full ${done ? "bg-green-600" : "bg-muted-foreground/50"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Commentaar wordt geschreven vanaf 2 deelnemers per subpoule.
              </p>

              {emptyByStage[r.stage_id] && emptyByStage[r.stage_id].length > 0 && (
                <Collapsible className="mt-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-orange-600">
                      <ChevronRight className="w-3 h-3 mr-1" />
                      {emptyByStage[r.stage_id].length} subpoule{emptyByStage[r.stage_id].length === 1 ? "" : "s"} zonder commentaar
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="text-xs text-muted-foreground pl-6 py-1 space-y-0.5">
                      {emptyByStage[r.stage_id].map((s) => (
                        <li key={s.id}>
                          <span className="font-medium">{s.name}</span> — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
              <StageBreakdown stageId={r.stage_id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
