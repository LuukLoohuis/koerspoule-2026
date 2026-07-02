// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Undo2, RefreshCw, ChevronDown, ChevronRight, Sparkles, Mic, Briefcase, Coffee, Eye } from "lucide-react";
import { toast } from "sonner";

type BreakdownRow = {
  entry_id: string;
  team_name: string | null;
  display_name: string;
  total_stage_points: number;
  breakdown: Array<{
    rider_id: string;
    rider_name: string | null;
    finish_position: number | null;
    base_pts: number;
    is_joker: boolean;
    multiplier: number;
    total: number;
  }>;
};

function StageBreakdown({ stageId }: { stageId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BreakdownRow[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_stage_points_breakdown", { p_stage_id: stageId });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as BreakdownRow[]);
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
          <p className="text-xs text-muted-foreground italic">Geen ingediende deelnemers gevonden.</p>
        )}
        {!loading && rows && rows.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {rows.map((r) => {
              const isOpen = expanded[r.entry_id] ?? false;
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
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1 pr-2">Renner</th>
                          <th className="py-1 pr-2">Finish</th>
                          <th className="py-1 pr-2">Basis</th>
                          <th className="py-1 pr-2">×</th>
                          <th className="py-1 pr-2 text-right">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.breakdown.map((b, i) => (
                          <tr key={`${b.rider_id}-${i}`} className="border-t border-muted">
                            <td className="py-0.5 pr-2">
                              {b.rider_name ?? "—"}
                              {b.is_joker && <Badge className="ml-1 text-[10px] py-0" variant="outline">Joker</Badge>}
                            </td>
                            <td className="py-0.5 pr-2">{b.finish_position ?? "—"}</td>
                            <td className="py-0.5 pr-2">{b.base_pts}</td>
                            <td className="py-0.5 pr-2">{b.multiplier}</td>
                            <td className="py-0.5 pr-2 text-right font-mono">{b.total}</td>
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
};

export default function ApprovalsTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lefBusy, setLefBusy] = useState(false);
  // Per-etappe "Steun Koerspoule"-banner-staat (100% handmatig; nooit auto).
  const [bannerMap, setBannerMap] = useState<Record<string, boolean>>({});
  // Admin-only testmodus (per game): admin ziet alles ongeacht status. Geen effect op deelnemers.
  const [testmodus, setTestmodus] = useState(false);

  useEffect(() => {
    if (!supabase || !activeGameId) return;
    (async () => {
      const { data } = await supabase.from("games").select("admin_testmodus").eq("id", activeGameId).maybeSingle();
      setTestmodus(Boolean(data?.admin_testmodus));
    })();
  }, [activeGameId]);

  async function toggleTestmodus(next: boolean) {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("games").update({ admin_testmodus: next }).eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setTestmodus(next);
    toast.success(next ? "Testmodus AAN — je ziet als admin alles ongeacht de status" : "Testmodus uit — je ziet de game zoals de status hoort");
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

  async function load() {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_pending_approvals", { p_game_id: activeGameId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);

    // Banner-staat per etappe (faalt stil als de migratie nog niet draaide).
    const { data: bdata } = await supabase
      .from("stages")
      .select("id, support_banner_visible")
      .eq("game_id", activeGameId);
    const m: Record<string, boolean> = {};
    for (const s of (bdata ?? []) as Array<{ id: string; support_banner_visible: boolean }>) {
      m[s.id] = !!s.support_banner_visible;
    }
    setBannerMap(m);
  }

  // Handmatige toggle — de ENIGE manier waarop de banner aan/uit gaat.
  async function toggleBanner(stageId: string, next: boolean) {
    if (!supabase) return;
    const { error } = await supabase
      .from("stages")
      .update({ support_banner_visible: next, support_banner_updated_at: new Date().toISOString() })
      .eq("id", stageId);
    if (error) {
      toast.error(`Banner togglen faalde: ${error.message}`);
      return;
    }
    setBannerMap((prev) => ({ ...prev, [stageId]: next }));
    toast.success(next ? "☕ Steun-banner AAN voor deze etappe" : "Steun-banner uit");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  async function approve(stageId: string) {
    if (!confirm("Uitslag publiceren naar deelnemers? De punten zijn al berekend; fiatteren is je controle vóór publicatie.")) return;
    setBusyId(stageId);
    const { error } = await supabase.rpc("approve_stage_results", { p_stage_id: stageId });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Uitslag gefiatteerd");
    load();
    // Trigger Wuyts/De Cauwer-commentaargenerator (async, niet-blokkerend)
    void (async () => {
      try {
        const { data, error: ge } = await supabase.functions.invoke("generate-stage-commentary", {
          body: { stage_id: stageId, force: false },
        });
        if (ge) {
          // Lees echte response body uit FunctionsHttpError.context
          let detail = ge.message;
          const ctx = (ge as { context?: Response }).context;
          if (ctx && typeof ctx.text === "function") {
            try {
              const body = await ctx.text();
              if (body) detail = body;
            } catch { /* keep fallback */ }
          }
          throw new Error(detail);
        }
        const generated = (data as { generated?: number })?.generated ?? 0;
        const errors = (data as { errors?: Array<{ error: string }> })?.errors ?? [];
        if (generated > 0) {
          toast.success(`🎙️ Commentaar gegenereerd voor ${generated} subpoule${generated === 1 ? "" : "s"}`);
        }
        if (errors.length > 0) {
          toast.error(`Per-subpoule fouten: ${errors[0].error}${errors.length > 1 ? ` (en ${errors.length - 1} meer)` : ""}`);
        }
      } catch (e) {
        toast.error(`Commentaargenerator faalde: ${(e as Error).message}`);
      }
    })();
  }

  const pending = rows.filter((r) => r.results_status === "pending");
  const drafts = rows.filter((r) => r.results_status === "draft");
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
      {/* Admin-only testmodus — losgekoppeld van de game-status; raakt deelnemers niet. */}
      <Card className={testmodus ? "border-[hsl(var(--vintage-gold))]" : ""}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-2">
              <Eye className="w-4 h-4" /> Testmodus {testmodus ? "AAN" : "uit"}
            </p>
            <p className="text-xs text-muted-foreground">
              Als admin zie je dan <strong>alles</strong> (L'Équipe, uitslagen, subpoule, Hors Catégorie) ongeacht de game-status.
              Deelnemers merken hier niets van — die zien de game volgens de status.
            </p>
          </div>
          <Button size="sm" variant={testmodus ? "default" : "outline"} className="shrink-0" disabled={!activeGameId} onClick={() => toggleTestmodus(!testmodus)}>
            {testmodus ? "Zet uit" : "Zet aan"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-orange-300">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />Te fiatteren
              {pending.length > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500">{pending.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Herlaad
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stap 3 — De punten zijn al berekend. Klap per etappe de puntenberekening uit om te controleren waarom een deelnemer een bepaald aantal punten heeft, en publiceer daarna naar de deelnemers.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Geen uitslagen wachten op goedkeuring.</p>
          ) : (
            pending.map((r) => (
              <div key={r.stage_id} className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold">Etappe {r.stage_number}</span>
                      {r.stage_name && <span className="text-sm text-muted-foreground">— {r.stage_name}</span>}
                      <StatusBadge s={r.results_status} />
                    </div>
                    {r.submitted_for_approval_at && (
                      <p className="text-xs text-muted-foreground">
                        Ingediend op {new Date(r.submitted_for_approval_at).toLocaleString("nl-NL")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => approve(r.stage_id)}
                    disabled={busyId === r.stage_id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />Fiatteren
                  </Button>
                </div>
                <StageBreakdown stageId={r.stage_id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Concepten ({drafts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground italic">Geen concepten.</p>
          ) : drafts.map((r) => (
            <div key={r.stage_id} className="border rounded-md p-2">
              <div className="flex items-center gap-2">
                <StatusBadge s={r.results_status} />
                <span>Etappe {r.stage_number}</span>
                {r.stage_name && <span className="text-muted-foreground">— {r.stage_name}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Goedgekeurd ({approved.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
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
                  onClick={async () => {
                    if (!confirm("Commentaar regenereren voor alle subpoules? Overschrijft bestaand commentaar voor deze etappe.")) return;
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-stage-commentary", {
                        body: { stage_id: r.stage_id, force: true },
                      });
                      if (error) {
                        let detail = error.message;
                        const ctx = (error as { context?: Response }).context;
                        if (ctx && typeof ctx.text === "function") {
                          try { const body = await ctx.text(); if (body) detail = body; } catch { /* keep fallback */ }
                        }
                        throw new Error(detail);
                      }
                      const generated = (data as { generated?: number })?.generated ?? 0;
                      toast.success(`🎙️ Commentaar gegenereerd voor ${generated} subpoule${generated === 1 ? "" : "s"}`);
                    } catch (e) {
                      toast.error(`Faalde: ${(e as Error).message}`);
                    }
                  }}
                >
                  <Mic className="w-3 h-3 mr-1" />Regenereer Michel &amp; José
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--vintage-gold))] text-[hsl(var(--vintage-gold))]"
                  disabled={lefBusy || !activeGameId}
                  title="Wist alle Lefevère-rapporten van deze game; ze regenereren bij de volgende weergave."
                  onClick={regenerateLefevere}
                >
                  <Briefcase className={`w-3 h-3 mr-1 ${lefBusy ? "animate-pulse" : ""}`} />Regenereer Lefevère
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
                <Button
                  size="sm"
                  variant="outline"
                  className={
                    bannerMap[r.stage_id]
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }
                  title="Toon de 'Steun Koerspoule'-banner in Mijn Peloton voor deze game. 100% handmatig — gaat nooit vanzelf aan."
                  onClick={() => toggleBanner(r.stage_id, !bannerMap[r.stage_id])}
                >
                  <Coffee className="w-3 h-3 mr-1" />
                  Steun-banner: {bannerMap[r.stage_id] ? "AAN" : "uit"}
                </Button>
              </div>
              <StageBreakdown stageId={r.stage_id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
