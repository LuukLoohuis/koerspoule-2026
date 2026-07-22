import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useJokerMultiplier } from "@/hooks/useJokerMultiplier";
import { useStages, useStageResults, useStagePointsForEntries, useMyStageRanks, useEntries, useGameStandings, type StageRow, type EntryStanding } from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, User, Users, Mountain, Activity, Clock, MapPin, ArrowUp, ArrowDown, Minus, Calendar, Route, Lock, Flag, ClipboardList, Search } from "lucide-react";
import ResultsUpdatedBadge from "@/components/ResultsUpdatedBadge";
import TruiBadge from "@/components/retro/TruiBadge";
import Podium from "@/components/Podium";
import StageBar from "@/components/stages/StageBar";
import FloatingTabSwitcher from "@/components/FloatingTabSwitcher";
import SwipeCarousel from "@/components/SwipeCarousel";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import SwipeDots from "@/components/SwipeDots";
import SwipeHintBar from "@/components/SwipeHintBar";
import { RetroTabs } from "@/components/RetroTabs";
import { buildStageBarData } from "@/components/stages/stageBarData";

const stageTypeMeta = (t: TFunction): Record<string, { label: string; color: string; icon: JSX.Element }> => ({
  vlak: { label: t("results.stageType.vlak"), color: "bg-emerald-500", icon: <Activity className="w-4 h-4" /> },
  heuvelachtig: { label: t("results.stageType.heuvelachtig"), color: "bg-amber-500", icon: <Mountain className="w-4 h-4" /> },
  bergop: { label: t("results.stageType.bergop"), color: "bg-rose-600", icon: <Mountain className="w-4 h-4" /> },
  tijdrit: { label: t("results.stageType.tijdrit"), color: "bg-sky-500", icon: <Clock className="w-4 h-4" /> },
  ploegentijdrit: { label: t("results.stageType.ploegentijdrit"), color: "bg-violet-500", icon: <Clock className="w-4 h-4" /> },
});

function rankBadge(rank: number) {
  const cls =
    rank === 1
      ? "bg-yellow-500 text-yellow-950"
      : rank === 2
      ? "bg-zinc-300 text-zinc-900"
      : rank === 3
      ? "bg-orange-400 text-orange-950"
      : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums", cls)}>
      {rank}
    </span>
  );
}

/** Skeleton-rijen tijdens het laden van een klassement/uitslag-lijst. */
function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-4 w-32" style={{ width: `${110 - (i % 4) * 18}px` }} />
          </div>
          <Skeleton className="h-4 w-9" />
        </div>
      ))}
    </div>
  );
}

type ResultsViewProps = {
  showHeader?: boolean;
  /** Optioneel: toon een specifieke (bv. afgeronde) game i.p.v. de live game. */
  gameId?: string;
  gameName?: string | null;
  /** Deep-link: open op deze view (Etappes/Klassement). */
  initialView?: "etappes" | "klassement";
  /** Deep-link: selecteer dit ritnummer in de Etappe-view. */
  initialStageNumber?: number | null;
};

export default function ResultsView({ showHeader = true, gameId: gameIdProp, gameName: gameNameProp, initialView, initialStageNumber }: ResultsViewProps) {
  const { t, i18n } = useTranslation();
  const STAGE_TYPE_META = useMemo(() => stageTypeMeta(t), [t]);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: curGame } = useCurrentGame();
  const gameId = gameIdProp ?? curGame?.id;
  const gameName = gameNameProp ?? curGame?.name;

  const { data: stages = [], isLoading: stagesLoading } = useStages(gameId);
  const { data: entries = [] } = useEntries(gameId);
  const { data: schema = [] } = usePointsSchema(gameId);

  // My entry in this game
  const myEntry = useMemo(
    () => entries.find((e) => e.user_id === user?.id),
    [entries, user?.id]
  );
  const myEntryIds = useMemo(() => (myEntry ? [myEntry.id] : []), [myEntry]);

  // Alleen mijn eigen stage_points + mijn dagklassering server-side (schaalt).
  const { data: myStageRows = [] } = useStagePointsForEntries(gameId, myEntryIds);
  const { data: myRankPerStage = new Map<string, number>() } = useMyStageRanks(gameId, user?.id);

  // Eerste relevante etappe = laatste goedgekeurde (niet-GC) rit (geen fetch nodig).
  const initialStageIdx = useMemo(() => {
    let idx = 0;
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].results_status === "approved" && !stages[i].is_gc) { idx = i; break; }
    }
    return idx;
  }, [stages]);

  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);
  useEffect(() => {
    if (stages.length > 0) setSelectedStageIdx(initialStageIdx);
  }, [stages.length, initialStageIdx]);

  // Welke view (Etappes/Klassement) — controlled zodat deep-links 'm sturen.
  const [view, setView] = useState<"etappes" | "klassement">(initialView ?? "klassement");
  // Deep-link: spring naar Etappe-view + het juiste ritnummer wanneer de
  // parent dat doorgeeft (bv. klik op "Beste etappe" in het dashboard).
  useEffect(() => {
    if (initialView) setView(initialView);
    if (initialStageNumber != null && stages.length > 0) {
      const idx = stages.findIndex((s) => s.stage_number === initialStageNumber && !s.is_gc);
      if (idx >= 0) setSelectedStageIdx(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView, initialStageNumber, stages.length]);

  // Mobiel: swipe tussen Klassement/Etappes (de zwevende pill staat onderaan).
  const hint = useSwipeHint("uitslagen");
  const barVisible = useAutoHideOnScroll();

  const selectedStage = stages[selectedStageIdx];
  const { data: results = [], isLoading: resultsLoading } = useStageResults(selectedStage?.id);

  // Mijn punten voor de geselecteerde rit
  const myStagePoints = useMemo(() => {
    if (!myEntry || !selectedStage) return 0;
    return myStageRows
      .filter((sp) => sp.stage_id === selectedStage.id)
      .reduce((s, r) => s + r.points, 0);
  }, [myEntry, selectedStage, myStageRows]);

  // Mijn punten per etappe (StageBars)
  const myPointsPerStage = useMemo(() => {
    const m = new Map<string, number>();
    myStageRows.forEach((sp) => m.set(sp.stage_id, (m.get(sp.stage_id) ?? 0) + sp.points));
    return m;
  }, [myStageRows]);

  // Etappe-uitslag (alle teams) van de geselecteerde rit — server-side.
  const { data: stageStandingsRows = [] } = useGameStandings(gameId, selectedStage?.stage_number, false);
  const stageStandings = useMemo(() => {
    return [...stageStandingsRows]
      .map((r) => ({
        id: r.entry_id,
        user_id: r.user_id,
        team_name: r.team_name,
        display_name: r.display_name,
        stagePts: r.stage_points,
      }))
      .sort((a, b) => b.stagePts - a.stagePts)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [stageStandingsRows]);

  // Klassement (cumulatief t/m geselecteerde rit) — server-side.
  const [klassementStageIdx, setKlassementStageIdx] = useState<number>(0);
  useEffect(() => {
    if (stages.length > 0) setKlassementStageIdx(initialStageIdx);
  }, [stages.length, initialStageIdx]);

  const klassementStage = stages[klassementStageIdx];
  // GC-/truivoorspellings-bonus telt alleen mee in de GC-eindstand, niet bij de
  // tussenstand per etappe. Dus alleen tonen wanneer de GC-rit geselecteerd is.
  const isGcKlassement = klassementStage?.is_gc === true;

  const { data: serverStandings = [] } = useGameStandings(gameId, klassementStage?.stage_number, false);

  const overallStandings = useMemo(() => {
    const mapped = serverStandings.map((r) => ({
      id: r.entry_id,
      user_id: r.user_id,
      team_name: r.team_name,
      display_name: r.display_name,
      total_points: isGcKlassement ? r.total : r.cum_points,
      predBonus: isGcKlassement ? r.pred_bonus : 0,
      cumPts: isGcKlassement ? r.total : r.cum_points,
      rank: r.rank,
      delta: r.delta,
    }));
    // De RPC rangschikt ALTIJD op (cum_points + GC-voorspelbonus). In een niet-GC-
    // tussenstand mag die bonus niet meetellen (zie comment hierboven), anders
    // staat een team met veel bonus maar weinig etappepunten te hoog. Her-
    // rangschik daarom op de getoonde punten en herbereken de rang (ties gelijk).
    if (isGcKlassement) return mapped;
    const sorted = [...mapped].sort((a, b) => b.total_points - a.total_points);
    let lastPts: number | null = null;
    let lastRank = 0;
    sorted.forEach((row, i) => {
      if (lastPts === null || row.total_points < lastPts) { lastRank = i + 1; lastPts = row.total_points; }
      row.rank = lastRank;
    });
    return sorted;
  }, [serverStandings, isGcKlassement]);

  // Dagklassering per team voor de geselecteerde klassement-rit (uit de RPC).
  const klassementStageStandings = useMemo(() => {
    const m = new Map<string, number>();
    serverStandings.forEach((r) => { if (r.stage_rank != null) m.set(r.entry_id, r.stage_rank); });
    return m;
  }, [serverStandings]);

  // Stage points lookup for schema
  const stagePtsTable = useMemo(() => {
    const m = new Map<number, number>();
    schema.filter((s) => s.classification === "stage").forEach((s) => m.set(s.position, s.points));
    return m;
  }, [schema]);

  // Riders in my team scoring this stage
  const myEntryRiders = useMyEntryRiders(myEntry?.id, gameId);
  const myStageScorers = useMemo(() => {
    if (!myEntryRiders) return [];
    const myIds = new Set(myEntryRiders.map((r) => r.id));
    return results
      .filter((r) => r.finish_position != null && myIds.has(r.rider_id))
      .map((r) => ({
        rider_id: r.rider_id,
        name: r.riders?.name ?? r.rider_name ?? "—",
        position: r.finish_position!,
        is_joker: myEntryRiders.find((mr) => mr.id === r.rider_id)?.is_joker ?? false,
      }))
      .sort((a, b) => a.position - b.position);
  }, [myEntryRiders, results]);

  // Joker-multiplier van DEZE game (kan afwijken van de default; de admin stelt
  // 'm in het Berekening-tab in). Deze per-renner-weergave moet dezelfde waarde
  // gebruiken i.p.v. een hardcoded ×2, anders staan joker-punten dubbel.
  const jokerMult = useJokerMultiplier(gameId);

  // Render

  if (!gameId && !stagesLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground italic">{t("results.view.noActiveRace")}</p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="relative mb-5 md:mb-6">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="overline-stamp">— Bulletin Officiel —</span>
            <h1 className="heading-oswald text-4xl md:text-5xl">{t("results.view.headerTitle")}</h1>
            {gameName && (
              <p className="text-muted-foreground font-serif italic">{gameName}</p>
            )}
            <div className="mt-2 flex justify-center">
              <ResultsUpdatedBadge gameId={gameId} />
            </div>
          </div>
          <div className="double-rule mt-3 mx-auto max-w-md" />
        </div>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as "etappes" | "klassement")} className="max-w-7xl mx-auto">
        {/* Desktop — retro dossard-tabbalk */}
        <RetroTabs
          className="hidden md:flex"
          aria-label={t("results.view.tabsAriaLabel")}
          active={view}
          onChange={(v) => setView(v as "etappes" | "klassement")}
          tabs={[
            { key: "klassement", label: t("results.view.klassementTab"), Icon: Trophy },
            { key: "etappes",    label: t("results.view.etappesTab"),    Icon: ClipboardList },
          ]}
        />
        {/* Mobiel — bestaande swipe/auto-hide tabbalk (ongewijzigd). */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-md:max-h-[120px]",
            !barVisible && "max-md:!max-h-0 max-md:opacity-0",
          )}
        >
        {/* Tabbalk staat stil; de carrousel-content volgt de vinger. */}
        <TabsList className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 h-auto w-full">
          <TabsTrigger
            value="klassement"
            className="flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex-1 text-muted-foreground hover:text-foreground hover:bg-secondary/60 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-foreground/10"
          >
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            <span>{t("results.view.klassementTab")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="etappes"
            className="flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex-1 text-muted-foreground hover:text-foreground hover:bg-secondary/60 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-foreground/10"
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            <span>{t("results.view.etappesTab")}</span>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Swipe-hint + stippen-indicator (mobiel). */}
        <SwipeHintBar visible={hint.visible} onClose={hint.dismiss} className="mx-auto w-fit mt-2" />
        <SwipeDots count={2} activeIndex={view === "klassement" ? 0 : 1} activeLabel={view === "klassement" ? t("results.view.klassementTab") : t("results.view.etappesTab")} />

        {/* Vinger-volgende carrousel: alleen het content-vlak beweegt. */}
        <SwipeCarousel
          keys={["klassement", "etappes"]}
          activeKey={view}
          onChange={(k) => setView(k as "etappes" | "klassement")}
          onSwiped={hint.dismiss}
          renderTab={(k) => (
            <>
        {/* ── ETAPPES TAB ── */}
        {k === "etappes" && (<>
          {stagesLoading ? (
            <p className="text-center text-muted-foreground py-8">{t("results.view.stagesLoading")}</p>
          ) : stages.length === 0 ? (
            <EmptyState message={t("results.view.noStages")} />
          ) : (
            <>
              {/* Premium vertical bar visualizer — StageBar (PNG-asset variant) */}
              {(() => {
                const { data, gcTotal, selectedNumber } = buildStageBarData(
                  stages,
                  myPointsPerStage,
                  selectedStage?.id,
                  myEntry?.total_points,
                );
                return (
                  <div className="mt-2 mb-2">
                    <StageBar
                      stages={data}
                      gcTotal={gcTotal}
                      selectedStage={selectedNumber}
                      onSelectStage={(n) => {
                        const idx = stages.findIndex((x) => x.stage_number === n && !x.is_gc);
                        if (idx >= 0) setSelectedStageIdx(idx);
                      }}
                      onSelectGc={() => {
                        const idx = stages.findIndex((x) => x.is_gc);
                        if (idx >= 0) setSelectedStageIdx(idx);
                      }}
                      gcSelected={selectedStage?.is_gc === true}
                      title={t("results.view.stageBarTitle")}
                      subtitle={gameName ? t("results.view.stageBarSubtitleGame", { game: gameName }) : t("results.view.etappesTab")}
                      rangeLabel={
                        selectedStage
                          ? `${t("results.view.stageLabel", { number: selectedStage.stage_number })}${selectedStage.name ? ` — ${selectedStage.name}` : ""}`
                          : t("results.view.stageCount", { count: stages.filter((s) => !s.is_gc).length })
                      }
                    />
                  </div>
                );
              })()}

              {/* Selected stage info */}
              {selectedStage && !selectedStage.is_gc && (
                <div className="mb-4 retro-border bg-secondary/30 p-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-white",
                      STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.color
                    )}>
                      {STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.icon}
                    </div>
                    <div>
                      <span className="font-display font-bold">{t("results.view.stageLabel", { number: selectedStage.stage_number })}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {STAGE_TYPE_META[selectedStage.stage_type ?? "vlak"]?.label}
                      </span>
                    </div>
                  </div>
                  {selectedStage.name && (
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{selectedStage.name}
                    </span>
                  )}
                  {selectedStage.distance_km != null && (
                    <span className="font-sans flex items-center gap-1 font-bold">
                      <Route className="w-3.5 h-3.5" />{selectedStage.distance_km} km
                    </span>
                  )}
                  {selectedStage.date && (
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selectedStage.date).toLocaleDateString(i18n.language === "en" ? "en-GB" : "nl-NL", { weekday: "short", day: "numeric", month: "long" })}
                    </span>
                  )}
                </div>
              )}

              {selectedStage?.is_gc && (
                <div className="mb-4 retro-border bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 p-4 flex flex-wrap items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display text-base font-bold">{t("results.view.gcBannerTitle")}</div>
                    <div className="text-xs text-muted-foreground">{t("results.view.gcBannerSubtitle")}</div>
                  </div>
                </div>
              )}

              {selectedStage?.is_gc ? (
                <GcDetail stages={stages} myEntry={myEntry} t={t} />
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Kolom 1: Koerspoule-uitslag van de rit (eerst tonen) */}
                <div className="retro-border bg-card h-fit">
                  <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                    <h2 className="font-display text-base font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {t("results.view.stageStandingsTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("results.view.participantCount", { count: entries.length })}
                    </p>
                  </div>
                  {stageStandings.length === 0 ? (
                    <div className="p-8 flex flex-col items-center text-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-secondary border-2 border-foreground/15 flex items-center justify-center">
                        <Flag className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        {t("results.view.stageStandingsEmpty")}
                      </p>
                    </div>
                  ) : (
                    <StandingsList
                      topN={isMobile ? 5 : 10}
                      maxHeightClass={isMobile ? "max-h-[460px]" : "max-h-[620px]"}
                      placeholder={t("results.view.searchPlaceholder")}
                      items={stageStandings.map((s) => {
                        const isMe = s.user_id === user?.id;
                        return {
                          key: s.id,
                          rank: s.rank,
                          isMe,
                          searchText: `${s.team_name ?? ""} ${s.display_name ?? ""}`,
                          node: (
                          <div
                            className={cn(
                              "flex items-center justify-between px-3 py-2 text-sm border-b border-border/40",
                              isMe && "bg-primary/10"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {rankBadge(s.rank)}
                              <span className={cn("font-sans truncate", isMe && "font-bold text-primary")}>
                                {s.team_name ?? s.display_name ?? "—"}
                              </span>
                            </div>
                            <span className="font-bold text-xs">{t("results.view.points", { count: s.stagePts })}</span>
                          </div>
                          ),
                        };
                      })}
                    />
                  )}
                </div>

                {/* Kolom 2: Jouw team in deze rit */}
                <div className="retro-border bg-card h-fit">
                  <div className="p-4 border-b-2 border-foreground bg-primary/10">
                    <h2 className="font-display text-base font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t("results.view.yourTeam")}</span>
                      <span className="font-display text-xl text-primary">{t("results.view.points", { count: myStagePoints })}</span>
                    </h2>
                  </div>
                  {!myEntry ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t("results.view.noTeamSubmitted")}
                    </div>
                  ) : myStageScorers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t("results.view.noRidersScored")}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {myStageScorers.map((r) => {
                        const basePts = stagePtsTable.get(r.position) ?? 0;
                        const finalPts = r.is_joker ? basePts * jokerMult : basePts;
                        return (
                          <div key={r.rider_id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground tabular-nums">
                                {r.position}
                              </span>
                              <span className="font-sans font-medium truncate">{r.name}</span>
                              {r.is_joker && (
                                <span className="text-[9px] uppercase font-bold text-accent">{t("results.view.joker")}</span>
                              )}
                            </div>
                            <span className="font-bold text-primary text-sm">{t("results.view.points", { count: finalPts })}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Kolom 3: Echte etappe-uitslag (wielrennen) — als laatste */}
                <div className="retro-border bg-card">
                  <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                    <h2 className="font-display text-base font-bold flex items-center gap-2">
                      <Medal className="h-5 w-5 text-accent" />
                      {t("results.view.stageResultTitle")}
                    </h2>
                  </div>
                  {resultsLoading ? (
                    <RowsSkeleton rows={6} />
                  ) : results.filter((r) => r.finish_position != null).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground italic text-center">
                      {t("results.view.stageResultEmpty")}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {results
                        .filter((r) => r.finish_position != null)
                        .sort((a, b) => (a.finish_position ?? 999) - (b.finish_position ?? 999))
                        .slice(0, 20)
                        .map((r) => {
                          const inMyTeam = myEntryRiders?.some((mr) => mr.id === r.rider_id);
                          const pts = stagePtsTable.get(r.finish_position!) ?? 0;
                          return (
                            <div
                              key={r.id}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 text-sm",
                                inMyTeam && "ring-1 ring-inset ring-primary/30 bg-primary/5"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {rankBadge(r.finish_position!)}
                                <span className={cn("font-sans font-medium text-sm truncate text-slate-800", inMyTeam && "text-primary")}>
                                  {r.riders?.name ?? r.rider_name ?? "—"}
                                </span>
                              </div>
                              <span className="font-bold text-accent text-xs whitespace-nowrap">{t("results.view.points", { count: pts })}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
              )}
            </>
          )}
        </>)}

        {/* ── KLASSEMENT TAB ── */}
        {k === "klassement" && (<>
          {/* Premium vertical bar selector — StageBar (PNG-asset variant) */}
          {stages.length > 0 && (() => {
            const { data, gcTotal, selectedNumber } = buildStageBarData(
              stages,
              myPointsPerStage,
              klassementStage?.id,
              myEntry?.total_points,
            );
            return (
              <div className="mt-2 mb-2">
                <StageBar
                  stages={data}
                  gcTotal={gcTotal}
                  selectedStage={selectedNumber}
                  onSelectStage={(n) => {
                    const idx = stages.findIndex((x) => x.stage_number === n && !x.is_gc);
                    if (idx >= 0) setKlassementStageIdx(idx);
                  }}
                  onSelectGc={() => {
                    const idx = stages.findIndex((x) => x.is_gc);
                    if (idx >= 0) setKlassementStageIdx(idx);
                  }}
                  gcSelected={klassementStage?.is_gc === true}
                  title={t("results.view.klassementBarTitle")}
                  subtitle={t("results.view.stageBarSubtitleGame", { game: gameName ?? t("results.view.raceFallback") })}
                  rangeLabel={
                    klassementStage
                      ? `${t("results.view.untilStageLabel", { number: klassementStage.stage_number })}${klassementStage.name ? ` — ${klassementStage.name}` : ""}`
                      : t("results.view.chooseStage")
                  }
                />
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pool overall standings */}
            <div className="retro-border bg-card">
              <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
              <div className="sticky top-0 z-20 p-4 border-b-2 border-foreground bg-secondary backdrop-blur-sm flex items-center justify-between">
                <h2 className="heading-oswald text-xl flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
                  {t("results.view.overallStandingsTitle")}
                </h2>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {t("results.view.participantCount", { count: overallStandings.length })}
                </span>
              </div>
              {overallStandings.length === 0 ? (
                <div className="p-8 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-secondary border-2 border-foreground/15 flex items-center justify-center">
                    <Trophy className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">{t("results.view.emptyStandingsTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 max-w-xs">
                      {user
                        ? t("results.view.emptyStandingsUser")
                        : t("results.view.emptyStandingsGuest")}
                    </p>
                  </div>
                  <Link
                    to={user ? "/team-samenstellen" : "/login"}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all"
                  >
                    {user ? t("results.view.ctaBuildTeam") : t("results.view.ctaJoinFree")}
                  </Link>
                </div>
              ) : (
                <>
                <Podium
                  entries={overallStandings.slice(0, 3).map((s) => ({
                    rank: s.rank,
                    name: s.team_name?.trim() || s.display_name || "—",
                    points: s.cumPts,
                    isMe: s.user_id === user?.id,
                  }))}
                />
                <StandingsList
                  maxHeightClass="max-h-[600px]"
                  placeholder={t("results.view.searchPlaceholder")}
                  emptyMessage={t("results.view.noSubmittedTeams")}
                  items={overallStandings.map((s) => {
                    const isMe = s.user_id === user?.id;
                    const dagRank = klassementStageStandings.get(s.id);

                    const rankNumCls =
                      s.rank === 1 ? "text-amber-400"
                      : s.rank === 2 ? "text-zinc-400"
                      : s.rank === 3 ? "text-orange-400"
                      : "text-muted-foreground/40";

                    const rowAccentCls =
                      s.rank === 1 ? "border-l-[3px] border-amber-400/70 bg-amber-500/[0.04]"
                      : s.rank === 2 ? "border-l-[3px] border-zinc-400/50 bg-zinc-500/[0.03]"
                      : s.rank === 3 ? "border-l-[3px] border-orange-400/50 bg-orange-500/[0.03]"
                      : "border-l-[3px] border-transparent";

                    const dagBadgeCls =
                      dagRank == null ? null
                      : dagRank === 1 ? "bg-amber-500/15 border-amber-400/50 text-amber-500"
                      : dagRank <= 3 ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : dagRank <= 5 ? "bg-sky-500/15 border-sky-400/30 text-sky-400"
                      : "bg-secondary/80 border-border text-muted-foreground/60";

                    return {
                      key: s.id,
                      rank: s.rank,
                      isMe,
                      searchText: `${s.team_name ?? ""} ${s.display_name ?? ""}`,
                      node: (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 border-b border-border/40 transition-colors",
                          rowAccentCls,
                          isMe && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30"
                        )}
                      >
                        {/* Rank number — Oswald, klassementbord-stijl */}
                        <div className={cn(
                          "shrink-0 font-oswald font-bold tabular-nums leading-none text-center",
                          s.rank <= 3 ? "text-2xl w-9" : "text-sm w-7",
                          rankNumCls
                        )}>
                          {s.rank}
                        </div>

                        {/* Name + delta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {s.rank === 1 && (
                              <TruiBadge type="algemeen" formaat="klein" className="shrink-0" />
                            )}
                            <span className={cn(
                              "font-sans text-sm truncate",
                              isMe ? "font-bold text-primary" : s.rank <= 3 ? "font-semibold" : "font-medium"
                            )}>
                              {s.team_name ?? s.display_name ?? "—"}
                            </span>
                            {isMe && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                                {t("results.view.youBadge")}
                              </span>
                            )}
                          </div>
                          {klassementStageIdx > 0 && s.delta !== 0 && (
                            <div className={cn(
                              "flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 leading-none",
                              s.delta > 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {s.delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                              {Math.abs(s.delta)}
                            </div>
                          )}
                        </div>

                        {/* Daily stage position badge — verborgen op smalle schermen */}
                        {dagRank != null && dagBadgeCls && (
                          <div className={cn(
                            "shrink-0 hidden min-[380px]:inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                            dagBadgeCls
                          )}>
                            <Flag className="w-2.5 h-2.5 shrink-0" />
                            <span className="text-[10px] font-bold tabular-nums">#{dagRank}</span>
                          </div>
                        )}

                        {/* Total points (incl. eventuele voorspellingsbonus) */}
                        <div className="shrink-0 text-right min-w-[3rem]">
                          <div>
                            <span className={cn(
                              "font-display font-bold tabular-nums",
                              s.rank === 1 ? "text-xl text-amber-500" : "text-base"
                            )}>
                              {s.cumPts}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono ml-0.5">{t("results.view.ptUnit")}</span>
                          </div>
                          {s.predBonus > 0 && (
                            <div className="text-[9px] text-emerald-600 font-mono leading-none mt-0.5" title={t("results.view.predBonusTitle")}>
                              {t("results.view.predBonus", { count: s.predBonus })}
                            </div>
                          )}
                        </div>
                      </div>
                      ),
                    };
                  })}
                />
                </>
              )}
            </div>

            {/* Race classifications (4 jerseys) */}
            <RaceClassifications stageId={klassementStage?.id} />
          </div>
        </>)}
            </>
          )}
        />
      </Tabs>

      {/* Mobiel: tweedelig pill-toggle Klassement/Etappes (één tik wisselt). */}
      <FloatingTabSwitcher
        tabs={[
          { key: "klassement", label: "Klassement", icon: Trophy },
          { key: "etappes",    label: "Etappes",    icon: ClipboardList },
        ]}
        active={view}
        onChange={(k) => setView(k as "etappes" | "klassement")}
      />
    </div>
  );
}

/* ── Helper components / hooks ── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 px-5">
      <p className="text-muted-foreground italic">{message}</p>
    </div>
  );
}

/**
 * Herbruikbare scrollbare standenlijst met zoekbalk en "jouw rij"-pin.
 * - Zoekbalk filtert op `searchText` (teamnaam + naam).
 * - Zonder zoekterm: top N + (als je buiten top N staat) jouw rij vlak eronder,
 *   daarna de volledige lijst (scrollen).
 * - Elke rij wordt door de caller voorgerenderd als `node`.
 */
type StandingNode = { key: string; rank: number; isMe: boolean; searchText: string; node: React.ReactNode };

function StandingsList({
  items,
  maxHeightClass = "max-h-[480px]",
  placeholder,
  emptyMessage,
}: {
  items: StandingNode[];
  /** Niet meer gebruikt sinds virtualisatie (top-N + pin vervangen door de
   *  volledige gevirtualiseerde lijst + "Spring naar mijn team"). Blijft optioneel
   *  zodat bestaande call-sites niet breken. */
  topN?: number;
  maxHeightClass?: string;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Virtualiseer de reeds gefilterde/gesorteerde lijst — schaalt naar 2500+ rijen.
  const rendered = useMemo(
    () => (query ? items.filter((i) => i.searchText.toLowerCase().includes(query)) : items),
    [items, query],
  );
  const meIndex = useMemo(() => (query ? -1 : rendered.findIndex((i) => i.isMe)), [rendered, query]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rendered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
    getItemKey: (index) => rendered[index]?.key ?? index,
  });

  return (
    <div>
      {/* Zoekbalk buiten de scrollcontainer (niet mee-virtualiseren) */}
      <div className="p-2 border-b border-border bg-card">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder ?? t("results.list.searchPlaceholderDefault")}
            className="w-full h-10 pl-9 pr-3 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground italic text-center">{emptyMessage ?? t("results.list.emptyDefault")}</div>
      ) : rendered.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground italic text-center">{t("results.list.noMatch", { query: q })}</div>
      ) : (
        <div ref={parentRef} className={cn("overflow-y-auto relative", maxHeightClass)}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((vi) => (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={rowVirtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)` }}
              >
                {rendered[vi.index].node}
              </div>
            ))}
          </div>

          {/* Spring naar mijn team — werkt ook bij 2500+ deelnemers. */}
          {meIndex >= 0 && (
            <button
              type="button"
              onClick={() => rowVirtualizer.scrollToIndex(meIndex, { align: "center" })}
              className="sticky bottom-2 float-right mr-2 inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_hsl(var(--foreground))] hover:brightness-105 z-10"
            >
              <Flag className="h-3.5 w-3.5" /> {t("results.list.jumpToMyTeam")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Get rider IDs in user's entry, marked with joker flag */
function useMyEntryRiders(entryId?: string, gameId?: string) {
  return useQuery({
    queryKey: ["my-entry-riders", entryId],
    enabled: Boolean(entryId && gameId && supabase),
    queryFn: async () => {
      if (!supabase || !entryId) return [];
      const [picksRes, jokersRes] = await Promise.all([
        supabase.from("entry_picks").select("rider_id").eq("entry_id", entryId),
        supabase.from("entry_jokers").select("rider_id").eq("entry_id", entryId),
      ]);
      const jokerIds = new Set((jokersRes.data ?? []).map((j: { rider_id: string }) => j.rider_id));
      const pickIds = (picksRes.data ?? []).map((p: { rider_id: string }) => p.rider_id);
      const allIds = Array.from(new Set([...pickIds, ...jokerIds]));
      return allIds.map((id) => ({ id, is_joker: jokerIds.has(id) }));
    },
  }).data;
}

function RaceClassifications({ stageId }: { stageId: string | undefined }) {
  const { t } = useTranslation();
  const { data: results = [], isLoading } = useStageResults(stageId);

  const buildList = (key: "gc_position" | "points_position" | "mountain_position" | "youth_position") =>
    results
      .filter((r) => r[key] != null)
      .sort((a, b) => (a[key] ?? 999) - (b[key] ?? 999))
      .slice(0, 20);

  const tabs = [
    { id: "gc", label: t("results.classifications.gc"), trui: "algemeen" as const, rows: buildList("gc_position") },
    { id: "points", label: t("results.classifications.points"), trui: "punten" as const, rows: buildList("points_position") },
    { id: "kom", label: t("results.classifications.mountain"), trui: "berg" as const, rows: buildList("mountain_position") },
    { id: "youth", label: t("results.classifications.youth"), trui: "jongeren" as const, rows: buildList("youth_position") },
  ];

  return (
    <div className="retro-border bg-card">
      <div className="sticky top-0 z-20 p-4 border-b-2 border-foreground bg-secondary backdrop-blur-sm">
        <h2 className="heading-oswald text-xl flex items-center gap-2">
          <Medal className="h-5 w-5 text-accent" />
          {t("results.classifications.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("results.classifications.subtitle")}
        </p>
      </div>

      {!stageId ? (
        <div className="p-4 text-sm text-muted-foreground italic text-center">
          {t("results.classifications.selectStage")}
        </div>
      ) : isLoading ? (
        <RowsSkeleton />
      ) : (
        <Tabs defaultValue="gc">
          <TabsList className="flex w-full justify-start gap-1.5 overflow-x-auto no-scrollbar rounded-none border-b border-border/60 bg-secondary/30 p-2 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary/60 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <TruiBadge type={tab.trui} formaat="klein" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              {tab.rows.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground italic text-center">
                  {t(`results.classifications.empty.${tab.id}`)}
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {tab.rows.map((r) => {
                    const pos =
                      tab.id === "gc" ? r.gc_position
                      : tab.id === "points" ? r.points_position
                      : tab.id === "kom" ? r.mountain_position
                      : r.youth_position;
                    return (
                      <div key={r.id} className={cn("flex items-center justify-between px-3 py-2 text-sm", pos === 1 && "maillot-leader-row")}>
                        <div className="flex items-center gap-2 min-w-0">
                          {rankBadge(pos!)}
                          <span className="font-sans truncate">{r.riders?.name ?? r.rider_name ?? "—"}</span>
                          {r.riders?.teams?.name && (
                            <span className="text-xs text-muted-foreground truncate hidden md:inline">· {r.riders.teams.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

/* ── GC detail (Eindklassement weergave) ── */
function GcDetail({
  stages,
  myEntry,
  t,
}: {
  stages: StageRow[];
  myEntry: EntryStanding | undefined;
  t: TFunction;
}) {
  // Eind-truien + GC-top20 komen van de GC-rit, waar de admin de officiële
  // eindklassementen uploadt (zelfde bron als het klassement-tabje met de
  // GC-bar geselecteerd). Val terug op de laatste reguliere rit (21) als er
  // (nog) geen aparte GC-rit met goedgekeurde uitslag is.
  const lastRegularStage = [...stages]
    .filter((s) => !s.is_gc)
    .sort((a, b) => b.stage_number - a.stage_number)[0];
  const stage21Approved = lastRegularStage?.results_status === "approved";
  const gcStage = [...stages]
    .filter((s) => s.is_gc)
    .sort((a, b) => b.stage_number - a.stage_number)[0];
  const gcStageApproved = gcStage?.results_status === "approved";
  const sourceStageId = gcStageApproved
    ? gcStage?.id
    : stage21Approved
    ? lastRegularStage?.id
    : undefined;
  const { data: results = [], isLoading } = useStageResults(sourceStageId);

  // My GC bonus points from prediction points
  const { data: predictionPts = 0 } = useQuery({
    queryKey: ["gc-prediction-points", myEntry?.id],
    enabled: Boolean(myEntry?.id && supabase),
    queryFn: async () => {
      if (!supabase || !myEntry?.id) return 0;
      const { data, error } = await supabase
        .from("entry_prediction_points")
        .select("points")
        .eq("entry_id", myEntry.id);
      if (error) throw error;
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.points ?? 0), 0);
    },
  });

  if (!sourceStageId) {
    return (
      <div className="retro-border bg-card p-6 text-center">
        <Lock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <h3 className="font-display text-lg font-bold mb-1">{t("results.gc.lockedTitle")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("results.gc.lockedNote")}
        </p>
      </div>
    );
  }

  const gcRows = results
    .filter((r) => r.gc_position != null)
    .sort((a, b) => (a.gc_position ?? 999) - (b.gc_position ?? 999))
    .slice(0, 20);

  const jerseyDefs = [
    { key: "points_position" as const, trui: "punten" as const, label: t("results.classifications.points") },
    { key: "mountain_position" as const, trui: "berg" as const, label: t("results.classifications.mountain") },
    { key: "youth_position" as const, trui: "jongeren" as const, label: t("results.classifications.youth") },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* GC top 20 */}
      <div className="retro-border bg-card lg:col-span-1">
        <div className="p-4 border-b-2 border-foreground bg-amber-500/20">
          <h2 className="font-display text-base font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            {t("results.gc.overallTitle")}
          </h2>
        </div>
        {isLoading ? (
          <RowsSkeleton rows={10} />
        ) : gcRows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic text-center">{t("results.gc.overallEmpty")}</div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {gcRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {rankBadge(r.gc_position!)}
                  <span className="font-sans truncate">{r.riders?.name ?? r.rider_name ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jersey winners */}
      <div className="retro-border bg-card lg:col-span-1">
        <div className="p-4 border-b-2 border-foreground bg-secondary/50">
          <h2 className="font-display text-base font-bold flex items-center gap-2">
            <Medal className="h-5 w-5 text-accent" />
            {t("results.gc.jerseyWinnersTitle")}
          </h2>
        </div>
        <div className="p-2.5 space-y-2.5">
          {jerseyDefs.map((j) => {
            const winner = [...results]
              .filter((r) => r[j.key] === 1)
              .map((r) => r.riders?.name ?? r.rider_name)[0];
            return (
              <div key={j.key} className="flex items-center gap-3">
                <TruiBadge type={j.trui} formaat="medium" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{j.label}</div>
                  <div className="font-display font-bold text-sm truncate">{winner ?? "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My GC bonus */}
      <div className="retro-border bg-card lg:col-span-1">
        <div className="p-4 border-b-2 border-foreground bg-primary/10">
          <h2 className="font-display text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t("results.gc.yourBonusTitle")}</span>
            <span className="font-display text-xl text-primary tabular-nums">{t("results.view.points", { count: predictionPts })}</span>
          </h2>
        </div>
        <div className="p-3 text-sm text-muted-foreground space-y-2">
          <p>
            {t("results.gc.bonusExplainPre")}{" "}
            <strong>{t("results.gc.bonusExplainButton")}</strong>{t("results.gc.bonusExplainPost")}
          </p>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>{t("results.gc.bonusPodium")}</li>
            <li>{t("results.gc.bonusJerseys")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
