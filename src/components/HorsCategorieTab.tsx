import { Fragment, useEffect, useMemo, useState } from "react";
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
import MonkeyExplainerModal from "@/components/horscat/MonkeyExplainerModal";
import PercentileVerdict from "@/components/horscat/PercentileVerdict";
import AapscoreDistributie from "@/components/horscat/AapscoreDistributie";
import { useStages, useGameStandings, useStagePointsForEntries, useStageAverages } from "@/hooks/useResults";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock, Activity, Trophy, BarChart3, Sparkles, Info, X, Swords, Crown, Mic, ChevronDown } from "lucide-react";
import BenchmarkTab from "@/components/BenchmarkTab";
import { MobielTabBalk } from "@/components/MobielTabBalk";
import JerseyBadge from "@/components/retro/JerseyBadge";
import TruiBadge from "@/components/retro/TruiBadge";
import { useThema } from "@/contexts/ThemaContext";
import type { TruiType } from "@/lib/themas";
import { useLefevereReport } from "@/hooks/useLefevereReport";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";

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
    staleTime: 60 * 1000,
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
function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

function snapToBucket(dist: Array<{ bucket: number }>, value: number): number {
  return dist.reduce((best, b) => (Math.abs(b.bucket - value) < Math.abs(best.bucket - value) ? b : best)).bucket;
}

function getNickname(beatPct: number) {
  if (beatPct >= 99) return { title: "Koningsklasse", emoji: "👑", good: true };
  if (beatPct >= 90) return { title: "Wielerdirecteur", emoji: "🏆", good: true };
  if (beatPct >= 70) return { title: "Aap-Slayer", emoji: "⚔️", good: true };
  if (beatPct >= 50) return { title: "Menselijk Voordeel", emoji: "💪", good: true };
  if (beatPct >= 30) return { title: "Nek-aan-Nek", emoji: "🤝", good: false };
  if (beatPct >= 10) return { title: "Monkey Business", emoji: "🐒", good: false };
  return { title: "Koersinstinct", emoji: "🎯", good: false };
}

// SVG semicircle gauge — animates on mount
function PercentileGauge({ pct }: { pct: number }) {
  const r = 50,
    cx = 65,
    cy = 62,
    sw = 9;
  const circ = Math.PI * r;
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);
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
        strokeDashoffset={`${animated ? offset : circ}`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)" }}
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

export default function HorsCategorieTab({ initialTab, gameId: gameIdProp, gameStatus }: { initialTab?: HorsTabKey; gameId?: string; gameStatus?: string } = {}) {
  const { thema } = useThema();
  const { data: curGame } = useCurrentGame();
  // Optioneel een specifieke (bv. afgeronde) game tonen i.p.v. de live game.
  const game = gameIdProp ? { id: gameIdProp, status: gameStatus } : curGame;
  const isLive = Boolean(game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)));
  const { entry, picksByCategory, jokerIds, predictions: myPredictions } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: pickStats = [] } = usePickStats(isLive ? game?.id : undefined);
  const { data: jokerStats = [] } = useJokerStats(isLive ? game?.id : undefined);
  const { data: predictionStats = [] } = usePredictionStats(isLive ? game?.id : undefined);
  const { data: myStageTotal = 0 } = useMyStagePointTotal(entry?.id);
  const hcGameId = isLive ? game?.id : undefined;

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
    enabled: Boolean(supabase && isLive && game?.id),
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
    enabled: Boolean(supabase && isLive && game?.id),
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
    const N = 5000;
    if (categories.length === 0 || pickStats.length === 0) return null;
    const meanTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const byCat = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = byCat.get(p.category_id) ?? [];
      arr.push(p);
      byCat.set(p.category_id, arr);
    }
    const totalSlots = categories.reduce((s, c) => s + (c.max_picks ?? 1), 0) || 1;
    const baselinePerSlot = meanTotal / totalSlots;
    const riderWeight = new Map<string, number>();
    for (const [, list] of byCat) {
      const max = Math.max(1, ...list.map((p) => p.pick_count));
      for (const p of list) {
        const r = p.pick_count / max;
        riderWeight.set(p.rider_id, 0.4 + r * 1.2);
      }
    }
    const rng = seededRandom(game?.id?.split("-").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42);
    const scoreFromRiderIds = (riderIds: string[]) => {
      let s = 0;
      for (const rid of riderIds) {
        const w = riderWeight.get(rid) ?? 0.7;
        s += baselinePerSlot * w * (0.7 + rng() * 0.6);
      }
      return s;
    };
    const randomScores: number[] = [];
    for (let i = 0; i < N; i++) {
      const team: string[] = [];
      for (const cat of categories) {
        const pool = (byCat.get(cat.id) ?? []).map((p) => p.rider_id);
        if (pool.length === 0) continue;
        team.push(...pickN(pool, cat.max_picks ?? 1, rng));
      }
      randomScores.push(scoreFromRiderIds(team));
    }
    randomScores.sort((a, b) => a - b);
    const userPicks: string[] = [];
    for (const cat of categories) {
      const arr = picksByCategory.get(cat.id) ?? [];
      userPicks.push(...arr);
    }
    const userActual = userPicks.length ? myStageTotal : 0;
    const mean = randomScores.reduce((a, b) => a + b, 0) / randomScores.length;
    const mid = Math.floor(randomScores.length / 2);
    const median = randomScores.length % 2 === 0 ? (randomScores[mid - 1] + randomScores[mid]) / 2 : randomScores[mid];
    const top10cut = randomScores[Math.floor(randomScores.length * 0.9)];
    const beatPct =
      randomScores.length === 0 ? 0 : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
    const aboveMedian = userActual > median ? 100 : 0;
    const top10 = userActual > top10cut;
    const worseThanApe = beatPct < 50;
    const min = randomScores[0];
    const max = randomScores[randomScores.length - 1];
    const buckets = 20;
    const step = Math.max(1, (max - min) / buckets);
    const dist = Array.from({ length: buckets }, (_, i) => {
      const from = min + i * step;
      const to = from + step;
      const count = randomScores.filter((s) => s >= from && s < to).length;
      return { bucket: Math.round((from + to) / 2), count };
    });
    return { mean, median, top10cut, beatPct, top10, worseThanApe, aboveMedian, userActual, dist };
  }, [categories, pickStats, totals, picksByCategory, myStageTotal, game?.id]);

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
        teamName: r.team_name?.trim() || r.display_name?.trim() || "Naamloze ploeg",
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
    };
  }, [stages, categories, allStageResults, standRows, entry?.id, allGameRiders]);

  // ── Derived display values ──────────────────────────────────────────────────
  const diffPct = monte && monte.mean > 0 ? ((monte.userActual - monte.mean) / monte.mean) * 100 : 0;
  const isBeating = diffPct >= 0;
  const nickname = monte ? getNickname(monte.beatPct) : null;
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
    if (!isLive || !entry || picksByCategory.size === 0) return null;
    const myPickIds = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) myPickIds.add(id);
    const ownershipByRider = new Map<string, number>();
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    for (const p of pickStats) ownershipByRider.set(p.rider_id, p.pick_count / Math.max(1, totalEntries));
    const myOwnerships = Array.from(myPickIds).map((rid) => ownershipByRider.get(rid) ?? 0);
    const avgOwn = myOwnerships.length ? myOwnerships.reduce((a, b) => a + b, 0) / myOwnerships.length : 0;
    const uniques = myOwnerships.filter((o) => o < 0.15).length;
    const labels: string[] = [];
    if (uniques >= 4) labels.push("Pure chaos");
    if (avgOwn > 0.45) labels.push("Pelotonkoers");
    if (avgOwn < 0.25) labels.push("Aanvallende ploeg");
    const lines: string[] = [];
    if (avgOwn > 0.5) lines.push("Je peloton kiest wat iedereen kiest. Een veilige bidon, geen spektakel.");
    else if (avgOwn < 0.2) lines.push("Met deze differentiëlen mik je óf op het podium óf op de bezemwagen.");
    if (uniques >= 3) lines.push(`${uniques} renners die nauwelijks iemand koos. Lef of waanzin?`);
    const day = new Date().getDate();
    const quotes = [
      "Vandaag zou jouw ploeg waarschijnlijk lossen op de eerste col.",
      "Je ploeg ademt: all-in op chaos.",
      "Vier sprinters meenemen naar deze bergen? Ambitieuze tactiek.",
      "Het peloton vertrouwt op Pogačar. Jij vertrouwt op hoop.",
      "Deze ploeg heeft de organisatie van een vroege vlucht in een regenrit.",
    ];
    return { labels, lines, quote: quotes[day % quotes.length] };
  }, [isLive, entry, picksByCategory, pickStats]);

  // ── Director Report Score ────────────────────────────────────────────────────
  const directorScore = useMemo(() => {
    if (!isLive || !entry || !monte) return null;

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
      [
        9.0,
        "Koningsklasse prestatie — jouw peloton rijdt vooraan. De simulatieapen trillen in hun startblokken en je klassement spreekt boekdelen. Ik had je zelf kunnen samenstellen.",
      ],
      [
        8.0,
        "Uitstekend directeurswerk dit seizoen. Je klassement loopt voor op het peloton en de dartpijlaap zit in de volgauto. Met wat meer differentiëlen pak je de overwinning.",
      ],
      [
        7.0,
        "Solide Giro tot dusver. Je scoort boven de mediaan, je renners rijden hun loon bij elkaar. We zien ons op de Zoncolan.",
      ],
      [
        6.0,
        "Respectabele prestatie — de directeur knikt, maar kijkt scherp. Je ploeg levert, al is de marge dunner dan de bandjes van Tadej op de Col de la Loze.",
      ],
      [
        5.0,
        "Midveld, en dat is eerlijk gezegd precies wat het voelt. De apen rijden mee op jouw wiel — niet verloren, maar ook geen sprint voor de zege.",
      ],
      [
        4.0,
        "Moeilijk parcours voor jouw ploeg dit seizoen. De simulatieapen presteren vergelijkbaar en je klassering staat onder druk. Herbezin je voor de volgende editie.",
      ],
      [
        0.0,
        "Zwaar seizoen. De cijfers liegen niet, en ik evenmin. Je ploeg verliest op alle fronten. De bezemwagen wacht — maar Rome werd ook niet in één dag gebouwd.",
      ],
    ];
    const analysis = analysisMap.find(([t]) => score >= t)?.[1] ?? analysisMap[analysisMap.length - 1][1];

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
      rankLabel: `Rang #${myRank} van ${n}`,
      beatLabel: `${monte.beatPct.toFixed(0)}% apen verslagen`,
      jokerLabel: jokerIds.length === 0 ? "Geen jokers" : `${jokerIds.length} joker${jokerIds.length > 1 ? "s" : ""}`,
      diffLabel: diffDetail.scorers === 0 ? "Nog geen scorende picks" : `${diffDetail.scorers} scorende picks · gem. ${diffDetail.avgOwnPct}% gekozen`,
      diffDetail,
      jokerDetail,
    };
  }, [isLive, entry, monte, totals, myStageTotal, jokerIds, jokerStats, allStageResults, allGameRiders, categories, picksByCategory, pickStats]);

  // ── Sub-tab state (must be declared before any early return to keep hook order stable) ──
  const [activeTab, setActiveTab] = useState<HorsTabKey>(initialTab ?? "dartpijl");
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [openComponent, setOpenComponent] = useState<string | null>(null);

  // ── Lefevere directeursanalyse (LLM) — gedeelde input via useHorsCategorieSummary,
  //    zodat de tekst 1-op-1 identiek is aan die in de Gazetta-feed. ──
  const horsSummary = useHorsCategorieSummary(gameIdProp ? { id: gameIdProp, status: gameStatus } : undefined);
  const lefevere = useLefevereReport(horsSummary.lefevereInput, {
    entryId: horsSummary.entryId,
    stageCount: horsSummary.stageCount,
    enabled: activeTab === "wielerdirecteur" && Boolean(horsSummary.lefevereInput),
  });

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!isLive) {
    return (
      <Card className="ornate-frame retro-border">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <p className="font-display text-xl font-bold">Hors Catégorie nog vergrendeld</p>
          <p className="text-sm text-muted-foreground font-serif italic">
            De data cave gaat open zodra de admin de inschrijving sluit en de koers live zet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">
      {/* ── Sub-tab navigation ─────────────────────────────────────────────── */}

      {/* Mobile — MobielTabBalk (scrollable chips) */}
      <div className="md:hidden">
        <MobielTabBalk
          tabs={[
            { key: "dartpijl", label: "Dartpijl", icon: Activity },
            { key: "pelotonkeuzes", label: "Pelotonkeuzes", icon: BarChart3 },
            { key: "wielerdirecteur", label: "De Wielerdirecteur", icon: DirectorIcon },
            { key: "superteam", label: "The Emirates", icon: Crown },
            { key: "benchmark", label: "Benchmark", icon: Swords },
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as typeof activeTab)}
        />
      </div>

      {/* Desktop — bestaande chip-balk ongewijzigd */}
      <div className="hidden md:block overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1 rounded-[9px] border-2 border-foreground/15 bg-secondary/30 p-1 min-w-max md:min-w-0 md:w-full">
          {[
            { key: "dartpijl" as const, label: "Dartpijl", short: "Dart", Icon: Activity },
            { key: "pelotonkeuzes" as const, label: "Pelotonkeuzes", short: "Peloton", Icon: BarChart3 },
            { key: "wielerdirecteur" as const, label: "De Wielerdirecteur", short: "CEO", Icon: DirectorIcon },
            { key: "superteam" as const, label: "The Emirates", short: "UAE", Icon: Crown },
            { key: "benchmark" as const, label: "Benchmark", short: "Bench", Icon: Swords },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 min-h-[44px] text-xs font-display font-semibold uppercase tracking-wider transition-colors flex-1",
                activeTab === key
                  ? "bg-card text-foreground shadow-sm border border-foreground/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Benchmark ───────────────────────────────────────────────── */}
      {activeTab === "benchmark" && <BenchmarkTab gameId={game?.id} />}

      {/* ── Tab 1: Dartpijl (Monte Carlo) ───────────────────────────────────── */}
      {activeTab === "dartpijl" && (
        <div className="space-y-5">
          {!monte ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
              <span className="text-4xl">🐒</span>
              <p className="text-muted-foreground text-sm mt-3 font-serif italic">
                Nog onvoldoende data om de apen te laten gooien.
              </p>
            </div>
          ) : (
            <>
              {/* ── Uitleg-laag: titel + ⓘ + percentile + verdict ─────────── */}
              <div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                        fontWeight: 900,
                        color: "var(--ink-sepia)",
                        fontSize: "clamp(22px, 4vw, 28px)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        lineHeight: 1.05,
                      }}
                    >
                      <span aria-hidden className="animate-monkey-idle" style={{ marginRight: 6 }}>🐒</span>
                      De aap met de dartpijl
                    </h2>
                    <p
                      style={{
                        fontFamily: "'Source Serif 4',Georgia,serif",
                        fontStyle: "italic",
                        color: "var(--ink-faded)",
                        fontSize: "13px",
                        marginTop: 2,
                      }}
                    >
                      Ben je beter dan blinde gok?
                    </p>
                  </div>
                  <MonkeyExplainerModal monkeyCount={5000} variant="text" />
                </div>
              </div>
              {/* /Uitleg-laag */}


              {/* Headline — volle breedte */}
              <PercentileVerdict
                percentile={Math.round(monte.beatPct)}
                monkeyCount={5000}
                hint={`Jij ${monte.userActual} pt · gem. aap ${Math.round(monte.mean)} pt`}
              />


              {nickname && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-2.5 flex items-center justify-center gap-2.5 text-sm",
                    nickname.good ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50",
                  )}
                >
                  <span className="text-xl leading-none">{nickname.emoji}</span>
                  <span className="text-muted-foreground/80 text-[10px] uppercase tracking-[0.2em]">Prestatieklasse</span>
                  <span
                    className={cn(
                      "font-display font-bold",
                      nickname.good ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {nickname.title}
                  </span>
                </div>
              )}

              {/* Distributie — FT-stijl infographic (custom SVG) */}
              <AapscoreDistributie
                dist={monte.dist}
                userActual={monte.userActual}
                mean={monte.mean}
                median={monte.median}
                beatPct={monte.beatPct}
                monkeyCount={5000}
              />



              {/* Commentary */}
              {monte.top10 && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-serif italic",
                    "border-emerald-300 bg-emerald-50 text-emerald-700",
                  )}
                >
                  <span>"Top 10% van de apen — die dartpijl van jou heeft visie." 🔥</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab 2: Pelotonkeuzes ─────────────────────────────────────────────── */}
      {activeTab === "pelotonkeuzes" && (
        <Card className="ornate-frame retro-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Pelotonkeuzes
            </CardTitle>
            <p className="text-xs text-muted-foreground font-serif italic">
              Volg ik hier het peloton of wijk ik juist af? Donker = zeldzame keuze, licht = pelotonlieveling.
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-serif text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(5) }} /> Zeldzaam
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(50) }} /> Gemiddeld
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(95) }} />{" "}
                Pelotonlieveling
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                  ★
                </span>
                Jouw keuze
              </span>
            </div>

            {pickStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen ingediende ploegen.</p>
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
                              ? "Iedereen-en-z'n-moeder"
                              : pct >= 40
                                ? "Pelotonlieveling"
                                : pct <= 10
                                  ? "Verborgen parel"
                                  : pct <= 25
                                    ? "Differentieel"
                                    : null;
                          return (
                            <div
                              key={p.rider_id}
                              className={cn(
                                "rounded-md p-2 transition-all",
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
                                  {rider?.name ?? "Onbekend"}
                                </span>
                                <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full transition-all duration-500"
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
                                    Jouw keuze
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
                      🃏 Meest gekozen jokers
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
                                {rider?.name ?? "Onbekend"}
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
                  Voorspellingen · Eindklassement &amp; truien
                </p>
              </div>
              {predictionStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen voorspellingen ingediend.</p>
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
                            {meta.key === "gc" ? "Eindwinnaar" : thema.truien[meta.trui].naam}
                          </p>
                          {meta.key === "gc" && (
                            <span className="text-[9px] font-mono text-muted-foreground">positie 1–3</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {top.map((p) => {
                            const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                            const rider = ridersById[p.rider_id];
                            const mine = myPredictionMap.get(`${meta.key}:${p.position}`) === p.rider_id;
                            const label =
                              pct >= 60 ? "Consensus" : pct <= 8 ? "Outsider" : pct <= 20 ? "Differentieel" : null;
                            return (
                              <div
                                key={`${p.rider_id}-${p.position}`}
                                className={cn(
                                  "rounded-md p-2 transition-all",
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
                                    <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                                  </span>
                                  <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className="h-full transition-all duration-500"
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
                                      Jouw keuze
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
      {activeTab === "wielerdirecteur" && (
        <Card
          className="ornate-frame retro-border overflow-hidden"
          style={{ background: "hsl(var(--bg-wielerdirecteur))" }}
        >
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <DirectorIcon className="h-5 w-5 text-primary" /> De Wielerdirecteur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {/* ── Director Report Score ──────────────────────────────────────── */}
            {directorScore && (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6">
                {/* Grade + analysis */}
                <div className="relative flex flex-col md:flex-row items-start gap-5">
                  <div className="shrink-0">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Directeur Sportif Rapport</div>
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
                    <div className="text-muted-foreground/70 text-sm mt-1 font-mono">van de 10</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Mic className="h-3 w-3 text-[hsl(var(--vintage-gold))]" /> Patrick Lefevere
                    </div>
                    <p className="text-foreground text-sm font-serif italic leading-relaxed">
                      "{lefevere.data?.directeursAnalyse ?? directorScore.analysis}"
                    </p>
                    {lefevere.isFetching && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-sans">
                        Lefevere schrijft zijn rapport…
                      </p>
                    )}
                  </div>
                </div>
                {/* Metric breakdown */}
                <div className="relative mt-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">Score opbouw</div>
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
                      {showScoreInfo ? "Sluiten" : "Hoe werkt dit?"}
                    </button>
                  </div>

                  {/* Explanation panel */}
                  {showScoreInfo && (
                    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 text-[11px] text-foreground/70 leading-relaxed">
                      <p className="text-foreground font-semibold text-xs">Hoe wordt de score berekend?</p>
                      <p>
                        De rapportscore loopt van <span className="text-foreground font-mono">1.0</span> tot{" "}
                        <span className="text-foreground font-mono">10.0</span> (minimum 3.0) en is opgebouwd uit vier
                        gewogen onderdelen.
                      </p>
                      <div className="space-y-2.5">
                        <div className="flex gap-2">
                          <span className="shrink-0">🏆</span>
                          <div>
                            <span className="text-foreground font-semibold">Pool Ranking · 45%</span>
                            <p className="mt-0.5">
                              Jouw positie in de pool ten opzichte van alle andere deelnemers. Rang 1 geeft de maximale
                              bijdrage, de laatste plek de minimale.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🐒</span>
                          <div>
                            <span className="text-foreground font-semibold">Monkey Vergelijking · 25%</span>
                            <p className="mt-0.5">
                              Het percentage van 5.000 willekeurige simulatieploegen dat jij verslaat.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🃏</span>
                          <div>
                            <span className="text-foreground font-semibold">Joker Prestatie · 20%</span>
                            <p className="mt-0.5">
                              Rendement van je jokers: hoeveel punten ze scoorden ten opzichte van de best mogelijke
                              jokers in het veld. Jokers die niets opleveren drukken de deelscore.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="shrink-0">🎯</span>
                          <div>
                            <span className="text-foreground font-semibold">Differentiaal · 10%</span>
                            <p className="mt-0.5">
                              Durf dat loont. Je krijgt punten voor renners die <span className="text-foreground font-semibold">én</span>
                              {" "}punten scoorden <span className="text-foreground font-semibold">én</span> door weinig anderen
                              gekozen zijn. Per scorende renner telt zijn punten mee, gewogen met <span className="font-mono">(1 − gekozen%)</span>:
                              een renner die door 10% gekozen is weegt 0.9×, eentje die door 80% gekozen is maar 0.2×. Het
                              gemiddelde hiervan (punten-gewogen) is je deelscore. Veel punten met weinig-gekozen renners → richting 10.
                              Alleen maar populaire favorieten → lager.
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
                        {showCalc ? "Verberg formules" : "Berekening"}
                      </button>

                      {showCalc && (
                        <div className="rounded-lg border border-amber-200 bg-secondary/60 p-3 space-y-3 font-mono text-[10px] text-foreground/70 leading-relaxed">
                          <p className="text-amber-700 font-semibold text-[11px] not-italic">Exacte formules</p>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              Pool Ranking (50%)
                            </p>
                            <p className="text-foreground">poolScore = (N − rang) / (N − 1)</p>
                            <p className="text-muted-foreground text-[9px]">
                              N = aantal deelnemers · rang = jouw positie
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              Monkey Vergelijking (25%)
                            </p>
                            <p className="text-foreground">monkeyScore = beatPct / 100</p>
                            <p className="text-muted-foreground text-[9px]">
                              De app simuleert 5.000 willekeurige ploegen ("apen" die lukraak renners kiezen) en
                              telt hoeveel daarvan minder punten halen dan jij. beatPct = dat percentage.
                            </p>
                            <p className="text-muted-foreground text-[9px]">
                              Puntentoewijzing: 0% verslagen → 0.0 · 50% → 0.5 · 100% → 1.0. Deze deelscore weegt
                              25% mee. Voorbeeld: 72% apen verslagen → monkeyScore 0.72 → deelcijfer (0.72×9+1)=7.5/10.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              Joker Prestatie (20%) — rendement
                            </p>
                            <p className="text-foreground">rendement = jouwJokerPunten / besteJokerPunten</p>
                            <p className="text-foreground">jokerScore = 0.3 + rendement × 0.7</p>
                            <p className="text-muted-foreground text-[9px]">
                              besteJokerPunten = 2 best scorende niet-categorie-renners · geen jokers → 0.5
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">
                              Differentiaal (10%)
                            </p>
                            <p className="text-foreground">bijdrage(renner) = punten × (1 − gekozen%)</p>
                            <p className="text-foreground">diffScore = Σ bijdrage / Σ punten</p>
                            <p className="text-muted-foreground text-[9px]">
                              Alleen renners die punten scoorden tellen mee. "gekozen%" = aandeel deelnemers dat die
                              renner koos. Weinig gekozen → telt zwaarder. Geen scorende picks → 0.5.
                            </p>
                            <p className="text-muted-foreground text-[9px]">
                              Voorbeeld: renner A 40 pt, 10% gekozen → bijdrage 40×0.9=36. Renner B 30 pt, 70%
                              gekozen → 30×0.3=9. diffScore = (36+9)/(40+30) = 45/70 = 0.64 → deelcijfer 6.8/10.
                            </p>
                          </div>

                          <div className="border-t border-border pt-2 space-y-1">
                            <p className="text-muted-foreground uppercase tracking-widest text-[9px]">Eindscore</p>
                            <p className="text-foreground">raw = pool×0.45 + monkey×0.25 + joker×0.20 + diff×0.10</p>
                            <p className="text-foreground">score = max(3.0, round((raw × 9 + 1) × 10) / 10)</p>
                            <p className="text-muted-foreground text-[9px]">Schaal 1.0 – 10.0 · minimum 3.0</p>
                          </div>

                          <div className="border-t border-border pt-2 space-y-1">
                            <p className="text-amber-700 font-semibold text-[10px] not-italic">Rekenvoorbeeld</p>
                            <p className="text-muted-foreground text-[9px]">#8 van 50 · 72% apen · jokers 64/100 pt · diff 0.55</p>
                            <p className="text-foreground">pool = (50−8)/49 = 0.857</p>
                            <p className="text-foreground">joker = 0.3 + (64/100)×0.7 = 0.748</p>
                            <p className="text-foreground">raw = 0.45·0.857 + 0.25·0.72 + 0.20·0.748 + 0.10·0.55 = 0.770</p>
                            <p className="text-foreground">score = (0.770×9 + 1) = 7.9</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/70 -mt-1">Klik een onderdeel open voor de berekening.</p>

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
                            <div className={cn("h-full rounded-full transition-[width] duration-700", barCls)} style={{ width: `${Math.round(pct * 100)}%` }} />
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
                                <p className="font-mono text-foreground">poolScore = (N − rang) / (N − 1)</p>
                                <p className="font-mono text-foreground">= ({directorScore.totaal} − {directorScore.rang}) / ({directorScore.totaal} − 1) = {directorScore.poolScore.toFixed(2)}</p>
                                <p className="text-muted-foreground">N = aantal deelnemers ({directorScore.totaal}), rang = jouw positie (#{directorScore.rang}). Hoe hoger je staat, hoe hoger de deelscore.</p>
                              </>
                            )}
                            {key === "monkey" && (
                              <>
                                <p className="font-mono text-foreground">monkeyScore = beatPct / 100 = {directorScore.beatPct.toFixed(0)} / 100 = {directorScore.monkeyScore.toFixed(2)}</p>
                                <p className="text-muted-foreground">Je verslaat {directorScore.beatPct.toFixed(0)}% van 5.000 willekeurige simulatieploegen ("apen" die lukraak renners kiezen).</p>
                              </>
                            )}
                            {key === "joker" && (
                              directorScore.aantalJokers === 0 ? (
                                <p className="text-muted-foreground">Geen jokers gekozen → neutrale deelscore 0.5.</p>
                              ) : (
                                <>
                                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[10px]">
                                    <span className="text-muted-foreground/70 uppercase tracking-wider">Jouw joker</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">Punten</span>
                                    {directorScore.jokerDetail.rows.map((r) => (
                                      <Fragment key={r.name}>
                                        <span className="truncate text-foreground">{r.name}</span>
                                        <span className="text-right font-mono tabular-nums text-foreground">{r.pts}</span>
                                      </Fragment>
                                    ))}
                                  </div>
                                  <p className="font-mono text-foreground">rendement = {directorScore.jokerDetail.yourPts} / {directorScore.jokerDetail.bestPts} = {directorScore.jokerDetail.rendementPct}%</p>
                                  <p className="font-mono text-foreground">jokerScore = 0.3 + {(directorScore.jokerDetail.rendementPct / 100).toFixed(2)} × 0.7 = {directorScore.jokerScore.toFixed(2)}</p>
                                  <p className="text-muted-foreground">besteJokerPunten = de 2 best scorende renners die in géén categorie zitten.</p>
                                </>
                              )
                            )}
                            {key === "diff" && (
                              <>
                                <p className="text-[10px] text-muted-foreground leading-snug">
                                  Per scorende renner: <span className="font-mono text-foreground">bijdrage = punten × (1 − gekozen%)</span>. Weinig gekozen telt zwaarder.{" "}
                                  <span className="text-emerald-600 font-semibold">groen</span> ≤25% · <span className="text-rose-500 font-semibold">rood</span> ≥60%.
                                </p>
                                {directorScore.diffDetail.rows.length > 0 ? (
                                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-[10px]">
                                    <span className="text-muted-foreground/70 uppercase tracking-wider">Renner</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">Gekozen</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">Punten</span>
                                    <span className="text-muted-foreground/70 uppercase tracking-wider text-right">Bijdrage</span>
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
                                  <p className="text-muted-foreground">Nog geen scorende picks.</p>
                                )}
                                {directorScore.diffDetail.scorers > directorScore.diffDetail.rows.length && (
                                  <p className="text-[9px] text-muted-foreground/60">+ {directorScore.diffDetail.scorers - directorScore.diffDetail.rows.length} meer (top 5 getoond)</p>
                                )}
                                <p className="font-mono text-foreground">diffScore = Σ bijdrage / Σ punten = {directorScore.diffScore.toFixed(2)}</p>
                              </>
                            )}
                            <p className="font-mono text-foreground pt-1">
                              deelcijfer = ({pct.toFixed(2)} × 9 + 1) = {val.toFixed(1)} / 10
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              De deelscore (0–1) wordt omgerekend naar de schaal 1–10 met ×9+1, daarom is 0.63 → 6.7 en niet 6.3.
                            </p>
                            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/60 px-3 py-2 mt-1">
                              <span className="text-xs text-muted-foreground">Deelcijfer ({w}%)</span>
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

            {!directorAnalysis ? (
              <p className="text-sm text-muted-foreground">Stel eerst een team samen — dan praat de directeur graag.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {directorAnalysis.labels.map((l) => (
                    <Badge key={l} variant="secondary" className="font-display">
                      {l}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  {directorAnalysis.lines.map((l, i) => (
                    <p key={i} className="font-serif italic text-foreground/90 border-l-2 border-primary/60 pl-3">
                      "{l}"
                    </p>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: The Emirates — de droomploeg achterop gezien ─────────────────── */}
      {activeTab === "superteam" && (
        <Card className="ornate-frame retro-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <Crown className="h-5 w-5 text-[hsl(var(--vintage-gold))]" /> The Emirates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            {/* Intro / explanation */}
            <div className="rounded-xl border border-foreground/15 bg-gradient-to-br from-[hsl(var(--vintage-gold))/0.10] to-card p-3 md:p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="font-display text-xs md:text-sm font-bold uppercase tracking-widest">Wat zie je hier?</p>
                <p className="font-serif italic text-sm text-foreground/85 leading-snug">
                  De droomploeg achterop gezien: welke renners je per categorie had moeten kiezen om het maximaal
                  haalbare puntentotaal binnen te halen, t/m de laatst door de jury bijgewerkte etappe. Niemand wist het
                  van tevoren — Pogi misschien wel.
                </p>
              </div>
            </div>

            {emiratesData.lastStage === null ? (
              <div className="text-center py-8 space-y-3">
                <Lock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="font-display text-lg font-bold">Nog geen etappe bijgewerkt</p>
                <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
                  Zodra de jury de eerste etappe-uitslag bijwerkt, ontvouwt zich hier de droomploeg.
                </p>
              </div>
            ) : (
              <>
                {/* As-of subtitle */}
                <div className="vintage-ornament">
                  <span className="vintage-ornament-symbol">✦</span>
                  <span className="font-serif italic text-xs md:text-sm text-muted-foreground tracking-wide text-center">
                    T/m etappe {emiratesData.lastStage.number}
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
                  <div className="relative flex items-start gap-4 md:gap-5">
                    <div className="shrink-0 flex flex-col items-center">
                      <Crown className="h-9 w-9 md:h-11 md:w-11 text-[hsl(var(--vintage-gold))]" strokeWidth={2.2} />
                      <span className="font-display text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1.5 text-center">
                        De
                        <br />
                        Droomploeg
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1 font-serif">
                        Maximaal haalbaar
                      </div>
                      <h3 className="font-display font-black text-2xl md:text-4xl leading-tight">
                        Wat je had moeten kiezen
                      </h3>
                      <p className="font-serif italic text-sm text-muted-foreground mt-0.5">
                        per categorie de top-scorende renners
                      </p>
                      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                        <span className="font-display font-black text-4xl md:text-6xl tabular-nums text-[hsl(var(--vintage-gold))] leading-none">
                          {emiratesData.total}
                        </span>
                        <span className="font-serif italic text-sm text-muted-foreground">
                          punten over {emiratesData.stagesCount} etappe
                          {emiratesData.stagesCount === 1 ? "" : "s"}
                        </span>
                      </div>
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
                              Huidige leider
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
                              {pct(leader.points)}% van de droomploeg
                            </span>
                          </div>
                        </div>
                        {me && (
                          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3 md:p-4">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-serif mb-1">
                              Jouw score
                            </div>
                            <p className="font-display font-bold text-base md:text-lg leading-tight truncate text-primary">
                              {me.teamName}
                            </p>
                            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                              <span className="font-display font-black text-2xl md:text-3xl tabular-nums text-primary">
                                {me.points}
                              </span>
                              <span className="text-xs font-serif italic text-muted-foreground">
                                {pct(me.points)}% van de droomploeg
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
                        De Selectie
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
                                {cat.maxPicks} pick{cat.maxPicks === 1 ? "" : "s"}
                              </span>
                            </div>
                            <span className="font-display font-black tabular-nums text-[hsl(var(--vintage-gold))] shrink-0">
                              {cat.subtotal} pt
                            </span>
                          </div>
                          <ol className="divide-y divide-border">
                            {cat.riders.length === 0 ? (
                              <li className="px-3 py-2 text-sm text-muted-foreground font-serif italic">
                                Nog niemand in deze categorie heeft gescoord.
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
                                    pt
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
                              Jokers
                            </span>
                            <span className="text-[10px] font-serif italic text-muted-foreground shrink-0">
                              2 picks · ×1
                            </span>
                          </div>
                          <span className="font-display font-black tabular-nums text-[hsl(var(--vintage-gold))] shrink-0">
                            {emiratesData.jokerSubtotal} pt
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
                                pt
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Totaal-rij */}
                    <div className="rounded-xl border-2 border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.08] px-3 py-2.5 flex items-center justify-between">
                      <span className="font-display font-black text-sm uppercase tracking-widest">
                        Totaal droomploeg
                      </span>
                      <span className="font-display font-black text-lg tabular-nums text-[hsl(var(--vintage-gold))]">
                        {emiratesData.total} pt
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground font-serif italic">Selectiegegevens worden geladen…</p>
                  </div>
                )}

                {/* Footnote */}
                <div className="mop-card p-3 -rotate-[0.3deg]">
                  <p className="font-serif italic text-xs md:text-sm leading-snug">
                    <span className="font-display font-bold uppercase tracking-widest text-xs">De droomploeg:</span> per
                    categorie pakken we de top-scorers met de meeste etappe-punten (50 voor positie 1, 40 voor 2, … 1
                    voor 20). Daar bovenop twee jokers — de beste resterende renners — op ×1, zoals een gewone pick. Een
                    ploegleider met deze helderziendheid kostte miljoenen.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
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
