import { Fragment, useEffect, useMemo, useState, type ComponentType } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Area,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { pointsTable } from "@/data/riders";
import { useCategories } from "@/hooks/useCategories";
import PercentileVerdict from "@/components/horscat/PercentileVerdict";
import AapscoreDistributie from "@/components/horscat/AapscoreDistributie";
import MonkeyExplainerModal from "@/components/horscat/MonkeyExplainerModal";
import EmiratesBenchmark from "@/components/horscat/EmiratesBenchmark";
import { useStages, useGameStandings, useStagePointsForEntries, useStageAverages } from "@/hooks/useResults";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock, Activity, Trophy, BarChart3, Sparkles, Info, X, Swords, Crown, Mic, ChevronDown } from "lucide-react";
import FloatingTabSwitcher from "@/components/FloatingTabSwitcher";
import SwipeCarousel from "@/components/SwipeCarousel";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import SwipeDots from "@/components/SwipeDots";
import SwipeHintBar from "@/components/SwipeHintBar";
import EmptyState from "@/components/EmptyState";
import BenchmarkTab from "@/components/BenchmarkTab";
import { MobielTabBalk } from "@/components/MobielTabBalk";
import { RetroTabs } from "@/components/RetroTabs";
import JerseyBadge from "@/components/retro/JerseyBadge";
import TruiBadge from "@/components/retro/TruiBadge";
import { useThema } from "@/contexts/ThemaContext";
import { isGameLocked, isAdminOnlyStatus, isPreviewStatus } from "@/lib/gameStatus";
import { useAuth } from "@/hooks/useAuth";
import type { TruiType } from "@/lib/themas";
import { useLefevereReport, useLefeverePreview } from "@/hooks/useLefevereReport";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { useJokerMultiplier } from "@/hooks/useJokerMultiplier";
import { simulateMonkeyTeams } from "@/lib/monkeySimulation";
import aapFietser from "@/assets/horscat/aap-fietser-transparant.png";

// ─── Types ──────────────────────────────────────────────────────────────────

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };
type PredictionStat = {
  classification: string;
  position: number;
  rider_id: string;
  pick_count: number;
  total_entries: number;
};

// ─── Ownership colour (unchanged) ────────────────────────────────────────────

function ownershipColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const intensity = 1 - clamped / 100;
  const alpha = 0.18 + intensity * 0.7;
  return `hsl(var(--vintage-gold) / ${alpha.toFixed(2)})`;
}

const CLASSIFICATION_META: Array<{ key: "gc" | "points" | "kom" | "youth"; trui: TruiType; tint: string }> = [
  { key: "gc", trui: "algemeen", tint: "from-primary/20 to-[hsl(var(--vintage-gold))/0.15]" },
  { key: "points", trui: "punten", tint: "from-emerald-500/15 to-emerald-500/5" },
  { key: "kom", trui: "berg", tint: "from-rose-500/15 to-rose-500/5" },
  { key: "youth", trui: "jongeren", tint: "from-slate-200/30 to-slate-200/10" },
];

// ─── Data hooks (all unchanged) ───────────────────────────────────────────────

function usePredictionStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-prediction-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PredictionStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_prediction_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PredictionStat[];
    },
  });
}
function usePickStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-pick-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PickStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_pick_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PickStat[];
    },
  });
}
function useJokerStats(gameId?: string) {
  return useQuery({
    queryKey: ["game-joker-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<JokerStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_joker_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as JokerStat[];
    },
  });
}
function useMyStagePointTotal(entryId?: string) {
  return useQuery({
    queryKey: ["hc-my-stage-point-total", entryId],
    enabled: Boolean(supabase && entryId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !entryId) return 0;
      const { data, error } = await supabase.from("stage_points").select("points").eq("entry_id", entryId);
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);
    },
  });
}
function useRiderNames(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["hc-rider-names", sorted],
    enabled: sorted.length > 0,
    queryFn: async () => {
      if (!supabase) return [] as Array<{ id: string; name: string; team: string | null }>;
      const { data, error } = await supabase.from("riders").select("id, name, team").in("id", sorted);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; team: string | null }>;
    },
  });
}

// ─── Monte Carlo helpers (unchanged) ─────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
// ─── Visual helpers ───────────────────────────────────────────────────────────

function snapToBucket(dist: Array<{ bucket: number }>, value: number): number {
  return dist.reduce((best, b) => (Math.abs(b.bucket - value) < Math.abs(best.bucket - value) ? b : best)).bucket;
}

// SVG semicircle gauge — animates on mount
function PercentileGauge({ pct }: { pct: number }) {
  const r = 50,
    cx = 65,
    cy = 62,
    sw = 9;
  const circ = Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color = pct >= 50 ? "#34d399" : "#f43f5e";
  return (
    <svg viewBox="0 0 130 72" className="w-full max-w-[200px] mx-auto">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${offset}`}
      />
      <text x={cx - r} y={cy + 13} fontSize="8" fill="#888" textAnchor="middle">
        0%
      </text>
      <text x={cx + r} y={cy + 13} fontSize="8" fill="#888" textAnchor="middle">
        100%
      </text>
    </svg>
  );
}


// ─── Custom tab icon ─────────────────────────────────────────────────────────

function DirectorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="3" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5.5" y="1.5" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="3.5" y="9.5" width="2" height="2.5" rx="0.3" fill="currentColor" opacity="0.5" />
      <rect x="7" y="7.5" width="2" height="4.5" rx="0.3" fill="currentColor" opacity="0.7" />
      <rect x="10.5" y="5.5" width="2" height="6.5" rx="0.3" fill="currentColor" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type HorsTabKey = "dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark";

// Onderdelen voor het mobiele "Ga naar"-ballonnetje (zelfde volgorde/iconen als de tabs).
const HORS_TABS: { key: HorsTabKey; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { key: "dartpijl", label: "Dartpijl", Icon: Activity },
  { key: "pelotonkeuzes", label: "Pelotonkeuzes", Icon: BarChart3 },
  { key: "wielerdirecteur", label: "De Wielerdirecteur", Icon: DirectorIcon },
  { key: "superteam", label: "The Emirates", Icon: Crown },
  { key: "benchmark", label: "Benchmark", Icon: Swords },
];

export default function HorsCategorieTab({ initialTab, gameId: gameIdProp, gameStatus, adminTestmodus = false }: { initialTab?: HorsTabKey; gameId?: string; gameStatus?: string; adminTestmodus?: boolean } = {}) {
  const { t } = useTranslation();
  const { thema } = useThema();
  const { role } = useAuth();
  const { data: curGame } = useCurrentGame();
  // Optioneel een specifieke (bv. afgeronde) game tonen i.p.v. de live game.
  const game = gameIdProp ? { id: gameIdProp, status: gameStatus } : curGame;
  // Twee aparte assen: tab tónen (isVisible, vanaf "open" t/m finished) vs. échte
  // uitslagdata aanwezig (hasResults, vanaf "live"). Concept/draft = verborgen.
  // Admin-volledig-zicht hangt aan de TESTMODUS (niet meer aan status 'open').
  // Testmodus aan → admin ziet de echte HC ongeacht status; uit → admin ziet de
  // game als een deelnemer (in 'open' dus de demo).
  const isAdmin = role === "admin";
  const adminSeesAll = isAdmin && adminTestmodus;
  const hasResults = isGameLocked(game?.status) || adminSeesAll;
  const isVisible = Boolean(game?.status) && !isAdminOnlyStatus(game?.status);
  // Sneak preview ('open'): gewone gebruiker krijgt UITSLUITEND een client-side
  // demo op gesimuleerde data. De ADMIN ziet de echte gevulde HC (kan testen).
  // Verdwijnt zodra de status verder is (open_inschrijving, live, …).
  const isDemo = isPreviewStatus(game?.status) && !adminSeesAll;
  const { entry, picksByCategory, jokerIds, predictions: myPredictions } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: pickStats = [] } = usePickStats(hasResults ? game?.id : undefined);
  const { data: jokerStats = [] } = useJokerStats(hasResults ? game?.id : undefined);
  const { data: predictionStats = [] } = usePredictionStats(hasResults ? game?.id : undefined);
  const { data: myStageTotal = 0 } = useMyStagePointTotal(entry?.id);
  const jokerMultiplier = useJokerMultiplier(game?.id);
  const hcGameId = hasResults ? game?.id : undefined;

  // Stage-by-stage timeline data
  const { data: stages = [] } = useStages(hcGameId);
  // Hoogste goedgekeurde (niet-GC) etappe → server-side totalen via game_standings,
  // i.p.v. alle stage_points-rijen van de hele game naar de client te halen.
  const maxStageNum = useMemo(() => {
    let m: number | undefined;
    for (const s of stages) {
      if (s.results_status === "approved") m = Math.max(m ?? 0, s.stage_number);
    }
    return m;
  }, [stages]);
  const { data: standRows = [] } = useGameStandings(hcGameId, maxStageNum);
  // cum_points = stage-punten zonder voorspel-bonus → zelfde verdeling als oude useEntryTotals.
  const totals = useMemo(() => standRows.map((r) => r.cum_points), [standRows]);
  // Alleen MIJN stage_points (tijdlijn) + per-etappe gemiddelde (server-side).
  const myEntryIds = useMemo(() => (entry?.id ? [entry.id] : []), [entry?.id]);
  const { data: myStageRows = [] } = useStagePointsForEntries(hcGameId, myEntryIds);
  const { data: stageAverages } = useStageAverages(hcGameId);

  // The Emirates — alle stage_results (voor droomploeg)
  const { data: allStageResults = [] } = useQuery({
    queryKey: ["all-stage-results", game?.id],
    enabled: Boolean(supabase && hasResults && game?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ stage_id: string; rider_id: string | null; finish_position: number }>> => {
      if (!supabase || !game?.id) return [];
      // Paginate to defeat any PostgREST max-rows cap. stage_results can easily
      // exceed 1000 rows (21 etappes × ~180 finishers ≈ 3.8k), wat de Droomploeg-
      // berekening anders te laag uitvalt.
      type Row = { stage_id: string; rider_id: string | null; finish_position: number; stages?: { game_id: string; results_status: string } | null };
      const PAGE = 1000;
      let from = 0;
      const all: Row[] = [];
      // safety cap at 200k rijen
      while (from < 200_000) {
        const { data, error } = await (supabase as any)
          .from("stage_results")
          .select("stage_id, rider_id, finish_position, stages!inner(game_id, results_status)")
          .eq("stages.game_id", game.id)
          .eq("stages.results_status", "approved")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data ?? []) as Row[];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return all.map((r) => ({ stage_id: r.stage_id, rider_id: r.rider_id, finish_position: r.finish_position }));
    },
  });

  // Alle renners van deze koers (voor jokerpool: renners die niet in een categorie zitten)
  const { data: allGameRiders = [] } = useQuery({
    queryKey: ["hc-all-game-riders", game?.id],
    enabled: Boolean(supabase && hasResults && game?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ id: string; name: string; start_number: number | null }>> => {
      if (!supabase || !game?.id) return [];
      const { data: teams } = await supabase.from("teams").select("id").eq("game_id", game.id);
      const teamIds = (teams ?? []).map((t: any) => t.id);
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase.from("riders").select("id, name, start_number").in("team_id", teamIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; start_number: number | null }>;
    },
  });

  const myPickedRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    for (const id of jokerIds) s.add(id);
    return s;
  }, [picksByCategory, jokerIds]);

  const myPredictionMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of myPredictions) m.set(`${p.classification}:${p.position}`, p.rider_id);
    return m;
  }, [myPredictions]);

  const allRiderIdsSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of pickStats) s.add(p.rider_id);
    for (const j of jokerStats) s.add(j.rider_id);
    for (const p of predictionStats) s.add(p.rider_id);
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    for (const id of jokerIds) s.add(id);
    for (const p of myPredictions) s.add(p.rider_id);
    return Array.from(s);
  }, [pickStats, jokerStats, predictionStats, picksByCategory, jokerIds, myPredictions]);
  const { data: riders = [] } = useRiderNames(allRiderIdsSet);
  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);

  // ── Monte Carlo (logic unchanged) ──────────────────────────────────────────
  const monte = useMemo(() => {
    if (categories.length === 0 || allStageResults.length === 0) return null;
    const riderPoints = new Map<string, number>();
    for (const result of allStageResults) {
      if (!result.rider_id) continue;
      riderPoints.set(result.rider_id, (riderPoints.get(result.rider_id) ?? 0) + (pointsTable[result.finish_position] ?? 0));
    }
    const userActual = entry ? myStageTotal : 0;
    const simulation = simulateMonkeyTeams({
      categories,
      riders: allGameRiders,
      riderPoints,
      userScore: userActual,
      jokerMultiplier,
      simulations: 10_000,
      seed: game?.id?.split("-").reduce((sum, char) => sum + char.charCodeAt(0), 0) ?? 42,
    });
    if (!simulation || simulation.mean <= 0) return null;
    const { scores: randomScores, mean, median, beatPct } = simulation;
    const top10cut = randomScores[Math.floor(randomScores.length * 0.9)];
    const aboveMedian = userActual > median ? 100 : 0;
    const top10 = userActual > top10cut;
    const worseThanApe = beatPct < 50;
    const min = randomScores[0];
    const max = randomScores[randomScores.length - 1];
    const buckets = 25;
    const step = Math.max(1, (max - min) / buckets);
    const dist = Array.from({ length: buckets }, (_, i) => {
      const from = min + i * step;
      const to = from + step;
      // Laatste bin sluit de max-score in (anders valt die buiten elke bin).
      const last = i === buckets - 1;
      const count = randomScores.filter((s) => s >= from && (last ? s <= to : s < to)).length;
      return { bucket: Math.round((from + to) / 2), count };
    });
    if (import.meta.env.DEV) {
      console.log("[monte] scores sample:", randomScores.slice(0, 10).map((s) => Math.round(s)));
      console.log("[monte] min/max/mean:", Math.round(min), Math.round(max), Math.round(mean));
      console.log("[monte] bins:", dist);
    }
    return { mean, median, top10cut, beatPct, top10, worseThanApe, aboveMedian, userActual, dist };
  }, [categories, allStageResults, allGameRiders, entry, myStageTotal, jokerMultiplier, game?.id]);

  // ── Demo Monte Carlo (alleen sneak preview 'open') ───────────────────────────
  // Volledig client-side, deterministisch (vaste seed): ~5 gesimuleerde deelnemers
  // → 10.000 "apen" + een voorbeeldscore, zodat de Aap met de Dartpijl + percentiel-
  // verdeling geloofwaardig oogt zonder echte data of DB-writes.
  const demoMonte = useMemo(() => {
    if (!isDemo) return null;
    const rng = seededRandom(20260620);
    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const N = 10_000, MEAN = 430, SD = 95;
    const scores: number[] = [];
    for (let i = 0; i < N; i++) scores.push(Math.max(0, Math.round(MEAN + gauss() * SD)));
    scores.sort((a, b) => a - b);
    const userActual = 545; // bovengemiddelde voorbeeldploeg
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];
    const top10cut = scores[Math.floor(scores.length * 0.9)];
    const beatPct = (scores.filter((s) => userActual > s).length / scores.length) * 100;
    const min = scores[0], max = scores[scores.length - 1];
    const buckets = 25;
    const step = Math.max(1, (max - min) / buckets);
    const dist = Array.from({ length: buckets }, (_, i) => {
      const from = min + i * step;
      const to = from + step;
      const last = i === buckets - 1;
      const count = scores.filter((s) => s >= from && (last ? s <= to : s < to)).length;
      return { bucket: Math.round((from + to) / 2), count };
    });
    return {
      mean, median, top10cut, beatPct,
      top10: userActual > top10cut,
      worseThanApe: beatPct < 50,
      aboveMedian: userActual > median ? 100 : 0,
      userActual, dist,
    };
  }, [isDemo]);
  // In sneak preview tonen we de demo i.p.v. de (lege) echte Monte Carlo.
  const dartMonte = isDemo ? demoMonte : monte;

  // ── Stage timeline ──────────────────────────────────────────────────────────
  const stageTimeline = useMemo(() => {
    if (!entry?.id || stages.length === 0) return [];
    // Mijn punten per etappe (scoped fetch) + per-etappe gemiddelde (server-side RPC).
    const myPts = new Map<string, number>();
    for (const sp of myStageRows) {
      myPts.set(sp.stage_id, (myPts.get(sp.stage_id) ?? 0) + sp.points);
    }
    const approved = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    let userCum = 0,
      avgCum = 0;
    return approved.map((s) => {
      const u = myPts.get(s.id) ?? 0;
      const avg = stageAverages?.get(s.id) ?? 0;
      userCum += u;
      avgCum += avg;
      return {
        stage: `E${s.stage_number}`,
        user: userCum,
        avg: Math.round(avgCum),
        userDelta: u,
        avgDelta: Math.round(avg),
      };
    });
  }, [entry?.id, stages, myStageRows, stageAverages]);

  // ── The Emirates — de droomploeg achterop gezien ────────────────────────────
  // Per categorie de top-N renners met de meeste etappe-punten (50, 40, …, 1
  // voor positie 1 t/m 20), binnen de toegestane max_picks. Totaal = ceiling.
  type DreamRider = { riderId: string; name: string; startNumber: number | null; points: number };
  type DreamCategory = {
    categoryId: string;
    categoryName: string;
    shortName: string | null;
    maxPicks: number;
    riders: DreamRider[];
    subtotal: number;
  };
  const emiratesData = useMemo(() => {
    const approvedStages = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    if (approvedStages.length === 0) {
      return {
        total: 0,
        picks: [] as DreamCategory[],
        jokers: [] as DreamRider[],
        jokerSubtotal: 0,
        ranking: [] as Array<{ entryId: string; teamName: string; points: number; isMe: boolean }>,
        lastStage: null as null | { number: number; name: string | null },
        stagesCount: 0,
        riderTotals: new Map<string, number>(),
      };
    }
    const last = approvedStages[approvedStages.length - 1];

    // 1) per-rider totaal aan etappe-punten over alle bijgewerkte etappes
    const riderTotals = new Map<string, number>();
    for (const r of allStageResults) {
      if (!r.rider_id) continue;
      const pts = pointsTable[r.finish_position] ?? 0;
      if (pts === 0) continue;
      riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
    }

    // 2) per categorie de top max_picks renners
    const picks: DreamCategory[] = categories
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => {
        const candidates: DreamRider[] = (cat.category_riders ?? [])
          .map((cr) =>
            cr.riders
              ? {
                  riderId: cr.riders.id,
                  name: cr.riders.name,
                  startNumber: cr.riders.start_number,
                  points: riderTotals.get(cr.riders.id) ?? 0,
                }
              : null,
          )
          .filter((x): x is DreamRider => Boolean(x))
          .sort((a, b) => b.points - a.points);
        const optimal = candidates.slice(0, cat.max_picks);
        const subtotal = optimal.reduce((s, r) => s + r.points, 0);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          shortName: cat.short_name,
          maxPicks: cat.max_picks,
          riders: optimal,
          subtotal,
        };
      });
    const pickedRiderIds = new Set<string>();
    for (const cat of picks) for (const r of cat.riders) pickedRiderIds.add(r.riderId);

    // 2b) 2 jokers — beste renners die in GEEN ENKELE categorie zitten, x1
    const categoryRiderIds = new Set<string>();
    for (const cat of categories) {
      for (const cr of cat.category_riders ?? []) {
        if (cr.riders) categoryRiderIds.add(cr.riders.id);
      }
    }
    const jokerPool: DreamRider[] = allGameRiders
      .filter((r) => !categoryRiderIds.has(r.id))
      .map((r) => ({
        riderId: r.id,
        name: r.name,
        startNumber: r.start_number,
        points: riderTotals.get(r.id) ?? 0,
      }));
    const jokers = jokerPool.sort((a, b) => b.points - a.points).slice(0, 2);
    const jokerSubtotal = jokers.reduce((s, r) => s + r.points, 0);

    const total = picks.reduce((s, c) => s + c.subtotal, 0) + jokerSubtotal;

    // 3) huidige ranking (voor leider/eigen score-vergelijking) — server-side
    //    cumulatieve stand t/m de laatste goedgekeurde etappe (incl. GC).
    const ranking = standRows
      .map((r) => ({
        entryId: r.entry_id,
        teamName: r.team_name?.trim() || r.display_name?.trim() || t("hors.emirates.unnamedTeam"),
        points: r.cum_points,
        isMe: entry?.id === r.entry_id,
      }))
      .sort((a, b) => b.points - a.points);

    return {
      total,
      picks,
      jokers,
      jokerSubtotal,
      ranking,
      lastStage: { number: last.stage_number, name: last.name },
      stagesCount: approvedStages.length,
      riderTotals,
    };
  }, [stages, categories, allStageResults, standRows, entry?.id, allGameRiders, t]);

  // ── Emirates-benchmark: eigen ploeg vs droomploeg, set-gewijs per categorie ──
  // Zelfde scope als het ceiling-totaal: alle categorieën + de 2 jokers (×1),
  // dezelfde riderTotals — teller en noemer kloppen dus per definitie.
  const emiratesBenchmark = useMemo(() => {
    if (!entry || picksByCategory.size === 0) return null;
    if (emiratesData.lastStage === null || emiratesData.total <= 0) return null;
    const { riderTotals } = emiratesData;
    const nameById = new Map(allGameRiders.map((r) => [r.id, r.name]));

    type BenchRow = {
      key: string;
      categoryName: string;
      mine: Array<{ name: string; points: number }>;
      dream: Array<{ name: string; points: number }>;
      minePoints: number;
      dreamPoints: number;
      diff: number;
      perfect: boolean;
    };

    const setEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id) => b.includes(id));

    const rows: BenchRow[] = emiratesData.picks.map((cat) => {
      const mineIds = picksByCategory.get(cat.categoryId) ?? [];
      const dreamIds = cat.riders.map((r) => r.riderId);
      const mine = mineIds.map((id) => ({
        name: nameById.get(id) ?? "?",
        points: riderTotals.get(id) ?? 0,
      }));
      const minePoints = mine.reduce((s, r) => s + r.points, 0);
      return {
        key: cat.categoryId,
        categoryName: cat.categoryName,
        mine,
        dream: cat.riders.map((r) => ({ name: r.name, points: r.points })),
        minePoints,
        dreamPoints: cat.subtotal,
        diff: Math.max(0, cat.subtotal - minePoints),
        perfect: setEqual(mineIds, dreamIds),
      };
    });

    // Jokers als eigen rij — het ceiling-totaal telt ze mee (×1).
    const dreamJokerIds = emiratesData.jokers.map((r) => r.riderId);
    const myJokers = jokerIds.map((id) => ({
      name: nameById.get(id) ?? "?",
      points: riderTotals.get(id) ?? 0,
    }));
    const myJokerPoints = myJokers.reduce((s, r) => s + r.points, 0);
    rows.push({
      key: "__jokers",
      categoryName: t("hors.emirates.bench.jokersRow"),
      mine: myJokers,
      dream: emiratesData.jokers.map((r) => ({ name: r.name, points: r.points })),
      minePoints: myJokerPoints,
      dreamPoints: emiratesData.jokerSubtotal,
      diff: Math.max(0, emiratesData.jokerSubtotal - myJokerPoints),
      perfect: setEqual(jokerIds, dreamJokerIds),
    });

    const mijnTotaal = rows.reduce((s, r) => s + r.minePoints, 0);
    const droomTotaal = emiratesData.total;
    const perfectCount = rows.filter((r) => r.perfect).length;
    const sorted = [
      ...rows.filter((r) => r.perfect),
      ...rows.filter((r) => !r.perfect).sort((a, b) => b.diff - a.diff),
    ];
    const worstKey = sorted.find((r) => !r.perfect && r.diff > 0)?.key ?? null;

    return {
      rows: sorted,
      mijnTotaal,
      droomTotaal,
      rendement: Math.round((mijnTotaal / droomTotaal) * 100),
      perfectCount,
      totalCats: rows.length,
      worstKey,
    };
  }, [entry, picksByCategory, jokerIds, emiratesData, allGameRiders, t]);

  // ── Derived display values ──────────────────────────────────────────────────
  const diffPct = monte && monte.mean > 0 ? ((monte.userActual - monte.mean) / monte.mean) * 100 : 0;
  const isBeating = diffPct >= 0;
  const oneInX =
    monte && monte.beatPct < 99.5 ? Math.max(2, Math.round(100 / Math.max(0.1, 100 - monte.beatPct))) : null;

  // ── Section 2: Pelotonkeuzes ────────────────────────────────────────────────
  const pickStatsByCat = useMemo(() => {
    const m = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    }
    for (const [k, list] of m)
      m.set(
        k,
        list.sort((a, b) => b.pick_count - a.pick_count),
      );
    return m;
  }, [pickStats]);

  // ── Section 3: Wielerdirecteur ──────────────────────────────────────────────
  const directorAnalysis = useMemo(() => {
    if (!hasResults || !entry || picksByCategory.size === 0) return null;
    const myPickIds = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) myPickIds.add(id);
    const ownershipByRider = new Map<string, number>();
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    for (const p of pickStats) ownershipByRider.set(p.rider_id, p.pick_count / Math.max(1, totalEntries));
    const myOwnerships = Array.from(myPickIds).map((rid) => ownershipByRider.get(rid) ?? 0);
    const avgOwn = myOwnerships.length ? myOwnerships.reduce((a, b) => a + b, 0) / myOwnerships.length : 0;
    const uniques = myOwnerships.filter((o) => o < 0.15).length;
    const labels: string[] = [];
    if (uniques >= 4) labels.push(t("hors.directorAnalysis.labelChaos"));
    if (avgOwn > 0.45) labels.push(t("hors.directorAnalysis.labelPeloton"));
    if (avgOwn < 0.25) labels.push(t("hors.directorAnalysis.labelAttacking"));
    const lines: string[] = [];
    if (avgOwn > 0.5) lines.push(t("hors.directorAnalysis.lineSafe"));
    else if (avgOwn < 0.2) lines.push(t("hors.directorAnalysis.lineRisky"));
    if (uniques >= 3) lines.push(t("hors.directorAnalysis.lineUniques", { count: uniques }));
    const day = new Date().getDate();
    const quotes = [
      t("hors.directorAnalysis.quote0"),
      t("hors.directorAnalysis.quote1"),
      t("hors.directorAnalysis.quote2"),
      t("hors.directorAnalysis.quote3"),
      t("hors.directorAnalysis.quote4"),
    ];
    return { labels, lines, quote: quotes[day % quotes.length] };
  }, [hasResults, entry, picksByCategory, pickStats, t]);

  // ── Director Report Score ────────────────────────────────────────────────────
  const directorScore = useMemo(() => {
    if (!hasResults || !entry || !monte) return null;

    // Pool Ranking (50%): 0 = last place, 1 = first place
    const n = totals.length;
    const myRank = n > 0 ? totals.filter((t) => t > myStageTotal).length + 1 : 1;
    const poolScore = n <= 1 ? 0.75 : (n - myRank) / (n - 1);

    // Monkey comparison (25%)
    const monkeyScore = monte.beatPct / 100;

    // Per-renner finishpunten over alle goedgekeurde etappes (gedeelde basis)
    const riderTotals = new Map<string, number>();
    for (const r of allStageResults) {
      if (!r.rider_id) continue;
      const pts = pointsTable[r.finish_position] ?? 0;
      if (pts === 0) continue;
      riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
    }
    const catIds = new Set<string>();
    for (const c of categories) for (const cr of c.category_riders ?? []) if (cr.riders) catIds.add(cr.riders.id);

    // Joker prestatie (20%) — RENDEMENT: scoorden je jokers punten t.o.v. de
    // best mogelijke jokers (de 2 best scorende niet-categorie-renners)?
    let jokerScore = 0.5;
    let jokerDetail: {
      yourPts: number;
      bestPts: number;
      rendementPct: number;
      rows: Array<{ name: string; pts: number }>;
    } = { yourPts: 0, bestPts: 0, rendementPct: 0, rows: [] };
    if (jokerIds.length > 0) {
      const nameByIdJ = new Map(allGameRiders.map((r) => [r.id, r.name]));
      const bestJokerPts = allGameRiders
        .filter((r) => !catIds.has(r.id))
        .map((r) => riderTotals.get(r.id) ?? 0)
        .sort((a, b) => b - a)
        .slice(0, 2)
        .reduce((s, p) => s + p, 0);
      const yourJokerPts = jokerIds.reduce((s, jid) => s + (riderTotals.get(jid) ?? 0), 0);
      const rendement = bestJokerPts > 0 ? Math.min(1, Math.max(0, yourJokerPts / bestJokerPts)) : 0.5;
      jokerScore = 0.3 + rendement * 0.7;
      jokerDetail = {
        yourPts: yourJokerPts,
        bestPts: bestJokerPts,
        rendementPct: Math.round(rendement * 100),
        rows: jokerIds.map((jid) => ({ name: nameByIdJ.get(jid) ?? "—", pts: riderTotals.get(jid) ?? 0 })),
      };
    }

    // Differentiaal (10%) — punten-gewogen uniciteit van je scorende picks:
    // veel punten met renners die weinig anderen kozen → hoger.
    let diffScore = 0.5;
    let diffDetail: {
      scorers: number;
      avgOwnPct: number;
      rows: Array<{ name: string; ownPct: number; pts: number; bijdrage: number }>;
    } = { scorers: 0, avgOwnPct: 0, rows: [] };
    {
      const nameById = new Map(allGameRiders.map((r) => [r.id, r.name]));
      const myPickIds: string[] = [];
      picksByCategory.forEach((ids) => myPickIds.push(...ids));
      const ownOf = (rid: string) => {
        const ps = pickStats.find((p) => p.rider_id === rid);
        return ps && ps.total_entries > 0 ? ps.pick_count / ps.total_entries : 0.15;
      };
      let wsum = 0, psum = 0, ownSum = 0;
      const rows: Array<{ name: string; ownPct: number; pts: number; bijdrage: number }> = [];
      for (const rid of myPickIds) {
        const pts = riderTotals.get(rid) ?? 0;
        if (pts > 0) {
          const own = ownOf(rid);
          wsum += (1 - own) * pts; psum += pts; ownSum += own;
          rows.push({ name: nameById.get(rid) ?? "—", ownPct: Math.round(own * 100), pts, bijdrage: Math.round((1 - own) * pts) });
        }
      }
      if (psum > 0) diffScore = Math.min(1, Math.max(0, wsum / psum));
      rows.sort((a, b) => b.bijdrage - a.bijdrage);
      diffDetail = {
        scorers: rows.length,
        avgOwnPct: rows.length ? Math.round((ownSum / rows.length) * 100) : 0,
        rows: rows.slice(0, 5),
      };
    }

    const raw = poolScore * 0.45 + monkeyScore * 0.25 + jokerScore * 0.2 + diffScore * 0.1;
    const score = Math.max(3.0, Math.round((raw * 9 + 1) * 10) / 10);
    const toSub = (v: number) => Math.max(1.0, Math.round((v * 9 + 1) * 10) / 10);

    const analysisMap: Array<[number, string]> = [
      [9.0, t("hors.wielerdirecteur.fallback.s90")],
      [8.0, t("hors.wielerdirecteur.fallback.s80")],
      [7.0, t("hors.wielerdirecteur.fallback.s70")],
      [6.0, t("hors.wielerdirecteur.fallback.s60")],
      [5.0, t("hors.wielerdirecteur.fallback.s50")],
      [4.0, t("hors.wielerdirecteur.fallback.s40")],
      [0.0, t("hors.wielerdirecteur.fallback.s00")],
    ];
    const analysis = analysisMap.find(([threshold]) => score >= threshold)?.[1] ?? analysisMap[analysisMap.length - 1][1];

    return {
      score,
      poolScore,
      monkeyScore,
      jokerScore,
      diffScore,
      poolSubScore: toSub(poolScore),
      monkeySubScore: toSub(monkeyScore),
      jokerSubScore: toSub(jokerScore),
      diffSubScore: toSub(diffScore),
      analysis,
      rang: myRank,
      totaal: n,
      beatPct: monte.beatPct,
      aantalJokers: jokerIds.length,
      rankLabel: t("hors.wielerdirecteur.rankLabel", { rank: myRank, total: n }),
      beatLabel: t("hors.wielerdirecteur.beatLabel", { pct: monte.beatPct.toFixed(0) }),
      jokerLabel: jokerIds.length === 0 ? t("hors.wielerdirecteur.noJokers") : t("hors.wielerdirecteur.jokerCount", { count: jokerIds.length }),
      diffLabel: diffDetail.scorers === 0 ? t("hors.wielerdirecteur.noScoringPicks") : t("hors.wielerdirecteur.diffLabel", { count: diffDetail.scorers, pct: diffDetail.avgOwnPct }),
      diffDetail,
      jokerDetail,
    };
  }, [hasResults, entry, monte, totals, myStageTotal, jokerIds, jokerStats, allStageResults, allGameRiders, categories, picksByCategory, pickStats, t]);

  // ── Sub-tab state (must be declared before any early return to keep hook order stable) ──
  const [activeTab, setActiveTab] = useState<HorsTabKey>(initialTab ?? "dartpijl");
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  // Mobiel: vinger-volgende carrousel tussen onderdelen (de zwevende schakelaar staat onderaan).
  const hint = useSwipeHint("hors");
  const barVisible = useAutoHideOnScroll();
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showEmiratesInfo, setShowEmiratesInfo] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [openComponent, setOpenComponent] = useState<string | null>(null);

  // ── Lefevere directeursanalyse (LLM) — gedeelde input via useHorsCategorieSummary,
  //    zodat de tekst 1-op-1 identiek is aan die in de Gazetta-feed. ──
  const horsSummary = useHorsCategorieSummary(gameIdProp ? { id: gameIdProp, status: gameStatus, adminTestmodus } : { adminTestmodus });
  const lefevere = useLefevereReport(horsSummary.lefevereInput, {
    entryId: horsSummary.entryId,
    stageCount: horsSummary.stageCount,
    enabled: activeTab === "wielerdirecteur" && Boolean(horsSummary.lefevereInput),
  });
  // Sneak preview: éénmalig, gedeeld Patlef-voorproefje (geen echte stand).
  const lefeverePreview = useLefeverePreview(game?.id, isDemo && activeTab === "wielerdirecteur");

  // Tab-labels via t() (HORS_TABS zelf staat op module-niveau; label daar is fallback).
  const tabLabel = (key: HorsTabKey): string => t(`hors.tabs.${key}`);

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!isVisible) {
    return (
      <Card className="ornate-frame retro-border">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <p className="font-display text-xl font-bold">{t("hors.locked.title")}</p>
          <p className="text-sm text-muted-foreground font-serif italic">
            {t("hors.locked.body")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">
      {/* Sneak preview: ondubbelzinnige "dit is nep"-melding bovenaan. */}
      {isDemo && (
        <div className="retro-border bg-[hsl(var(--vintage-gold))/0.08] px-4 py-3 flex items-start gap-2.5">
          <span className="text-lg leading-none shrink-0" aria-hidden>🎲</span>
          <p className="text-sm font-serif italic text-foreground/90 leading-snug">
            <span className="font-display font-bold uppercase tracking-wide not-italic">{t("hors.demo.bannerLead")}</span>{" "}
            {t("hors.demo.bannerBody")}
          </p>
        </div>
      )}

      {/* ── Sub-tab navigation ─────────────────────────────────────────────── */}

      {/* Mobile — MobielTabBalk (scrollable chips). Glijdt weg bij omlaag scrollen
          (auto-hide); de zwevende schakelaar neemt het wisselen over. */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-[120px]",
          !barVisible && "!max-h-0 opacity-0",
        )}
      >
        {/* Tabbalk staat stil; de carrousel-content volgt de vinger. */}
        <MobielTabBalk
          tabs={[
            { key: "dartpijl", label: tabLabel("dartpijl"), icon: Activity },
            { key: "pelotonkeuzes", label: tabLabel("pelotonkeuzes"), icon: BarChart3 },
            { key: "wielerdirecteur", label: tabLabel("wielerdirecteur"), icon: DirectorIcon },
            { key: "superteam", label: tabLabel("superteam"), icon: Crown },
            { key: "benchmark", label: tabLabel("benchmark"), icon: Swords },
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as typeof activeTab)}
        />
      </div>

      {/* Swipe-hint (eenmalig, wegklikbaar) + stippen-indicator (mobiel). */}
      <SwipeHintBar visible={hint.visible} onClose={hint.dismiss} className="mx-auto w-fit" />
      <SwipeDots count={HORS_TABS.length} activeIndex={HORS_TABS.findIndex((tab) => tab.key === activeTab)} activeLabel={tabLabel(activeTab)} />

      {/* Desktop — retro dossard-tabbalk */}
      <RetroTabs
        className="hidden md:flex"
        aria-label={t("hors.tabsAria")}
        active={activeTab}
        onChange={(k) => setActiveTab(k as typeof activeTab)}
        tabs={[
          { key: "dartpijl",        label: tabLabel("dartpijl"),        Icon: Activity },
          { key: "pelotonkeuzes",   label: tabLabel("pelotonkeuzes"),   Icon: BarChart3 },
          { key: "wielerdirecteur", label: tabLabel("wielerdirecteur"), Icon: DirectorIcon },
          { key: "superteam",       label: tabLabel("superteam"),       Icon: Crown },
          { key: "benchmark",       label: tabLabel("benchmark"),       Icon: Swords },
        ]}
      />

      {/* Vinger-volgende carrousel: alleen het content-vlak beweegt. */}
      <SwipeCarousel
        keys={HORS_TABS.map((t) => t.key)}
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as HorsTabKey)}
        onSwiped={hint.dismiss}
        renderTab={(k) => (
          <div className="space-y-5">
            {/* ── Tab: Benchmark ───────────────────────────────────────────────── */}
            {k === "benchmark" && <BenchmarkTab gameId={game?.id} />}

      {/* ── Tab 1: Dartpijl (Monte Carlo) ───────────────────────────────────── */}
      {k === "dartpijl" && (
        <div className="space-y-5">
          {isDemo && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--vintage-gold))/0.16] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold))/0.45] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              {t("hors.demo.badge")}
            </div>
          )}
          {!dartMonte ? (
            <EmptyState
              illustration={aapFietser}
              title={t("hors.dartpijl.emptyTitle")}
              message={t("hors.dartpijl.emptyMessage")}
            />
          ) : (
            <>
              {/* Uitleg-accordion "Hoe werkt dit?" — de aap met de dartpijl. */}
              <MonkeyExplainerModal monkeyCount={10_000} variant="text" />

              {/* ── Monkey IQ-hero: percentile + verdict + Jij-vs-aap ──
                  Alle uitleg-/titel-lagen en de Prestatieklasse-banner zijn
                  bewust verwijderd: de hero vertelt het hele verhaal. */}
              <PercentileVerdict
                percentile={Math.round(dartMonte.beatPct)}
                userPoints={dartMonte.userActual}
                monkeyAvg={Math.round(dartMonte.mean)}
                illustrationSrc={aapFietser}
              />

              {/* Distributie — FT-stijl infographic (custom SVG) */}
              <AapscoreDistributie
                dist={dartMonte.dist}
                userActual={dartMonte.userActual}
                mean={dartMonte.mean}
                beatPct={dartMonte.beatPct}
                monkeyCount={10_000}
              />



              {/* Commentary */}
              {dartMonte.top10 && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-serif italic",
                    "border-emerald-300 bg-emerald-50 text-emerald-700",
                  )}
                >
                  <span>{t("hors.dartpijl.top10Commentary")}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab 2: Pelotonkeuzes ─────────────────────────────────────────────── */}
      {k === "pelotonkeuzes" && (
        <Card className="ornate-frame retro-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> {t("hors.peloton.title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-serif italic">
              {t("hors.peloton.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-serif text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(5) }} /> {t("hors.peloton.legendRare")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(50) }} /> {t("hors.peloton.legendAverage")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(95) }} />{" "}
                {t("hors.peloton.legendFavourite")}
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                  ★
                </span>
                {t("hors.peloton.yourPick")}
              </span>
            </div>

            {pickStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("hors.peloton.noTeams")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const list = (pickStatsByCat.get(cat.id) ?? []).slice(0, 6);
                  const totalEntries = list[0]?.total_entries ?? 1;
                  if (list.length === 0) return null;
                  return (
                    <div key={cat.id} className="rounded-lg border-2 border-border bg-secondary/20 p-3">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                        {cat.short_name ?? cat.name}
                      </p>
                      <div className="space-y-2">
                        {list.map((p) => {
                          const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                          const rider = ridersById[p.rider_id];
                          const mine = myPickedRiderIds.has(p.rider_id);
                          const badge =
                            pct >= 70
                              ? t("hors.peloton.badgeEveryone")
                              : pct >= 40
                                ? t("hors.peloton.badgeFavourite")
                                : pct <= 10
                                  ? t("hors.peloton.badgeHiddenGem")
                                  : pct <= 25
                                    ? t("hors.peloton.badgeDifferential")
                                    : null;
                          return (
                            <div
                              key={p.rider_id}
                              className={cn(
                                "rounded-md p-2 transition-colors",
                                mine
                                  ? "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] bg-primary/5 border border-primary/40"
                                  : "border border-transparent",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-display font-bold truncate flex items-center gap-1.5">
                                  {mine && (
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">
                                      ★
                                    </span>
                                  )}
                                  {rider?.name ?? t("hors.common.unknownRider")}
                                </span>
                                <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full"
                                  style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {badge && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {badge}
                                  </Badge>
                                )}
                                {mine && (
                                  <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">
                                    {t("hors.peloton.yourPick")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {jokerStats.length > 0 && (
                  <div className="rounded-lg border-2 border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08] p-3 md:col-span-2">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                      {t("hors.peloton.mostChosenJokers")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[...jokerStats]
                        .sort((a, b) => b.joker_count - a.joker_count)
                        .slice(0, 6)
                        .map((j) => {
                          const pct = (j.joker_count / Math.max(1, j.total_entries)) * 100;
                          const rider = ridersById[j.rider_id];
                          const mine = jokerIds.includes(j.rider_id);
                          return (
                            <div
                              key={j.rider_id}
                              className={cn(
                                "flex items-center justify-between gap-2 text-sm bg-card rounded p-2 border",
                                mine
                                  ? "border-primary ring-2 ring-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
                                  : "border-border",
                              )}
                            >
                              <span className="font-display font-bold truncate flex items-center gap-1.5">
                                {mine && (
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                                    ★
                                  </span>
                                )}
                                {rider?.name ?? t("hors.common.unknownRider")}
                              </span>
                              <span className="font-mono text-xs tabular-nums">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Voorspellingen */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {t("hors.peloton.predictionsHeader")}
                </p>
              </div>
              {predictionStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("hors.peloton.noPredictions")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CLASSIFICATION_META.map((meta) => {
                    const rows = predictionStats.filter((p) => p.classification === meta.key);
                    if (rows.length === 0) return null;
                    const totalEntries = rows[0]?.total_entries ?? 1;
                    const top = [...rows].sort((a, b) => b.pick_count - a.pick_count).slice(0, 4);
                    return (
                      <div
                        key={meta.key}
                        className={cn("rounded-lg border-2 border-border p-3 bg-gradient-to-br", meta.tint)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <TruiBadge type={meta.trui} formaat="klein" />
                            {meta.key === "gc" ? t("hors.peloton.finalWinner") : thema.truien[meta.trui].naam}
                          </p>
                          {meta.key === "gc" && (
                            <span className="text-[9px] font-mono text-muted-foreground">{t("hors.peloton.position13")}</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {top.map((p) => {
                            const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                            const rider = ridersById[p.rider_id];
                            const mine = myPredictionMap.get(`${meta.key}:${p.position}`) === p.rider_id;
                            const label =
                              pct >= 60 ? t("hors.peloton.labelConsensus") : pct <= 8 ? t("hors.peloton.labelOutsider") : pct <= 20 ? t("hors.peloton.labelDifferential") : null;
                            return (
                              <div
                                key={`${p.rider_id}-${p.position}`}
                                className={cn(
                                  "rounded-md p-2 transition-colors",
                                  mine
                                    ? "ring-2 ring-primary bg-primary/5 border border-primary/40"
                                    : "border border-transparent bg-card/40",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2 text-sm">
                                  <span className="font-display font-bold truncate flex items-center gap-1.5">
                                    {meta.key === "gc" && (
                                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                        P{p.position}
                                      </span>
                                    )}
                                    {mine && (
                                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">
                                        ★
                                      </span>
                                    )}
                                    <span className="truncate">{rider?.name ?? t("hors.common.unknownRider")}</span>
                                  </span>
                                  <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className="h-full"
                                    style={{ width: `${Math.max(4, pct)}%`, background: ownershipColor(pct) }}
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {label && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {label}
                                    </Badge>
                                  )}
                                  {mine && (
                                    <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">
                                      {t("hors.peloton.yourPick")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab 3: De Wielerdirecteur ────────────────────────────────────────── */}
      {k === "wielerdirecteur" && (
        <Card
          className="ornate-frame retro-border overflow-hidden"
          style={{ background: "hsl(var(--bg-wielerdirecteur))" }}
        >
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <DirectorIcon className="h-5 w-5 text-primary" /> {t("hors.wielerdirecteur.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {/* ── Sneak preview: Patlef's voorbeschouwing (voorproefje, geen stand) ── */}
            {isDemo && (
              <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.06] p-5 md:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--vintage-gold))] font-bold">
                    {t("hors.wielerdirecteur.previewHeader")}
                  </span>
                </div>
                {lefeverePreview.data?.directeursAnalyse ? (
                  <>
                    <p className="text-foreground text-sm md:text-base font-serif italic leading-relaxed">
                      "{lefeverePreview.data.directeursAnalyse}"
                    </p>
                    {lefeverePreview.data.ploegKarakterisering && (
                      <p className="mt-2 text-xs text-muted-foreground font-serif">
                        — {lefeverePreview.data.ploegKarakterisering}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground/70 font-serif italic">
                    {lefeverePreview.isError ? t("hors.wielerdirecteur.previewError") : t("hors.wielerdirecteur.previewLoading")}
                  </p>
                )}
              </div>
            )}

            {/* ── Director Report Score ──────────────────────────────────────── */}
            {directorScore && (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6">
                {/* Grade + analysis */}
                <div className="relative flex flex-col md:flex-row items-start gap-5">
                  <div className="shrink-0">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{t("hors.wielerdirecteur.reportEyebrow")}</div>
                    <div
                      className={cn(
                        "font-display text-8xl md:text-9xl font-black tabular-nums leading-none",
                        directorScore.score >= 8
                          ? "text-emerald-600"
                          : directorScore.score >= 6
                            ? "text-amber-600"
                            : directorScore.score >= 4
                              ? "text-orange-600"
                              : "text-rose-600",
                      )}
                    >
                      {directorScore.score.toFixed(1)}
                    </div>
                    <div className="text-muted-foreground/70 text-sm mt-1 font-mono">{t("hors.wielerdirecteur.outOf10")}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Mic className="h-3 w-3 text-[hsl(var(--vintage-gold))]" /> Patrick Lefevere
                    </div>
                    {lefevere.isFetching && !lefevere.data ? (
                      /* On-demand generatie loopt: loading-weergave i.p.v. de
                         statische fallback (die flitste anders even voorbij). */
                      <div>
                        <p className="text-muted-foreground text-sm font-serif italic leading-relaxed animate-pulse">
                          {t("hors.wielerdirecteur.reportLoading")}
                        </p>
                        <div className="mt-2 space-y-1.5" aria-hidden>
                          <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[88%]" />
                          <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[70%]" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground text-sm font-serif italic leading-relaxed">
                        "{lefevere.data?.directeursAnalyse ?? directorScore.analysis}"
                      </p>
                    )}
                  </div>
                </div>
                {/* Metric breakdown */}
                <div className="relative mt-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">{t("hors.wielerdirecteur.scoreBreakdown")}</div>
                    <button
                      type="button"
                      onClick={() => setShowScoreInfo((v) => !v)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors",
                        showScoreInfo
                          ? "bg-secondary border-border text-foreground"
                          : "bg-sky-100 border-sky-300 text-sky-700 hover:bg-sky-200",
                      )}
                    >
                      {showScoreInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                      {showScoreInfo ? t("hors.wielerdirecteur.close") : t("hors.wielerdirecteur.howWorks")}
                    </button>
                  </div>

                  {/* Explanation panel */}
                  {showScoreInfo && (
                    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 text-[11px] text-foreground/70 leading-relaxed">
                      <p className="text-foreground font-semibold text-xs">{t("hors.wielerdirecteur.info.title")}</p>
                      <p>
                        <Trans i18nKey="hors.wielerdirecteur.info.intro" components={{ mono: <span className="text-foreground font-mono" /> }} />
                      </p>
                      <div className="space-y-2.5">
                        <div className="flex gap-2">
                          <span className="shrink-0">🏆</span>
                          <div>
                            <span className="text-foreground font-semibold">{t("hors.wielerdirecteur.info.poolHead")}</span>
                            <p className="mt-0.5">{t("hors.wielerdirecteur.info.poolBody")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🐒</span>
                          <div>
                            <span className="text-foreground font-semibold">{t("hors.wielerdirecteur.info.monkeyHead")}</span>
                            <p className="mt-0.5">{t("hors.wielerdirecteur.info.monkeyBody")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🃏</span>
                          <div>
                            <span className="text-foreground font-semibold">{t("hors.wielerdirecteur.info.jokerHead")}</span>
                            <p className="mt-0.5">{t("hors.wielerdirecteur.info.jokerBody")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🎯</span>
                          <div>
                            <span className="text-foreground font-semibold">{t("hors.wielerdirecteur.info.diffHead")}</span>
                            <p className="mt-0.5">
                              <Trans i18nKey="hors.wielerdirecteur.info.diffBody" components={{ bold: <span className="text-foreground font-semibold" />, mono: <span className="font-mono" /> }} />
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Berekening knop */}
                      <button
                        type="button"
                        onClick={() => setShowCalc((v) => !v)}
                        className="mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        {showCalc ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                        {showCalc ? t("hors.wielerdirecteur.calc.hide") : t("hors.wielerdirecteur.calc.show")}
                      </button>

                      {showCalc && (
                        <div className="rounded-lg border border-amber-200 bg-secondary/60 p-3 space-y-3 font-mono text-[10px] text-foreground/70 leading-relaxed">
                          <p className="text-amber-700 font-semibold text-[11px] not-italic">{t("hors.wielerdirecteur.calc.exactFormulas")}</p>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              {t("hors.wielerdirecteur.calc.poolSection")}
                            </p>
                            <p className="text-foreground">{t("hors.wielerdirecteur.calc.poolFormula")}</p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.poolNote")}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              {t("hors.wielerdirecteur.calc.monkeySection")}
                            </p>
                            <p className="text-foreground">monkeyScore = beatPct / 100</p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.monkeyNote1")}
                            </p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.monkeyNote2")}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              {t("hors.wielerdirecteur.calc.jokerSection")}
                            </p>
                            <p className="text-foreground">{t("hors.wielerdirecteur.calc.jokerFormula1")}</p>
                            <p className="text-foreground">{t("hors.wielerdirecteur.calc.jokerFormula2")}</p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.jokerNote")}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              {t("hors.wielerdirecteur.calc.diffSection")}
                            </p>
                            <p className="text-foreground">{t("hors.wielerdirecteur.calc.diffFormula1")}</p>
                            <p className="text-foreground">{t("hors.wielerdirecteur.calc.diffFormula2")}</p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.diffNote1")}
                            </p>
                            <p className="text-muted-foreground text-[9px]">
                              {t("hors.wielerdirecteur.calc.diffNote2")}
                            </p>
                          </div>

                          <div className="border-t border-border pt-2 space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">{t("hors.wielerdirecteur.calc.finalSection")}</p>
                            <p className="text-foreground">raw = pool×0.45 + monkey×0.25 + joker×0.20 + diff×0.10</p>
                            <p className="text-foreground">score = max(3.0, round((raw × 9 + 1) × 10) / 10)</p>
                            <p className="text-muted-foreground text-[9px]">{t("hors.wielerdirecteur.calc.finalNote")}</p>
                          </div>

                          <div className="border-t border-border pt-2 space-y-1">
                            <p className="text-amber-700 font-semibold text-[10px] not-italic">{t("hors.wielerdirecteur.calc.exampleTitle")}</p>
                            <p className="text-muted-foreground text-[9px]">{t("hors.wielerdirecteur.calc.exampleGiven")}</p>
                            <p className="text-foreground">pool = (50−8)/49 = 0.857</p>
                            <p className="text-foreground">joker = 0.3 + (64/100)×0.7 = 0.748</p>
                            <p className="text-foreground">raw = 0.45·0.857 + 0.25·0.72 + 0.20·0.748 + 0.10·0.55 = 0.770</p>
                            <p className="text-foreground">score = (0.770×9 + 1) = 7.9</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/70 -mt-1">{t("hors.wielerdirecteur.clickOpen")}</p>

                  {([
                    { key: "pool",   label: "Pool Ranking",        sub: directorScore.rankLabel,  pct: directorScore.poolScore,   val: directorScore.poolSubScore,   w: 45 },
                    { key: "monkey", label: "Monkey Vergelijking", sub: directorScore.beatLabel,  pct: directorScore.monkeyScore, val: directorScore.monkeySubScore, w: 25 },
                    { key: "joker",  label: "Joker Prestatie",     sub: directorScore.jokerLabel, pct: directorScore.jokerScore,  val: directorScore.jokerSubScore,  w: 20 },
                    { key: "diff",   label: "Differentiaal",       sub: directorScore.diffLabel,  pct: directorScore.diffScore,   val: directorScore.diffSubScore,   w: 10 },
                  ] as const).map(({ key, label, sub, pct, val, w }) => {
                    const tone = pct >= 0.7 ? "emerald" : pct >= 0.4 ? "amber" : "rose";
                    const barCls = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
                    const chipCls =
                      tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : tone === "amber" ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-rose-50 text-rose-700 border-rose-300";
                    const open = openComponent === key;
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => setOpenComponent(open ? null : key)}
                          className={cn(
                            "w-full flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg text-left transition-colors hover:bg-secondary/40",
                            open && "bg-secondary/40",
                          )}
                        >
                          <div className="w-44 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-foreground text-sm font-semibold leading-none">{label}</span>
                              <span className="shrink-0 text-[10px] font-bold font-mono tabular-nums text-muted-foreground bg-secondary border border-border rounded px-1 py-0.5 leading-none">
                                {w}%
                              </span>
                            </div>
                            <div className="text-muted-foreground text-[11px] mt-1">{sub}</div>
                          </div>
                          <div className="flex-1 h-3 rounded-full bg-secondary/80 overflow-hidden ring-1 ring-inset ring-border/50">
                            <div className={cn("h-full rounded-full", barCls)} style={{ width: `${Math.round(pct * 100)}%` }} />
                          </div>
                          <span className={cn("shrink-0 inline-flex items-baseline gap-0.5 rounded-md border px-2 py-1 font-mono font-bold tabular-nums text-lg", chipCls)}>
                            {val.toFixed(1)}<span className="text-[10px] font-normal opacity-60">/10</span>
                          </span>
                          <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
                        </button>

                        {open && (
                          <div className="mt-1 mb-2 rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-foreground/80 leading-relaxed space-y-2">
                            {key === "pool" && (
                              <>
                                <p className="font-mono text-foreground">{t("hors.wielerdirecteur.calc.poolFormula")}</p>
                                <p className="font-mono text-foreground">= ({directorScore.totaal} − {directorScore.rang}) / ({directorScore.totaal} − 1) = {directorScore.poolScore.toFixed(2)}</p>
                                <p className="text-muted-foreground">{t("hors.wielerdirecteur.detail.pool", { total: directorScore.totaal, rank: directorScore.rang })}</p>
                              </>
                            )}
                            {key === "monkey" && (
                              <>
                                <p className="font-mono text-foreground">monkeyScore = beatPct / 100 = {directorScore.beatPct.toFixed(0)} / 100 = {directorScore.monkeyScore.toFixed(2)}</p>
                                <p className="text-muted-foreground">{t("hors.wielerdirecteur.detail.monkey", { pct: directorScore.beatPct.toFixed(0) })}</p>
                              </>
                            )}
                            {key === "joker" && (
                              directorScore.aantalJokers === 0 ? (
                                <p className="text-muted-foreground">{t("hors.wielerdirecteur.detail.noJokers")}</p>
                              ) : (
                                <>
                                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[10px]">
                                    <span className="text-muted-foreground/70 uppercase tracking-wider">{t("hors.wielerdirecteur.detail.yourJoker")}</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">{t("hors.wielerdirecteur.detail.points")}</span>
                                    {directorScore.jokerDetail.rows.map((r) => (
                                      <Fragment key={r.name}>
                                        <span className="truncate text-foreground">{r.name}</span>
                                        <span className="text-right font-mono tabular-nums text-foreground">{r.pts}</span>
                                      </Fragment>
                                    ))}
                                  </div>
                                  <p className="font-mono text-foreground">rendement = {directorScore.jokerDetail.yourPts} / {directorScore.jokerDetail.bestPts} = {directorScore.jokerDetail.rendementPct}%</p>
                                  <p className="font-mono text-foreground">jokerScore = 0.3 + {(directorScore.jokerDetail.rendementPct / 100).toFixed(2)} × 0.7 = {directorScore.jokerScore.toFixed(2)}</p>
                                  <p className="text-muted-foreground">{t("hors.wielerdirecteur.detail.jokerNote")}</p>
                                </>
                              )
                            )}
                            {key === "diff" && (
                              <>
                                <p className="text-[10px] text-muted-foreground leading-snug">
                                  <Trans i18nKey="hors.wielerdirecteur.detail.diffIntro" components={{ mono: <span className="font-mono text-foreground" />, green: <span className="text-emerald-600 font-semibold" />, red: <span className="text-rose-500 font-semibold" /> }} />
                                </p>
                                {directorScore.diffDetail.rows.length > 0 ? (
                                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-[10px]">
                                    <span className="text-muted-foreground/70 uppercase tracking-wider">{t("hors.wielerdirecteur.detail.rider")}</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">{t("hors.wielerdirecteur.detail.chosen")}</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">{t("hors.wielerdirecteur.detail.points")}</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">{t("hors.wielerdirecteur.detail.contribution")}</span>
                                    {directorScore.diffDetail.rows.map((r) => (
                                      <Fragment key={r.name}>
                                        <span className="truncate text-foreground">{r.name}</span>
                                        <span className={cn("text-right font-mono tabular-nums", r.ownPct <= 25 ? "text-emerald-600" : r.ownPct >= 60 ? "text-rose-500" : "text-foreground/70")}>{r.ownPct}%</span>
                                        <span className="text-right font-mono tabular-nums text-foreground/70">{r.pts}</span>
                                        <span className="text-right font-mono tabular-nums font-semibold text-foreground">+{r.bijdrage}</span>
                                      </Fragment>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">{t("hors.wielerdirecteur.detail.noScoringPicks")}</p>
                                )}
                                {directorScore.diffDetail.scorers > directorScore.diffDetail.rows.length && (
                                  <p className="text-[9px] text-muted-foreground/60">{t("hors.wielerdirecteur.detail.moreRows", { count: directorScore.diffDetail.scorers - directorScore.diffDetail.rows.length })}</p>
                                )}
                                <p className="font-mono text-foreground">diffScore = Σ bijdrage / Σ punten = {directorScore.diffScore.toFixed(2)}</p>
                              </>
                            )}
                            <p className="font-mono text-foreground pt-1">
                              {t("hors.wielerdirecteur.detail.subGradeFormula", { pct: pct.toFixed(2), val: val.toFixed(1) })}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t("hors.wielerdirecteur.detail.subGradeNote")}
                            </p>
                            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/60 px-3 py-2 mt-1">
                              <span className="text-xs text-muted-foreground">{t("hors.wielerdirecteur.detail.subGrade", { pct: w })}</span>
                              <span className="text-base font-mono font-bold text-foreground">{val.toFixed(1)}/10</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!directorAnalysis && (
              <p className="text-sm text-muted-foreground">{t("hors.wielerdirecteur.emptyTeam")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: The Emirates — de droomploeg achterop gezien ─────────────────── */}
      {k === "superteam" && (
        <Card className="ornate-frame retro-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <Crown className="h-5 w-5 text-[hsl(var(--vintage-gold))]" /> The Emirates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            {/* Intro — info-knop met dropdown (uitleg op aanvraag) */}
            <div>
              <button
                type="button"
                onClick={() => setShowEmiratesInfo((v) => !v)}
                aria-expanded={showEmiratesInfo}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors",
                  showEmiratesInfo
                    ? "bg-secondary border-border text-foreground"
                    : "bg-sky-100 border-sky-300 text-sky-700 hover:bg-sky-200",
                )}
              >
                {showEmiratesInfo ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                {t("hors.emirates.whatIsThis")}
              </button>
              {showEmiratesInfo && (
                <div className="mt-2 rounded-xl border border-foreground/15 bg-gradient-to-br from-[hsl(var(--vintage-gold))/0.10] to-card p-3 md:p-4 space-y-2">
                  <p className="font-serif text-sm text-foreground/85 leading-snug">
                    {t("hors.emirates.explain1")}
                  </p>
                  <p className="font-serif text-sm text-foreground/85 leading-snug">
                    {t("hors.emirates.explain2")}
                  </p>
                </div>
              )}
            </div>

            {/* Benchmark: eigen ploeg vs droomploeg — teaser + uitklapbare
                vergelijking. Alleen met ingediende ploeg én gefiatteerde etappe
                (memo geeft anders null → niets, geen lege 0%). */}
            {emiratesBenchmark && <EmiratesBenchmark data={emiratesBenchmark} />}

            {emiratesData.lastStage === null ? (
              <div className="text-center py-8 space-y-3">
                <Lock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="font-display text-lg font-bold">{t("hors.emirates.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
                  {t("hors.emirates.emptyBody")}
                </p>
              </div>
            ) : (
              <>
                {/* As-of subtitle */}
                <div className="vintage-ornament">
                  <span className="vintage-ornament-symbol">✦</span>
                  <span className="font-serif italic text-xs md:text-sm text-muted-foreground tracking-wide text-center">
                    {t("hors.emirates.upToStage", { number: emiratesData.lastStage.number })}
                    {emiratesData.lastStage.name ? ` — ${emiratesData.lastStage.name}` : ""}
                  </span>
                  <span className="vintage-ornament-symbol">✦</span>
                </div>

                {/* Hero — de droomploeg */}
                <div
                  className="relative overflow-hidden rounded-2xl border-2 border-[hsl(var(--vintage-gold))] p-5 md:p-7 shadow-[3px_3px_0_hsl(var(--vintage-gold)/0.5)]"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--vintage-gold) / 0.22), hsl(var(--vintage-gold) / 0.06) 60%, hsl(var(--card)))",
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.07] pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1.5px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  {/* Blok-titel bovenin */}
                  <div className="relative font-display font-black uppercase tracking-[0.18em] text-sm md:text-base text-[hsl(var(--vintage-gold))] mb-3">
                    {t("hors.emirates.dreamTeam")}
                  </div>
                  <div className="relative flex items-start gap-4 md:gap-5">
                    <div className="shrink-0 flex flex-col items-center">
                      <Crown className="h-9 w-9 md:h-11 md:w-11 text-[hsl(var(--vintage-gold))]" strokeWidth={2.2} />
                      <span className="font-display text-[9px] md:text-[10px] uppercase tracking-[0.04em] leading-tight text-muted-foreground mt-1.5 text-center whitespace-nowrap">
                        {t("hors.emirates.dreamTeamShort")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1 font-serif">
                        {t("hors.emirates.maxAchievable")}
                      </div>
                      <h3 className="font-display font-black text-2xl md:text-4xl leading-tight">
                        {t("hors.emirates.whatToPick")}
                      </h3>
                      <p className="font-serif italic text-sm text-muted-foreground mt-0.5">
                        {t("hors.emirates.topPerCategory")}
                      </p>
                      {(() => {
                        const me = emiratesData.ranking.find((r) => r.isMe);
                        const pct =
                          me && emiratesData.total > 0
                            ? Math.round((me.points / emiratesData.total) * 100)
                            : null;
                        return (
                          <div className="mt-3">
                            <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
                              <span className="font-display font-black text-4xl md:text-6xl tabular-nums text-[hsl(var(--vintage-gold))] leading-none">
                                {emiratesData.total}
                                <span className="ml-1 text-base md:text-xl font-serif italic text-muted-foreground">{t("hors.emirates.pt")}</span>
                              </span>
                              {pct !== null && (
                                <>
                                  <span aria-hidden className="font-display text-3xl md:text-5xl text-muted-foreground/45 leading-none">·</span>
                                  <span className="font-display font-black text-4xl md:text-6xl tabular-nums text-[hsl(var(--vintage-gold))] leading-none">
                                    {pct}%
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="mt-1.5 text-sm font-serif italic text-muted-foreground">
                              {t("hors.emirates.maxOverStages", { count: emiratesData.stagesCount })}
                              {pct !== null ? t("hors.emirates.yourTeamSuffix", { points: me!.points }) : ""}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Comparison: leader & own score vs droomploeg */}
                {emiratesData.ranking.length > 0 &&
                  emiratesData.total > 0 &&
                  (() => {
                    const leader = emiratesData.ranking[0];
                    const me = emiratesData.ranking.find((r) => r.isMe);
                    const pct = (p: number) =>
                      emiratesData.total > 0 ? Math.round((p / emiratesData.total) * 100) : 0;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border-2 border-[hsl(var(--maillot-jaune))/0.7] bg-[hsl(var(--maillot-jaune))/0.08] p-3 md:p-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <JerseyBadge color="yellow" size={14} />
                            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-serif">
                              {t("hors.emirates.currentLeader")}
                            </span>
                          </div>
                          <p className="font-display font-bold text-base md:text-lg leading-tight truncate">
                            {leader.teamName}
                          </p>
                          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                            <span className="font-display font-black text-2xl md:text-3xl tabular-nums">
                              {leader.points}
                            </span>
                            <span className="text-xs font-serif italic text-muted-foreground">
                              {t("hors.emirates.pctOfDreamTeam", { pct: pct(leader.points) })}
                            </span>
                          </div>
                        </div>
                        {me && (
                          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3 md:p-4">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-serif mb-1">
                              {t("hors.emirates.yourScore")}
                            </div>
                            <p className="font-display font-bold text-base md:text-lg leading-tight truncate text-primary">
                              {me.teamName}
                            </p>
                            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                              <span className="font-display font-black text-2xl md:text-3xl tabular-nums text-primary">
                                {me.points}
                              </span>
                              <span className="text-xs font-serif italic text-muted-foreground">
                                {t("hors.emirates.pctOfDreamTeam", { pct: pct(me.points) })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {/* De selectie — per categorie (desktop: 2-koloms grid, mobiel: stack) */}
                {emiratesData.picks.length > 0 ? (
                  <div className="space-y-3">
                    <div className="vintage-ornament">
                      <span className="vintage-ornament-symbol">✦</span>
                      <span className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        {t("hors.emirates.selection")}
                      </span>
                      <span className="vintage-ornament-symbol">✦</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {emiratesData.picks.map((cat) => (
                        <div key={cat.categoryId} className="rounded-xl border border-border bg-card overflow-hidden">
                          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-secondary/40 border-b border-border">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-display font-bold text-sm uppercase tracking-wider truncate">
                                {cat.categoryName}
                              </span>
                              <span className="text-[10px] font-serif italic text-muted-foreground shrink-0">
                                {t("hors.emirates.picks", { count: cat.maxPicks })}
                              </span>
                            </div>
                            <span className="font-display font-black tabular-nums text-[hsl(var(--vintage-gold))] shrink-0">
                              {t("hors.emirates.ptValue", { value: cat.subtotal })}
                            </span>
                          </div>
                          <ol className="divide-y divide-border">
                            {cat.riders.length === 0 ? (
                              <li className="px-3 py-2 text-sm text-muted-foreground font-serif italic">
                                {t("hors.emirates.nobodyScoredCat")}
                              </li>
                            ) : (
                              cat.riders.map((r, i) => (
                                <li key={r.riderId} className="flex items-center gap-2 md:gap-3 px-3 py-2 text-sm">
                                  <span className="font-display font-bold text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
                                    {i + 1}.
                                  </span>
                                  {r.startNumber !== null && (
                                    <span className="font-display font-bold tabular-nums text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded shrink-0">
                                      {r.startNumber}
                                    </span>
                                  )}
                                  <span className="flex-1 truncate font-sans font-medium">{r.name}</span>
                                  <span className="font-display font-bold tabular-nums shrink-0">{r.points}</span>
                                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                                    {t("hors.emirates.ptUpper")}
                                  </span>
                                </li>
                              ))
                            )}
                          </ol>
                        </div>
                      ))}
                    </div>

                    {/* Jokers (x1) */}
                    {emiratesData.jokers.length > 0 && (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-secondary/40 border-b border-border">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--vintage-gold))] shrink-0 self-center" />
                            <span className="font-display font-bold text-sm uppercase tracking-wider truncate">
                              {t("hors.emirates.jokers")}
                            </span>
                            <span className="text-[10px] font-serif italic text-muted-foreground shrink-0">
                              {t("hors.emirates.jokersPicks")}
                            </span>
                          </div>
                          <span className="font-display font-black tabular-nums text-[hsl(var(--vintage-gold))] shrink-0">
                            {t("hors.emirates.ptValue", { value: emiratesData.jokerSubtotal })}
                          </span>
                        </div>
                        <ol className="divide-y divide-border">
                          {emiratesData.jokers.map((r, i) => (
                            <li key={r.riderId} className="flex items-center gap-2 md:gap-3 px-3 py-2 text-sm">
                              <span className="font-display font-bold text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
                                {i + 1}.
                              </span>
                              {r.startNumber !== null && (
                                <span className="font-display font-bold tabular-nums text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded shrink-0">
                                  {r.startNumber}
                                </span>
                              )}
                              <span className="flex-1 truncate font-sans font-medium">{r.name}</span>
                              <span className="font-display font-bold tabular-nums shrink-0">{r.points}</span>
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                                {t("hors.emirates.ptUpper")}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Totaal-rij */}
                    <div className="rounded-xl border-2 border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.08] px-3 py-2.5 flex items-center justify-between">
                      <span className="font-display font-black text-sm uppercase tracking-widest">
                        {t("hors.emirates.totalDreamTeam")}
                      </span>
                      <span className="font-display font-black text-lg tabular-nums text-[hsl(var(--vintage-gold))]">
                        {t("hors.emirates.ptValue", { value: emiratesData.total })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground font-serif italic">{t("hors.emirates.selectionLoading")}</p>
                  </div>
                )}

                {/* Footnote */}
                <div className="mop-card p-3 -rotate-[0.3deg]">
                  <p className="font-serif italic text-xs md:text-sm leading-snug">
                    {t("hors.emirates.explain1")}
                  </p>
                  <p className="font-serif italic text-xs md:text-sm leading-snug mt-2">
                    {t("hors.emirates.explain2")}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
          </div>
        )}
      />

      {/* ── MOBIEL: één consistente zwevende schakelaar (menu-modus). ── */}
      <FloatingTabSwitcher
        tabs={HORS_TABS.map((tab) => ({ key: tab.key, label: tabLabel(tab.key), icon: tab.Icon }))}
        active={activeTab}
        onChange={(k) => setActiveTab(k as HorsTabKey)}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="ornate-frame retro-border relative overflow-hidden text-center p-3">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))]" />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-sans">{sub}</p>}
    </div>
  );
}
