import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStagePoints, useStages } from "@/hooks/useResults";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Lock, Activity, Trophy, BarChart3, Megaphone, Sparkles,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };
type StagePoint = { entry_id: string; points: number };
type PredictionStat = { classification: string; position: number; rider_id: string; pick_count: number; total_entries: number };

// ─── Ownership colour (unchanged) ────────────────────────────────────────────

function ownershipColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const intensity = 1 - clamped / 100;
  const alpha = 0.18 + intensity * 0.7;
  return `hsl(var(--vintage-gold) / ${alpha.toFixed(2)})`;
}

const CLASSIFICATION_META: Array<{ key: "gc" | "points" | "kom" | "youth"; label: string; emoji: string; tint: string }> = [
  { key: "gc",     label: "Eindwinnaar",  emoji: "🏆", tint: "from-primary/20 to-[hsl(var(--vintage-gold))/0.15]" },
  { key: "points", label: "Groene trui",  emoji: "🟢", tint: "from-emerald-500/15 to-emerald-500/5" },
  { key: "kom",    label: "Bolletjestrui",emoji: "🔴", tint: "from-rose-500/15 to-rose-500/5" },
  { key: "youth",  label: "Witte trui",   emoji: "⚪", tint: "from-slate-200/30 to-slate-200/10" },
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
function useEntryTotals(gameId?: string) {
  return useQuery({
    queryKey: ["game-stage-point-totals", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .from("stage_points")
        .select("entry_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId);
      if (error) throw error;
      const totalsByEntry = new Map<string, number>();
      for (const row of (data ?? []) as unknown as StagePoint[]) {
        totalsByEntry.set(row.entry_id, (totalsByEntry.get(row.entry_id) ?? 0) + (row.points ?? 0));
      }
      return Array.from(totalsByEntry.values());
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

function getNickname(beatPct: number) {
  if (beatPct >= 99) return { title: "Koningsklasse",      emoji: "👑", good: true };
  if (beatPct >= 90) return { title: "Wielerdirecteur",    emoji: "🏆", good: true };
  if (beatPct >= 70) return { title: "Aap-Slayer",         emoji: "⚔️", good: true };
  if (beatPct >= 50) return { title: "Menselijk Voordeel", emoji: "💪", good: true };
  if (beatPct >= 30) return { title: "Nek-aan-Nek",        emoji: "🤝", good: false };
  if (beatPct >= 10) return { title: "Monkey Business",    emoji: "🐒", good: false };
  return                    { title: "Dartpijl-Niveau",    emoji: "🎯", good: false };
}

// SVG semicircle gauge — animates on mount
function PercentileGauge({ pct }: { pct: number }) {
  const r = 50, cx = 65, cy = 62, sw = 9;
  const circ = Math.PI * r;
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setAnimated(true)); return () => cancelAnimationFrame(id); }, []);
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color = pct >= 50 ? "#34d399" : "#f43f5e";
  return (
    <svg viewBox="0 0 130 72" className="w-full max-w-[200px] mx-auto">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${animated ? offset : circ}`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)" }} />
      <text x={cx - r} y={cy + 13} fontSize="8" fill="rgba(255,255,255,0.35)" textAnchor="middle">0%</text>
      <text x={cx + r} y={cy + 13} fontSize="8" fill="rgba(255,255,255,0.35)" textAnchor="middle">100%</text>
    </svg>
  );
}

// Premium stat card on dark background
function DarkStatCard({
  label, value, unit, icon, description, accentColor,
}: {
  label: string; value: string; unit?: string; icon: string;
  description: string; accentColor: string;
}) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-700 via-slate-700 to-slate-800 p-4 flex flex-col",
      accentColor === "gold"  && "border-[hsl(var(--vintage-gold))/0.25]",
      accentColor === "blue"  && "border-sky-500/25",
      accentColor === "green" && "border-emerald-500/25",
      accentColor === "red"   && "border-rose-500/25",
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl leading-none">{icon}</span>
        <span className={cn(
          "text-[9px] uppercase tracking-[0.2em] font-semibold",
          accentColor === "gold"  && "text-[hsl(var(--vintage-gold))]",
          accentColor === "blue"  && "text-sky-400",
          accentColor === "green" && "text-emerald-400",
          accentColor === "red"   && "text-rose-400",
        )}>{label}</span>
      </div>
      <div className={cn(
        "font-display text-3xl font-bold tabular-nums",
        accentColor === "gold"  && "text-[hsl(var(--vintage-gold))]",
        accentColor === "blue"  && "text-sky-400",
        accentColor === "green" && "text-emerald-400",
        accentColor === "red"   && "text-rose-400",
      )}>{value}</div>
      {unit && <div className="text-white/40 text-xs mt-0.5">{unit}</div>}
      <p className="text-white/35 text-[11px] mt-3 leading-relaxed flex-1">{description}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HorsCategorieTab() {
  const { data: game } = useCurrentGame();
  const isLive = Boolean(game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)));
  const { entry, picksByCategory, jokerIds, predictions: myPredictions } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: pickStats = [] } = usePickStats(isLive ? game?.id : undefined);
  const { data: jokerStats = [] } = useJokerStats(isLive ? game?.id : undefined);
  const { data: predictionStats = [] } = usePredictionStats(isLive ? game?.id : undefined);
  const { data: totals = [] } = useEntryTotals(isLive ? game?.id : undefined);
  const { data: myStageTotal = 0 } = useMyStagePointTotal(entry?.id);

  // Stage-by-stage timeline data
  const { data: stages = [] } = useStages(isLive ? game?.id : undefined);
  const { data: allStagePoints = [] } = useStagePoints(isLive ? game?.id : undefined);

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
      return Math.round(s);
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
    const median = randomScores[Math.floor(randomScores.length / 2)];
    const top10cut = randomScores[Math.floor(randomScores.length * 0.9)];
    const beatPct = randomScores.length === 0
      ? 0 : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
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
    if (!entry?.id || stages.length === 0 || allStagePoints.length === 0) return [];
    const myPts = new Map<string, number>();
    const allPts = new Map<string, number[]>();
    for (const sp of allStagePoints) {
      if (sp.entry_id === entry.id) myPts.set(sp.stage_id, (myPts.get(sp.stage_id) ?? 0) + sp.points);
      const arr = allPts.get(sp.stage_id) ?? [];
      arr.push(sp.points);
      allPts.set(sp.stage_id, arr);
    }
    const approved = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    let userCum = 0, avgCum = 0;
    return approved.map((s) => {
      const u = myPts.get(s.id) ?? 0;
      const pool = allPts.get(s.id) ?? [];
      const avg = pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : 0;
      userCum += u; avgCum += avg;
      return { stage: `E${s.stage_number}`, user: userCum, avg: Math.round(avgCum), userDelta: u, avgDelta: Math.round(avg) };
    });
  }, [entry?.id, stages, allStagePoints]);

  // ── Derived display values ──────────────────────────────────────────────────
  const diffPct = monte && monte.mean > 0 ? ((monte.userActual - monte.mean) / monte.mean) * 100 : 0;
  const isBeating = diffPct >= 0;
  const nickname = monte ? getNickname(monte.beatPct) : null;
  const oneInX = monte && monte.beatPct < 99.5
    ? Math.max(2, Math.round(100 / Math.max(0.1, 100 - monte.beatPct))) : null;

  // ── Section 2: Pelotonkeuzes ────────────────────────────────────────────────
  const pickStatsByCat = useMemo(() => {
    const m = new Map<string, PickStat[]>();
    for (const p of pickStats) {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    }
    for (const [k, list] of m) m.set(k, list.sort((a, b) => b.pick_count - a.pick_count));
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
    const lieflings = myOwnerships.filter((o) => o > 0.5).length;
    const labels: string[] = [];
    if (uniques >= 4) labels.push("Pure chaos");
    if (lieflings >= 4) labels.push("Controleploeg");
    if (avgOwn > 0.45) labels.push("Pelotonkoers");
    if (avgOwn < 0.25) labels.push("Aanvallende ploeg");
    if (uniques >= 2 && lieflings >= 2) labels.push("Waaierspecialist");
    if (labels.length === 0) labels.push("Knechtenleger");
    const lines: string[] = [];
    if (avgOwn > 0.5) lines.push("Je peloton kiest wat iedereen kiest. Een veilige bidon, geen spektakel.");
    else if (avgOwn < 0.2) lines.push("Met deze differentiëlen mik je óf op het podium óf op de bezemwagen.");
    else lines.push("Een nette mix tussen kopgroep en peloton — directeur sportif knikt goedkeurend.");
    if (uniques >= 3) lines.push(`${uniques} renners die nauwelijks iemand koos. Lef of waanzin?`);
    if (lieflings >= 3) lines.push(`${lieflings} pelotonlievelingen — geen verrassingen, geen excuses.`);
    const day = new Date().getDate();
    const quotes = [
      "Vandaag zou jouw ploeg waarschijnlijk lossen op de eerste col.",
      "Met deze selectie rijdt je bus harder dan je sprinter.",
      "Je ploeg ademt: all-in op chaos.",
      "Vier sprinters meenemen naar deze bergen? Ambitieuze tactiek.",
      "Het peloton vertrouwt op Pogačar. Jij vertrouwt op hoop.",
      "Deze ploeg heeft de organisatie van een vroege vlucht in een regenrit.",
      "Jouw kopman stuurt vandaag z'n knecht naar voren — voor een bidon.",
    ];
    return { labels, lines, quote: quotes[day % quotes.length], avgOwn, uniques, lieflings };
  }, [isLive, entry, picksByCategory, pickStats]);

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

  // ── Sub-tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dartpijl" | "pelotonkeuzes" | "wielerdirecteur">("dartpijl");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Sub-tab navigation ─────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1">
        {(
          [
            { key: "dartpijl"        as const, label: "Dartpijl",          Icon: Activity  },
            { key: "pelotonkeuzes"   as const, label: "Pelotonkeuzes",     Icon: BarChart3 },
            { key: "wielerdirecteur" as const, label: "De Wielerdirecteur", Icon: Megaphone },
          ]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
              activeTab === key
                ? "bg-card text-foreground shadow-sm border border-foreground/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">
              {key === "dartpijl" ? "Dartpijl" : key === "pelotonkeuzes" ? "Peloton" : "Directeur"}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab 1: Dartpijl (Monte Carlo) ───────────────────────────────────── */}
      {activeTab === "dartpijl" && (
        <div className="space-y-5">
          {!monte ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-center">
              <span className="text-4xl">🐒</span>
              <p className="text-white/50 text-sm mt-3 font-serif italic">Nog onvoldoende data om de apen te laten gooien.</p>
            </div>
          ) : (
          <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] p-6 md:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-25 transition-colors duration-700"
              style={{ background: `radial-gradient(circle, ${isBeating ? "#34d399" : "#f43f5e"} 0%, transparent 70%)` }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(to right,white 1px,transparent 1px),linear-gradient(to bottom,white 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-1">
                  🐒 De aap met de dartpijl
                </h2>
                <p className="text-sm text-white/45 mb-5">Monte Carlo Simulatie — 5000 simulaties</p>
                <div className={cn(
                  "font-display tabular-nums font-black leading-none mb-2",
                  "text-5xl md:text-6xl",
                  isBeating ? "text-emerald-400" : "text-rose-400"
                )}>
                  {isBeating ? "+" : ""}{diffPct.toFixed(0)}%
                </div>
                <p className="text-white/70 text-sm font-medium">
                  {isBeating ? "beter" : "slechter"} dan de gemiddelde aap
                </p>
                <p className="text-white/30 text-xs mt-1.5 font-mono">
                  jij {monte.userActual} pt &nbsp;·&nbsp; gem. aap {Math.round(monte.mean)} pt
                </p>
              </div>

              {nickname && (
                <div className="text-center shrink-0">
                  <div className="text-5xl mb-2">{nickname.emoji}</div>
                  <div className={cn(
                    "font-display text-xl font-bold",
                    nickname.good ? "text-emerald-400" : "text-rose-400"
                  )}>{nickname.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">prestatieklasse</div>
                </div>
              )}
            </div>
          </div>

          {/* Distribution chart + Percentile gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Distribution chart */}
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-700 via-slate-700 to-slate-800 p-4 md:p-5">
              <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl opacity-15"
                style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
                  <BarChart3 className="h-3 w-3" />
                  Verdeling · 5.000 willekeurige ploegen
                </div>
                <h3 className="font-display text-white text-base sm:text-lg mb-1">Aapscore distributie</h3>
                <p className="text-[11px] text-white/40 mb-4">
                  Bars links van jou (goud) zijn apen die jij verslaat
                </p>
                <div style={{ height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monte.dist} margin={{ top: 16, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hc-bar-beat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        </linearGradient>
                        <linearGradient id="hc-bar-lose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.7)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.7)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.07)" }}
                        content={(props: any) => {
                          const { active, payload } = props;
                          if (!active || !payload?.length) return null;
                          const { bucket, count } = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-white/20 bg-slate-800/95 backdrop-blur-xl px-3 py-2 text-xs text-white shadow-xl">
                              <div className="font-mono font-bold text-white">{bucket} pt</div>
                              <div className="text-white/60">{count} apen</div>
                            </div>
                          );
                        }}
                      />
                      {/* Jouw score — amber, solid, thick */}
                      <ReferenceLine
                        x={monte.userActual}
                        stroke="#fbbf24"
                        strokeWidth={3}
                        label={(props: any) => {
                          const { viewBox } = props;
                          const x = viewBox?.x ?? 0;
                          const y = viewBox?.y ?? 0;
                          return (
                            <g>
                              <rect x={x - 36} y={y - 24} width={72} height={18} rx={4} fill="#fbbf24" />
                              <text x={x} y={y - 11} fill="#1c1400" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Jij · ${monte.userActual} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                      {/* Gemiddelde — sky blue, dashed */}
                      <ReferenceLine
                        x={Math.round(monte.mean)}
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        label={(props: any) => {
                          const { viewBox } = props;
                          const x = viewBox?.x ?? 0;
                          const y = viewBox?.y ?? 0;
                          return (
                            <g>
                              <rect x={x - 32} y={y - 46} width={64} height={18} rx={4} fill="#38bdf8" />
                              <text x={x} y={y - 33} fill="#001a27" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Gem. · ${Math.round(monte.mean)} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                      {/* Mediaan — green, dashed */}
                      <ReferenceLine
                        x={monte.median}
                        stroke="#4ade80"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        label={(props: any) => {
                          const { viewBox } = props;
                          const x = viewBox?.x ?? 0;
                          const y = viewBox?.y ?? 0;
                          return (
                            <g>
                              <rect x={x - 32} y={y - 68} width={64} height={18} rx={4} fill="#4ade80" />
                              <text x={x} y={y - 55} fill="#001a00" fontSize={9} fontWeight={800} textAnchor="middle">
                                {`Med. · ${monte.median} pt`}
                              </text>
                            </g>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24} animationDuration={800}>
                        {monte.dist.map((b, i) => (
                          <Cell key={i} fill={b.bucket <= monte.userActual ? "url(#hc-bar-beat)" : "url(#hc-bar-lose)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-white/70">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-3 rounded-sm bg-[#fbbf24]" />
                    Jou ({monte.userActual} pt)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#38bdf8]" />
                    Gemiddelde ({Math.round(monte.mean)} pt)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#4ade80]" />
                    Mediaan ({monte.median} pt)
                  </span>
                </div>
              </div>
            </div>

            {/* Percentile gauge */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-700 via-slate-700 to-slate-800 p-5 flex flex-col items-center justify-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Percentiel</div>
              <PercentileGauge pct={monte.beatPct} />
              <div className={cn(
                "font-display text-4xl font-black tabular-nums -mt-2",
                monte.beatPct >= 50 ? "text-emerald-400" : "text-rose-400"
              )}>
                {monte.beatPct.toFixed(0)}%
              </div>
              <div className="text-xs text-white/50 text-center">van apen verslagen</div>

              <div className="mt-5 w-full rounded-xl border border-white/8 bg-white/5 p-3 text-center">
                {oneInX ? (
                  <>
                    <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">
                      {monte.beatPct >= 50 ? "Slechts" : "Al"}
                    </div>
                    <div className="font-display text-2xl font-bold text-white">
                      1 op {oneInX}
                    </div>
                    <div className="text-[10px] text-white/35 mt-0.5">
                      {monte.beatPct >= 50 ? "apen doet het beter" : "apen doe jij beter"}
                    </div>
                  </>
                ) : (
                  <div className="text-white/50 text-xs">Bijna geen aap verslaat jou 👑</div>
                )}
              </div>
            </div>
          </div>

          {/* Stats row: mean · median · fun */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DarkStatCard
              label="Gemiddelde aap"
              value={`${Math.round(monte.mean)}`}
              unit="punten"
              icon="🎯"
              description="Verwacht puntentotaal bij volledig willekeurige rennersselectie op basis van de pool van ingediende teams."
              accentColor="gold"
            />
            <DarkStatCard
              label="Mediaan aap"
              value={`${monte.median}`}
              unit="punten"
              icon="📊"
              description="De middelste aap van 5.000. Minder gevoelig voor uitschieters dan het gemiddelde — een eerlijkere maatstaf."
              accentColor="blue"
            />
            <DarkStatCard
              label={monte.worseThanApe ? "Verlies van de aap" : "Jij vs de aap"}
              value={monte.worseThanApe
                ? `−${Math.abs(Math.round(monte.userActual - monte.mean))} pt`
                : `+${Math.round(monte.userActual - monte.mean)} pt`}
              unit={monte.worseThanApe ? "onder gemiddelde aap" : "boven gemiddelde aap"}
              icon={monte.worseThanApe ? "😬" : "🏆"}
              description={monte.worseThanApe
                ? "Een willekeurige dartpijl had grofweg hetzelfde resultaat. De apen zijn blij."
                : oneInX
                  ? `Slechts 1 op ${oneInX} willekeurige apen scoort hoger dan jij. Dartpijlen staan paf.`
                  : "Uitstekend resultaat — je overtreft het gros van de willekeurige ploegen."}
              accentColor={monte.worseThanApe ? "red" : "green"}
            />
          </div>

          {/* Stage timeline */}
          {stageTimeline.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-700 via-slate-700 to-slate-800 p-4 md:p-5">
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-20"
                style={{ background: "radial-gradient(circle, hsl(var(--vintage-gold)) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
                  <Activity className="h-3 w-3" />
                  Etappe voor etappe
                </div>
                <h3 className="font-display text-white text-base sm:text-lg mb-0.5">Jij vs de Gemiddelde Aap</h3>
                <p className="text-[11px] text-white/40 mb-4">Cumulatieve punten per goedgekeurde etappe</p>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stageTimeline} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                        content={(props: any) => {
                          const { active, payload, label } = props;
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          return (
                            <div className="rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-xl px-3 py-2 text-xs text-white/80 shadow-xl space-y-1">
                              <div className="font-mono font-bold text-white mb-1">{label}</div>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--vintage-gold))" }} />
                                <span className="text-white/60">Jij</span>
                                <span className="ml-auto font-bold text-white">{row.user} pt</span>
                                {row.userDelta > 0 && <span className="text-emerald-400 text-[10px]">+{row.userDelta}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-white/30" />
                                <span className="text-white/60">Gem. aap</span>
                                <span className="ml-auto font-bold text-white/70">{row.avg} pt</span>
                                {row.avgDelta > 0 && <span className="text-white/40 text-[10px]">+{row.avgDelta}</span>}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="user" name="Jij"
                        stroke="hsl(var(--vintage-gold))" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 5, fill: "hsl(var(--vintage-gold))", strokeWidth: 0 }}
                        animationDuration={1000} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="avg" name="Gem. aap"
                        stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="5 4"
                        dot={false} activeDot={{ r: 4, fill: "rgba(255,255,255,0.5)", strokeWidth: 0 }}
                        animationDuration={1000} animationEasing="ease-out" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-5 mt-3 text-[10px] text-white/35">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded" style={{ background: "hsl(var(--vintage-gold))" }} />
                    Jouw score
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5" style={{ borderTop: "1.5px dashed rgba(255,255,255,0.3)" }} />
                    Gemiddelde aap
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Commentary */}
          {(monte.worseThanApe || monte.top10) && (
            <div className={cn(
              "rounded-xl border px-4 py-3 text-sm font-serif italic",
              monte.top10
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/5 text-rose-300"
            )}>
              {monte.worseThanApe && <span>"Eh… een gemiddelde dartpijl had het ook niet slechter gedaan." 🎯</span>}
              {monte.top10 && <span>"Top 10% van de apen — die dartpijl van jou heeft visie." 🔥</span>}
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
              <span className="inline-block h-3 w-8 rounded" style={{ background: ownershipColor(95) }} /> Pelotonlieveling
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">★</span>
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
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{cat.short_name ?? cat.name}</p>
                    <div className="space-y-2">
                      {list.map((p) => {
                        const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                        const rider = ridersById[p.rider_id];
                        const mine = myPickedRiderIds.has(p.rider_id);
                        const badge =
                          pct >= 70 ? "Iedereen-en-z'n-moeder"
                          : pct >= 40 ? "Pelotonlieveling"
                          : pct <= 10 ? "Verborgen parel"
                          : pct <= 25 ? "Differentieel"
                          : null;
                        return (
                          <div key={p.rider_id} className={cn(
                            "rounded-md p-2 transition-all",
                            mine
                              ? "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] bg-primary/5 border border-primary/40"
                              : "border border-transparent"
                          )}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-display font-bold truncate flex items-center gap-1.5">
                                {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>}
                                {rider?.name ?? "Onbekend"}
                              </span>
                              <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full transition-all duration-500" style={{ width: `${Math.max(6, pct)}%`, background: ownershipColor(pct) }} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
                              {mine && <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">Jouw keuze</Badge>}
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
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">🃏 Meest gekozen jokers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...jokerStats].sort((a, b) => b.joker_count - a.joker_count).slice(0, 6).map((j) => {
                      const pct = (j.joker_count / Math.max(1, j.total_entries)) * 100;
                      const rider = ridersById[j.rider_id];
                      const mine = jokerIds.includes(j.rider_id);
                      return (
                        <div key={j.rider_id} className={cn(
                          "flex items-center justify-between gap-2 text-sm bg-card rounded p-2 border",
                          mine ? "border-primary ring-2 ring-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.25)]" : "border-border"
                        )}>
                          <span className="font-display font-bold truncate flex items-center gap-1.5">
                            {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">★</span>}
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
                    <div key={meta.key} className={cn("rounded-lg border-2 border-border p-3 bg-gradient-to-br", meta.tint)}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          {meta.label}
                        </p>
                        {meta.key === "gc" && <span className="text-[9px] font-mono text-muted-foreground">positie 1–3</span>}
                      </div>
                      <div className="space-y-1.5">
                        {top.map((p) => {
                          const pct = (p.pick_count / Math.max(1, totalEntries)) * 100;
                          const rider = ridersById[p.rider_id];
                          const mine = myPredictionMap.get(`${meta.key}:${p.position}`) === p.rider_id;
                          const label = pct >= 60 ? "Consensus" : pct <= 8 ? "Outsider" : pct <= 20 ? "Differentieel" : null;
                          return (
                            <div key={`${p.rider_id}-${p.position}`} className={cn(
                              "rounded-md p-2 transition-all",
                              mine ? "ring-2 ring-primary bg-primary/5 border border-primary/40" : "border border-transparent bg-card/40"
                            )}>
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-display font-bold truncate flex items-center gap-1.5">
                                  {meta.key === "gc" && <span className="text-[10px] font-mono text-muted-foreground tabular-nums">P{p.position}</span>}
                                  {mine && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">★</span>}
                                  <span className="truncate">{rider?.name ?? "Onbekend"}</span>
                                </span>
                                <span className="font-mono text-xs tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, background: ownershipColor(pct) }} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {label && <Badge variant="outline" className="text-[10px]">{label}</Badge>}
                                {mine && <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20">Jouw keuze</Badge>}
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
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> De Wielerdirecteur
          </CardTitle>
          <p className="text-xs text-muted-foreground font-serif italic">Na rit 12, met een micro voor z'n neus.</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {!directorAnalysis ? (
            <p className="text-sm text-muted-foreground">Stel eerst een team samen — dan praat de directeur graag.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {directorAnalysis.labels.map((l) => (
                  <Badge key={l} variant="secondary" className="font-display">{l}</Badge>
                ))}
              </div>
              <div className="space-y-2">
                {directorAnalysis.lines.map((l, i) => (
                  <p key={i} className="font-serif italic text-foreground/90 border-l-2 border-primary/60 pl-3">"{l}"</p>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Gem. ownership"    value={`${(directorAnalysis.avgOwn * 100).toFixed(0)}%`} />
                <Stat label="Differentiëlen"    value={`${directorAnalysis.uniques}`}   sub="<15% gekozen" />
                <Stat label="Pelotonlievelingen" value={`${directorAnalysis.lieflings}`} sub=">50% gekozen" />
              </div>
              <div className="rounded-md border-2 border-dashed border-[hsl(var(--vintage-gold))/0.6] bg-[hsl(var(--vintage-gold))/0.08] p-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <p className="text-sm font-serif italic">{directorAnalysis.quote}</p>
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
