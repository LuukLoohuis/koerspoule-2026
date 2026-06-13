import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, ArrowUp, ArrowDown, Flag, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePointsForEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import StageBar from "@/components/stages/StageBar";
import { buildStageBarData } from "@/components/stages/stageBarData";
import { cn } from "@/lib/utils";


type Props = {
  subpouleId: string;
  subpouleName: string;
  gameId?: string;
  gameStatus?: string;
  /** Toon de klassementsverloop-grafiek onderaan. Default true. Zet op false
   *  als de parent 'm als losse, ankerbare sectie zelf rendert. */
  showEvolution?: boolean;
};

export default function SubpouleStandings({ subpouleId, subpouleName, gameId, gameStatus, showEvolution = true }: Props) {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  // De subpoule hoort bij een specifieke game (bv. een afgeronde Giro). Gebruik
  // die i.p.v. de huidige live game, anders laden we de verkeerde entries/punten
  // en staat alles op 0 / "geen team".
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  // Alleen de stage_points van de subpouleleden ophalen (schaalt naar veel deelnemers).
  const memberEntryIds = useMemo(() => {
    const memberUserIds = new Set(members.map((m) => m.user_id));
    return entries.filter((e) => memberUserIds.has(e.user_id)).map((e) => e.id);
  }, [members, entries]);
  const { data: stagePoints = [] } = useStagePointsForEntries(game?.id, memberEntryIds);

  const [compareId, setCompareId] = useState<string | null>(null);
  const [etappeIdx, setEtappeIdx] = useState<number>(0);
  // Auto-scroll naar de benchmark zodra een team gekozen is — de vergelijking
  // rendert onder de tabel en viel anders buiten beeld (gemiste feedback).
  const compareRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!compareId || !compareRef.current) return;
    const id = window.setTimeout(() => {
      compareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120); // korte delay zodat de vergelijking eerst rendert
    return () => window.clearTimeout(id);
  }, [compareId]);
  const [showTapHint, setShowTapHint] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("subpoule-tap-hint-dismissed") !== "1";
  });
  const dismissTapHint = () => {
    setShowTapHint(false);
    try { sessionStorage.setItem("subpoule-tap-hint-dismissed", "1"); } catch { /* ignore */ }
  };


  // Initialize to last stage with any points
  useEffect(() => {
    if (stages.length === 0) return;
    const totals = new Map<string, number>();
    stagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    for (let i = stages.length - 1; i >= 0; i--) {
      if ((totals.get(stages[i].id) ?? 0) > 0) { setEtappeIdx(i); return; }
    }
  }, [stages.length, stagePoints.length]);

  const selectedEtappe = stages[etappeIdx];

  // My entry
  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // My points per stage (drives StageBars bar highlight)
  const myPointsPerStage = useMemo(() => {
    if (!myEntry) return new Map<string, number>();
    const m = new Map<string, number>();
    stagePoints.filter((sp) => sp.entry_id === myEntry.id).forEach((sp) => m.set(sp.stage_id, (m.get(sp.stage_id) ?? 0) + sp.points));
    return m;
  }, [myEntry, stagePoints]);

  // Relatieve balkhoogte per etappe (alleen subpoule): op POSITIE binnen de
  // subpoule die dag. Rang 1 = vol, laatste = ondervloer. Ondervloer zodat elke
  // positieve score zichtbaar blijft; 0 dagpunten = fractie 0 = lege balk.
  const barFractionByStageId = useMemo(() => {
    const MIN_VISIBLE_FRAC = 0.2;
    const res = new Map<string, number>();
    if (!myEntry) return res;

    // Dagpunten per (entry, stage) binnen de subpoule — som meerdere
    // klassement-rijen per renner.
    const byStage = new Map<string, Map<string, number>>();
    stagePoints.forEach((sp) => {
      let m = byStage.get(sp.stage_id);
      if (!m) { m = new Map(); byStage.set(sp.stage_id, m); }
      m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
    });

    stages.forEach((s) => {
      if (s.is_gc) return;
      const m = byStage.get(s.id);
      const mine = m?.get(myEntry.id) ?? 0;
      if (mine <= 0) { res.set(s.id, 0); return; }

      // Positie: rang binnen subpoule-leden met >0 dagpunten (hoogste = 1).
      const positives = m ? [...m.values()].filter((v) => v > 0) : [];
      const N = positives.length;
      let better = 0;
      m?.forEach((v) => { if (v > mine) better++; });
      const rank = better + 1;
      const frac = N <= 1 ? 1 : MIN_VISIBLE_FRAC + (1 - MIN_VISIBLE_FRAC) * ((N - rank) / (N - 1));
      res.set(s.id, frac);
    });
    return res;
  }, [myEntry, stagePoints, stages]);

  // Cumulative points up to a given stage index
  const cumUpTo = (upToIdx: number) => {
    if (upToIdx < 0) return new Map<string, number>();
    const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
    const m = new Map<string, number>();
    stagePoints.filter((sp) => allowed.has(sp.stage_id)).forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
    return m;
  };

  // Member rows ranked by cumulative pts up to the selected stage
  const memberRows = useMemo(() => {
    if (stages.length === 0) {
      return members
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return {
            user_id: m.user_id,
            display_name: m.display_name,
            team_name: entry?.team_name ?? null,
            entry_id: entry?.id ?? null,
            total_points: entry?.total_points ?? 0,
            pred_bonus: 0,
            stage_points: 0,
            stage_rank: null as number | null,
            rank: 0,
            delta: null as number | null,
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    const curMap = cumUpTo(etappeIdx);
    // Baseline voor positiewisseling = de vórige rit MET data (niet simpelweg
    // idx-1). Anders vergelijk je met een lege/GC-tussenstap die dezelfde
    // cumulatieve stand geeft → ruis-pijltjes. Geen eerdere data → geen delta.
    const stageDayTotal = (idx: number) => {
      const sid = stages[idx]?.id;
      if (!sid) return 0;
      let t = 0;
      stagePoints.forEach((sp) => { if (sp.stage_id === sid) t += sp.points; });
      return t;
    };
    let prevDataIdx = -1;
    for (let i = etappeIdx - 1; i >= 0; i--) {
      if (stageDayTotal(i) > 0) { prevDataIdx = i; break; }
    }
    const prevMap = prevDataIdx >= 0 ? cumUpTo(prevDataIdx) : new Map<string, number>();
    // Voorspellingsbonus (GC + truien): total_points bevat hem, entry_prediction_points
    // is per RLS niet leesbaar voor andere deelnemers. Bonus = total_points − som alle
    // etappepunten. Vóór de slotrit is dit 0. Telt alleen mee in de GC-eindstand,
    // dus enkel wanneer de GC-rit geselecteerd is — niet bij tussenstanden per etappe.
    const isGc = selectedEtappe?.is_gc === true;
    const fullMap = cumUpTo(stages.length - 1);
    const bonusOf = (entry?: { id: string; total_points?: number } | null) =>
      isGc && entry ? Math.max(0, (entry.total_points ?? 0) - (fullMap.get(entry.id) ?? 0)) : 0;


    // Stage pts for the selected stage (used for ranking within subpoule)
    const selStagePts = new Map<string, number>();
    if (selectedEtappe) {
      stagePoints
        .filter((sp) => sp.stage_id === selectedEtappe.id)
        .forEach((sp) => selStagePts.set(sp.entry_id, (selStagePts.get(sp.entry_id) ?? 0) + sp.points));
    }

    // Stage rank within subpoule for the selected stage
    const stageRankByUser = new Map<string, number>();
    [...members]
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return { user_id: m.user_id, pts: entry ? (selStagePts.get(entry.id) ?? 0) : 0 };
      })
      .filter((r) => r.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .forEach((r, i) => stageRankByUser.set(r.user_id, i + 1));

    const prevRankByUser = new Map(
      [...members]
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return { user_id: m.user_id, pts: entry ? (prevMap.get(entry.id) ?? 0) + bonusOf(entry) : 0 };
        })
        .sort((a, b) => b.pts - a.pts)
        .map((r, i) => [r.user_id, i + 1] as [string, number])
    );

    const rows = members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry ? (curMap.get(entry.id) ?? 0) + bonusOf(entry) : 0,
          pred_bonus: bonusOf(entry),
          stage_points: entry ? (selStagePts.get(entry.id) ?? 0) : 0,
          stage_rank: stageRankByUser.get(m.user_id) ?? null,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    return rows.map((row, i) => {
      const rank = i + 1;
      const prevRank = prevRankByUser.get(row.user_id);
      const delta = prevDataIdx >= 0 && prevRank != null ? prevRank - rank : null;
      return { ...row, rank, delta };
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, entries, stagePoints, stages, etappeIdx]);

  const compareMember = memberRows.find((m) => m.user_id === compareId);

  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Stage selector — identieke etappe-bar als de Uitslagen-tab. */}
      {stages.length > 0 && (() => {
        const { data, gcTotal, selectedNumber } = buildStageBarData(
          stages,
          myPointsPerStage,
          selectedEtappe?.id,
          myEntry?.total_points,
        );
        // Laat buildStageBarData ongemoeid; map er de relatieve dagprestatie
        // (barFraction) overheen voor de subpoule-weergave.
        const stageIdByNumber = new Map(
          stages.filter((s) => !s.is_gc).map((s) => [s.stage_number, s.id]),
        );
        const dataWithFraction = data.map((d) => ({
          ...d,
          barFraction: barFractionByStageId.get(stageIdByNumber.get(d.stageNumber) ?? "") ?? 0,
        }));
        return (
          // retro-border wrapper zodat de StageBar exact dezelfde kaart-chrome
          // (2px border + 3px offset-shadow) en breedte krijgt als de
          // standings-kaart eronder. StageBar zelf chromeless.
          <div className="retro-border bg-gradient-to-br from-card via-card to-secondary/20 p-3">
            <StageBar
              chromeless
              stages={dataWithFraction}
              gcTotal={gcTotal}
              selectedStage={selectedNumber}
              onSelectStage={(n) => {
                const idx = stages.findIndex((x) => x.stage_number === n && !x.is_gc);
                if (idx >= 0) setEtappeIdx(idx);
              }}
              onSelectGc={() => {
                const idx = stages.findIndex((x) => x.is_gc);
                if (idx >= 0) setEtappeIdx(idx);
              }}
              gcSelected={selectedEtappe?.is_gc === true}
              title="TUSSENSTAND SELECTEREN"
              subtitle={subpouleName}
              rangeLabel={
                selectedEtappe
                  ? `T/m rit ${selectedEtappe.stage_number}${selectedEtappe.name ? ` — ${selectedEtappe.name}` : ""}`
                  : "Kies een rit"
              }
            />
          </div>
        );
      })()}

      {/* Cumulative standings up to the selected stage */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

        <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
            {subpouleName}
          </h2>
          {selectedEtappe && (
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              T/m rit {selectedEtappe.stage_number}
              {selectedEtappe.name ? ` — ${selectedEtappe.name}` : ""}
            </span>
          )}
        </div>

        {/* Eenmalige hint op mobiel: hele rij = vergelijken */}
        {showTapHint && (
          <div className="md:hidden px-3 py-1.5 border-b border-border bg-secondary/30 text-[10px] text-muted-foreground font-sans italic flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeftRight className="w-3 h-3 shrink-0" />
              Tik op een speler om te vergelijken
            </span>
            <button
              onClick={dismissTapHint}
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground px-1"
              aria-label="Hint sluiten"
            >
              ×
            </button>
          </div>
        )}

        {/* Column headers */}
        <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 border-b border-border bg-secondary/40">
          <div className="shrink-0 w-9" />
          <div className="flex-1 min-w-0 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-muted-foreground">Naam</div>
          {stages.length > 0 && (
            <div className="hidden md:block shrink-0 w-8 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-muted-foreground text-center">Rit</div>
          )}
          <div className="shrink-0 min-w-[2.5rem] md:min-w-[3rem] text-right text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-muted-foreground">Pts</div>
          <div className="shrink-0 min-w-[48px] md:min-w-[64px] text-right text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-muted-foreground" title="Punten in de geselecteerde rit">Dag</div>
          {/* Spacer matcht de vaste-breedte compare-slot op de rijen. */}
          <div className="shrink-0 w-5 md:w-[104px]" />
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {memberRows.map((m) => {
            const isMe = m.user_id === user?.id;
            const isComparing = m.user_id === compareId;
            const canCompare = !isMe && !!m.entry_id;

            const rankNumCls =
              m.rank === 1 ? "text-amber-400"
              : m.rank === 2 ? "text-zinc-400"
              : m.rank === 3 ? "text-orange-400"
              : "text-muted-foreground/40";

            const rowAccentCls =
              m.rank === 1 ? "border-l-[3px] border-amber-400/70 bg-amber-500/[0.04]"
              : m.rank === 2 ? "border-l-[3px] border-zinc-400/50 bg-zinc-500/[0.03]"
              : m.rank === 3 ? "border-l-[3px] border-orange-400/50 bg-orange-500/[0.03]"
              : "border-l-[3px] border-transparent";

            const stageBadgeCls =
              m.stage_rank == null ? null
              : m.stage_rank === 1 ? "bg-amber-500/15 border-amber-400/50 text-amber-500"
              : m.stage_rank <= 3 ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : m.stage_rank <= 5 ? "bg-sky-500/15 border-sky-400/30 text-sky-400"
              : "bg-secondary/80 border-border text-muted-foreground/60";

            // Dag-cell krijgt mobiel een gekleurde tint op basis van stage_rank
            // (vervangt de aparte Rit-badge op kleine schermen).
            const dagPtsColorCls =
              m.stage_rank == null ? ""
              : m.stage_rank === 1 ? "text-amber-500"
              : m.stage_rank <= 3 ? "text-emerald-500"
              : m.stage_rank <= 5 ? "text-sky-500"
              : "";

            const handleRowToggle = () => {
              if (!canCompare) return;
              setCompareId(isComparing ? null : m.user_id);
              if (showTapHint) dismissTapHint();
            };

            return (
              <div
                key={m.user_id}
                role={canCompare ? "button" : undefined}
                tabIndex={canCompare ? 0 : undefined}
                aria-pressed={canCompare ? isComparing : undefined}
                aria-label={canCompare ? `Vergelijk met ${m.team_name ?? m.display_name ?? "speler"}` : undefined}
                onClick={canCompare ? handleRowToggle : undefined}
                onKeyDown={canCompare ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowToggle();
                  }
                } : undefined}
                className={cn(
                  "group flex items-center gap-2 md:gap-3 px-3 border-b border-border/40 transition-all duration-120 select-none",
                  rowAccentCls,
                  isMe && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30",
                  isComparing && "bg-accent/15 ring-1 ring-inset ring-accent/50",
                  canCompare && "cursor-pointer hover:bg-accent/10 active:bg-accent/20 active:scale-[0.997] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                )}
                style={{ minHeight: "44px" }}
              >
                <div className={cn(
                  "shrink-0 w-9 font-display font-black tabular-nums leading-none text-center flex flex-col items-center justify-center",
                  rankNumCls,
                )}>
                  <span className={cn(m.rank <= 3 ? "text-2xl" : "text-sm")}>{m.rank}</span>
                  {m.delta != null && m.delta !== 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center text-[9px] font-bold tabular-nums leading-none mt-0.5",
                        m.delta > 0 ? "text-emerald-500" : "text-rose-500",
                      )}
                      title={`${m.delta > 0 ? "Gestegen" : "Gedaald"} ${Math.abs(m.delta)} plek t.o.v. vorige rit`}
                    >
                      {m.delta > 0 ? <ArrowUp className="w-2 h-2" /> : <ArrowDown className="w-2 h-2" />}
                      {Math.abs(m.delta)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={cn(
                    "font-sans text-sm truncate",
                    isMe ? "font-bold text-primary" : m.rank <= 3 ? "font-semibold" : "font-medium",
                  )}>
                    {m.team_name ?? m.display_name ?? "—"}
                  </span>
                  {isMe && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                      jij
                    </span>
                  )}
                  {isComparing && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-accent/30 text-accent-foreground border border-accent/60 rounded px-1 py-px leading-4">
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      vs jij
                    </span>
                  )}
                  {!m.entry_id && (
                    <Badge variant="secondary" className="text-xs shrink-0">geen team</Badge>
                  )}
                </div>

                {/* Rit-badge: alleen desktop */}
                {stageBadgeCls && (
                  <div className={cn(
                    "hidden md:inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5",
                    stageBadgeCls,
                  )}>
                    <Flag className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-bold tabular-nums">#{m.stage_rank}</span>
                  </div>
                )}

                <div className="shrink-0 text-right min-w-[2.5rem] md:min-w-[3rem]">
                  <div>
                    <span className={cn(
                      "font-display font-bold tabular-nums",
                      m.rank === 1 ? "text-lg md:text-xl text-amber-500" : "text-base",
                    )}>
                      {m.total_points}
                    </span>
                    <span className="hidden md:inline text-[9px] text-muted-foreground font-mono ml-0.5">pt</span>
                  </div>
                  {m.pred_bonus > 0 && (
                    <div className="text-[9px] text-emerald-600 font-mono leading-none mt-0.5" title="Bonus uit eindklassement-/truivoorspellingen">
                      +{m.pred_bonus} vk
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right min-w-[48px] md:min-w-[64px]" title="Punten in deze rit">
                  {m.stage_points > 0 ? (
                    <>
                      <span className={cn(
                        "font-display font-bold tabular-nums text-base",
                        // Mobiel: kleur volgt stage_rank-tier (vervangt de losse Rit-badge).
                        // Desktop: alleen #1 amber, anders neutraal foreground.
                        dagPtsColorCls,
                        m.stage_rank === 1 ? "md:text-amber-500" : "md:text-foreground",
                      )}>
                        +{m.stage_points}
                      </span>

                      <span className="hidden md:inline text-[9px] text-muted-foreground font-mono ml-0.5">pt</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/40 text-sm">–</span>
                  )}
                </div>

                {/* Benchmark-affordance in een vaste-breedte slot dat op ÉLKE
                    rij gereserveerd is (ook eigen rij / "geen team"), zodat de
                    PTS/DAG-kolommen strak onder elkaar uitlijnen.
                    Desktop: "⚔ Vergelijk"-pill die bij hover binnenschuift.
                    Mobiel: subtiel zwaard-icoon. */}
                <div className="shrink-0 flex items-center justify-end w-5 md:w-[104px]">
                  {canCompare && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCompareId(isComparing ? null : m.user_id); }}
                        className={cn(
                          "hidden md:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                          "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                          "transition-all duration-150",
                          isComparing
                            ? "opacity-100 translate-x-0 bg-primary/10 border-primary text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                            : "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 border-border bg-card hover:bg-accent/20 text-muted-foreground",
                        )}
                        aria-label={isComparing ? "Vergelijking sluiten" : `Benchmark tegen ${m.team_name ?? m.display_name ?? "dit team"}`}
                        title={isComparing ? "Vergelijking sluiten" : "Benchmark jouw ploeg tegen dit team"}
                      >
                        <Swords className="h-3 w-3" strokeWidth={isComparing ? 2.5 : 2} />
                        {isComparing ? "Sluit" : "Vergelijk"}
                      </button>
                      <span
                        aria-hidden
                        className={cn(
                          "md:hidden inline-flex",
                          isComparing
                            ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
                            : "text-muted-foreground/40",
                        )}
                      >
                        <Swords className="h-3.5 w-3.5" strokeWidth={isComparing ? 2.5 : 2} />
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Head-to-head comparison */}
      {compareMember && ["live", "locked", "finished", "closed"].includes(String(game?.status ?? "")) && (
        <div ref={compareRef} style={{ scrollMarginTop: 12 }}>
          <TeamComparison
            opponentUserId={compareMember.user_id}
            opponentName={compareMember.display_name}
            subpouleId={subpouleId}
            gameId={game?.id}
          />
        </div>
      )}

      {/* Cumulative evolution chart — alleen als de parent 'm niet zelf rendert. */}
      {showEvolution && <SubpouleEvolutionChart subpouleId={subpouleId} gameId={game?.id} />}
    </div>
  );
}
