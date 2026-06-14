import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useStagePointsForEntries, useGameStandings } from "@/hooks/useResults";
import { pointsTable } from "@/data/riders";
import type { LefevereReportInput } from "@/hooks/useLefevereReport";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HorsSummary = {
  monkeyBeatPct: number | null;   // 0..100
  emiratesPct: number | null;     // 0..100
  directorScore: number | null;   // 1.0..10.0
  lefevereInput: LefevereReportInput | null;
  entryId: string | undefined;    // voor de Lefevere DB-cache
  stageCount: number;             // aantal gefiatteerde etappes (cache-sleutel)
  isLoading: boolean;
};

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type JokerStat = { rider_id: string; joker_count: number; total_entries: number };

// ─── Local mirrors of the data hooks used in HorsCategorieTab ────────────────
// We keep these private and side-by-side with the originals; react-query
// dedupes by queryKey so no double-fetch ever happens.

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

function useAllStageResults(gameId?: string) {
  return useQuery({
    queryKey: ["all-stage-results", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ stage_id: string; rider_id: string | null; finish_position: number }>> => {
      if (!supabase || !gameId) return [];
      // Paginate to defeat PostgREST max-rows cap (stage_results kan >1000 rijen
      // bevatten over 21 etappes — anders mist de Droomploeg-score punten).
      type Row = { stage_id: string; rider_id: string | null; finish_position: number };
      const PAGE = 1000;
      let from = 0;
      const all: Row[] = [];
      while (from < 200_000) {
        const { data, error } = await (supabase as any)
          .from("stage_results")
          .select("stage_id, rider_id, finish_position, stages!inner(game_id, results_status)")
          .eq("stages.game_id", gameId)
          .eq("stages.results_status", "approved")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data ?? []) as Row[];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });
}

function useAllGameRiders(gameId?: string) {
  return useQuery({
    queryKey: ["hc-all-game-riders", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ id: string; name: string; start_number: number | null; is_dnf: boolean }>> => {
      if (!supabase || !gameId) return [];
      const { data: teams } = await supabase.from("teams").select("id").eq("game_id", gameId);
      const teamIds = (teams ?? []).map((t: any) => t.id);
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, start_number, is_dnf")
        .in("team_id", teamIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; start_number: number | null; is_dnf: boolean }>;
    },
  });
}

// ─── Monte-Carlo helpers (unchanged copy from HorsCategorieTab) ──────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Lichte aggregator die enkel de 3 kerncijfers voor de Hors Catégorie-shortcuts
 * teruggeeft (Monkey IQ %, Emirates %, Wielerdirecteur-rapport). Hergebruikt
 * dezelfde RPC's en queryKeys als HorsCategorieTab, dus react-query dedupes.
 *
 * Geen functionele wijziging tov de tab — enkel projectie naar getallen.
 */
export function useHorsCategorieSummary(override?: { id?: string; status?: string }): HorsSummary {
  const { data: curGame } = useCurrentGame();
  // Optioneel een specifieke (bv. afgeronde) game i.p.v. de live game.
  const game = override?.id ? { id: override.id, status: override.status } : curGame;
  const isLive = Boolean(
    game?.status && ["live", "locked", "finished", "closed"].includes(String(game.status)),
  );
  const gameId = isLive ? game?.id : undefined;

  const { entry, picksByCategory, jokerIds } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const pickStatsQ = usePickStats(gameId);
  const jokerStatsQ = useJokerStats(gameId);
  const myStageTotalQ = useMyStagePointTotal(entry?.id);
  const stagesQ = useStages(gameId);
  const stages = stagesQ.data ?? [];
  // Hoogste goedgekeurde (niet-GC) etappe → server-side totalen via game_standings,
  // i.p.v. alle stage_points-rijen van de hele game naar de client te halen.
  const maxStageNum = useMemo(() => {
    let m: number | undefined;
    for (const s of stages) {
      if (s.results_status === "approved") m = Math.max(m ?? 0, s.stage_number);
    }
    return m;
  }, [stages]);
  const standQ = useGameStandings(gameId, maxStageNum);
  const myEntryIds = useMemo(() => (entry?.id ? [entry.id] : []), [entry?.id]);
  const myStagePointsQ = useStagePointsForEntries(gameId, myEntryIds);
  const allStageResultsQ = useAllStageResults(gameId);
  const allGameRidersQ = useAllGameRiders(gameId);

  const isLoading =
    pickStatsQ.isLoading ||
    jokerStatsQ.isLoading ||
    standQ.isLoading ||
    myStageTotalQ.isLoading ||
    stagesQ.isLoading ||
    myStagePointsQ.isLoading ||
    allStageResultsQ.isLoading ||
    allGameRidersQ.isLoading;

  const pickStats = pickStatsQ.data ?? [];
  const jokerStats = jokerStatsQ.data ?? [];
  // game_standings geeft per ingediend team cum_points (stage-punten zonder
  // voorspel-bonus) → zelfde verdeling als de oude useEntryTotals.
  const totals = (standQ.data ?? []).map((r) => r.cum_points);
  const myStageTotal = myStageTotalQ.data ?? 0;
  // Alleen MIJN stage_points (Emirates-eigen-punten). Scoped fetch i.p.v. hele game.
  const allStagePoints = myStagePointsQ.data ?? [];
  const allStageResults = allStageResultsQ.data ?? [];
  const allGameRiders = allGameRidersQ.data ?? [];

  // ── Monte Carlo (exact dezelfde formule als HorsCategorieTab) ──────────────
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
    for (const _ of Array(N).fill(0)) {
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
    const beatPct =
      randomScores.length === 0
        ? 0
        : (randomScores.filter((s) => userActual > s).length / randomScores.length) * 100;
    return { beatPct };
  }, [categories, pickStats, totals, picksByCategory, myStageTotal, game?.id]);

  // ── Emirates (exact dezelfde formule als HorsCategorieTab) ─────────────────
  const emirates = useMemo<{ pct: number; dreamTotal: number; myPoints: number } | null>(() => {
    const approvedStages = stages
      .filter((s) => s.results_status === "approved")
      .sort((a, b) => a.stage_number - b.stage_number);
    if (approvedStages.length === 0 || !entry) return null;

    // 1) per-rider totaal aan etappepunten
    const riderTotals = new Map<string, number>();
    for (const r of allStageResults) {
      if (!r.rider_id) continue;
      const pts = pointsTable[r.finish_position] ?? 0;
      if (pts === 0) continue;
      riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
    }

    // 2) droomploeg subtotalen per categorie
    let dreamTotal = 0;
    const categoryRiderIds = new Set<string>();
    for (const cat of categories) {
      const candidates = (cat.category_riders ?? [])
        .map((cr) =>
          cr.riders ? { id: cr.riders.id, points: riderTotals.get(cr.riders.id) ?? 0 } : null,
        )
        .filter((x): x is { id: string; points: number } => Boolean(x))
        .sort((a, b) => b.points - a.points);
      const optimal = candidates.slice(0, cat.max_picks);
      dreamTotal += optimal.reduce((s, r) => s + r.points, 0);
      for (const cr of cat.category_riders ?? []) {
        if (cr.riders) categoryRiderIds.add(cr.riders.id);
      }
    }

    // 2b) 2 jokers — beste renners die in geen categorie zitten
    const jokerPool = allGameRiders
      .filter((r) => !categoryRiderIds.has(r.id))
      .map((r) => ({ id: r.id, points: riderTotals.get(r.id) ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 2);
    dreamTotal += jokerPool.reduce((s, r) => s + r.points, 0);

    if (dreamTotal === 0) return null;

    // 3) mijn totaal in deze game
    const approvedIds = new Set(approvedStages.map((s) => s.id));
    let myPoints = 0;
    for (const sp of allStagePoints) {
      if (sp.entry_id === entry.id && approvedIds.has(sp.stage_id)) {
        myPoints += sp.points ?? 0;
      }
    }
    return { pct: Math.round((myPoints / dreamTotal) * 100), dreamTotal, myPoints };
  }, [stages, categories, allStageResults, allGameRiders, allStagePoints, entry]);

  // ── Wielerdirecteur (exact dezelfde formule als HorsCategorieTab) ──────────
  const director = useMemo<
    | { score: number; rang: number; totaal: number; poolSub: number; monkeySub: number; jokerSub: number; diffSub: number }
    | null
  >(() => {
    if (!isLive || !entry || !monte) return null;
    const n = totals.length;
    const myRank = n > 0 ? totals.filter((t) => t > myStageTotal).length + 1 : 1;
    const poolScore = n <= 1 ? 0.75 : (n - myRank) / (n - 1);
    const monkeyScore = monte.beatPct / 100;

    // Per-renner finishpunten (gedeelde basis)
    const riderTotals = new Map<string, number>();
    for (const r of allStageResults) {
      if (!r.rider_id) continue;
      const pts = pointsTable[r.finish_position] ?? 0;
      if (pts === 0) continue;
      riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
    }
    const catIds = new Set<string>();
    for (const c of categories) for (const cr of c.category_riders ?? []) if (cr.riders) catIds.add(cr.riders.id);

    // Joker prestatie — rendement (scoorden je jokers punten?)
    let jokerScore = 0.5;
    if (jokerIds.length > 0) {
      const bestJokerPts = allGameRiders
        .filter((r) => !catIds.has(r.id))
        .map((r) => riderTotals.get(r.id) ?? 0)
        .sort((a, b) => b - a)
        .slice(0, 2)
        .reduce((s, p) => s + p, 0);
      const yourJokerPts = jokerIds.reduce((s, jid) => s + (riderTotals.get(jid) ?? 0), 0);
      const rendement = bestJokerPts > 0 ? Math.min(1, Math.max(0, yourJokerPts / bestJokerPts)) : 0.5;
      jokerScore = 0.3 + rendement * 0.7;
    }

    // Differentiaal — punten-gewogen uniciteit van je scorende picks
    let diffScore = 0.5;
    {
      const myPickIds: string[] = [];
      picksByCategory.forEach((ids) => myPickIds.push(...ids));
      const ownOf = (rid: string) => {
        const ps = pickStats.find((p) => p.rider_id === rid);
        return ps && ps.total_entries > 0 ? ps.pick_count / ps.total_entries : 0.15;
      };
      let wsum = 0, psum = 0;
      for (const rid of myPickIds) {
        const pts = riderTotals.get(rid) ?? 0;
        if (pts > 0) { wsum += (1 - ownOf(rid)) * pts; psum += pts; }
      }
      if (psum > 0) diffScore = Math.min(1, Math.max(0, wsum / psum));
    }

    const raw = poolScore * 0.45 + monkeyScore * 0.25 + jokerScore * 0.2 + diffScore * 0.1;
    const score = Math.max(3.0, Math.round((raw * 9 + 1) * 10) / 10);
    const toSub = (v: number) => Math.max(1.0, Math.round((v * 9 + 1) * 10) / 10);
    return {
      score,
      rang: myRank,
      totaal: n,
      poolSub: toSub(poolScore),
      monkeySub: toSub(monkeyScore),
      jokerSub: toSub(jokerScore),
      diffSub: toSub(diffScore),
    };
  }, [isLive, entry, monte, totals, myStageTotal, jokerIds, jokerStats, allStageResults, allGameRiders, categories, picksByCategory, pickStats]);

  // ── Lefevere-input — één bron van waarheid, gedeeld met de Wielerdirecteur-
  //    tab én de Gazetta-feed, zodat de gegenereerde tekst 1-op-1 identiek is
  //    (zelfde React Query cache-key). ──────────────────────────────────────
  const ridersById = useMemo(
    () => Object.fromEntries(allGameRiders.map((r) => [r.id, r])),
    [allGameRiders],
  );
  const lefevereInput = useMemo<LefevereReportInput | null>(() => {
    // Pas bouwen als ALLE data binnen is — anders rekent `director` op
    // halve data (lege totals → tijdelijk fout, te hoog cijfer) en genereren
    // we een rapport dat niet bij het echte cijfer past.
    if (isLoading || !director) return null;
    // Pech-index: eigen renners (picks + jokers) die zijn uitgevallen (DNF).
    const myAllRiderIds: string[] = [...jokerIds];
    picksByCategory.forEach((ids) => myAllRiderIds.push(...ids));
    const uitvallerNamen = Array.from(new Set(myAllRiderIds))
      .filter((id) => (ridersById[id] as { is_dnf?: boolean } | undefined)?.is_dnf)
      .map((id) => ridersById[id]?.name)
      .filter(Boolean) as string[];
    return {
      score: director.score,
      components: {
        poolRanking: { score: director.poolSub, weging: 0.45, rang: director.rang, totaalDeelnemers: director.totaal },
        monkeyVergelijking: { score: director.monkeySub, weging: 0.25, percentageVerslagen: Math.round(monte!.beatPct) },
        jokerPrestatie: { score: director.jokerSub, weging: 0.2, aantalJokers: jokerIds.length },
        differentiaal: { score: director.diffSub, weging: 0.1 },
      },
      deelnemer: { ploegnaam: entry?.team_name ?? undefined },
      etappePrestatie: {
        jokerRenners: jokerIds.map((id) => ridersById[id]?.name).filter(Boolean) as string[],
      },
      pech: { uitvallers: uitvallerNamen.length, namen: uitvallerNamen },
      horsCategorieScores: emirates
        ? { emirates: { percentage: emirates.pct, droomploegPunten: emirates.dreamTotal, jouwPunten: emirates.myPoints } }
        : undefined,
    };
  }, [isLoading, director, monte, jokerIds, entry?.team_name, ridersById, emirates, picksByCategory]);

  const stageCount = stages.filter((s) => s.results_status === "approved").length;

  return {
    monkeyBeatPct: monte ? Math.round(monte.beatPct) : null,
    emiratesPct: emirates ? emirates.pct : null,
    directorScore: director ? director.score : null,
    lefevereInput,
    entryId: entry?.id,
    stageCount,
    isLoading,
  };
}
