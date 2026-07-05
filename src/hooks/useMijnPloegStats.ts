/**
 * useMijnPloegStats — één databron voor de ploeg-statistieken.
 *
 * Gelift uit MijnPloegStats.tsx zodat zowel de StatCards dáár als het
 * "La Salle de Course"-dashboard in MyTeamPanel uit hetzelfde object putten.
 * Query-keys zijn ongewijzigd t.o.v. de oude component — React Query dedupet,
 * dus er komt geen enkele extra fetch bij.
 *
 * NB: bewust op de húidige game gebaseerd (useCurrentGame), identiek aan het
 * oude gedrag van MijnPloegStats.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useJokerMultiplier } from "@/hooks/useJokerMultiplier";
import { useEntry } from "@/hooks/useEntry";
import { fetchAllRows } from "@/lib/fetchAll";
import {
  useEntries,
  useStages,
  useStageAverages,
  useMyStageRanks,
  useGameStandings,
  useStagePointsForEntries,
  type StageRow,
} from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { supabase } from "@/lib/supabase";

export type MijnPloegStatsData = {
  /** Beste dagklassering in de hele poule (+ bijbehorende etappe). */
  bestStageRank: { rank: number; stage: StageRow | null } | null;
  /** Stand in de volledige poule. */
  overall: { rank: number; total: number; delta: number } | null;
  /** Stand binnen de (eerste) subpoule. */
  subpoule: { rank: number; total: number; delta: number; name: string } | null;
  /** Best scorende renner uit jouw selectie. */
  topscorer: { name: string; points: number } | null;
  /** Mijn dagklassering per etappe (stage_id → rang) — voor "Beste etappe". */
  myStageRanks: Map<string, number> | null;
};

function rankInMap(
  map: Map<string, number>,
  entryId: string,
  pool: Array<{ id: string }>,
): number {
  const sorted = pool.map((e) => ({ id: e.id, pts: map.get(e.id) ?? 0 })).sort((a, b) => b.pts - a.pts);
  return sorted.findIndex((e) => e.id === entryId) + 1;
}

export function useMijnPloegStats(opts?: { selectedSubpouleId?: string }): MijnPloegStatsData {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const jokerMult = useJokerMultiplier(game?.id);
  const { entry, jokerIds, picksByCategory } = useEntry(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stageAverages } = useStageAverages(game?.id);
  const { data: myStageRanks } = useMyStageRanks(game?.id, user?.id);
  const { data: schema = [] } = usePointsSchema(game?.id);
  const { subpoules } = useSubpoules(game?.id);
  // De getoonde subpoule volgt de selectie uit het dashboard (dropdown bij
  // meerdere subpoules); zonder selectie valt 'ie terug op de eerste.
  const firstSubpoule =
    (opts?.selectedSubpouleId
      ? subpoules.find((s) => s.id === opts.selectedSubpouleId)
      : undefined) ??
    subpoules[0] ??
    null;
  const { data: subpouleMembers = [] } = useSubpouleMembers(firstSubpoule?.id);

  // Alle gekozen + joker-renners
  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) set.add(id);
    for (const id of jokerIds) set.add(id);
    return Array.from(set);
  }, [picksByCategory, jokerIds]);

  // Alle stage-results van mijn renners — voor de topscorer-berekening
  const { data: ridersAllResults = [] } = useQuery({
    queryKey: ["my-riders-all-stage-results", entry?.id, allRiderIds.slice().sort().join(",")],
    enabled: Boolean(supabase && entry?.id && allRiderIds.length > 0),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!supabase || !allRiderIds.length) return [];
      // Gepagineerd: één grote range kapt alsnog op de Max rows-serverlimiet.
      return fetchAllRows<{
        rider_id: string;
        finish_position: number;
        stage_id: string;
        riders: { name: string } | null;
      }>((from, to) =>
        supabase!
          .from("stage_results")
          .select("rider_id, finish_position, stage_id, riders(name)")
          .in("rider_id", allRiderIds)
          .not("finish_position", "is", null)
          .order("stage_id")
          .range(from, to) as never,
      );
    },
  });

  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // Etappes met daadwerkelijk geregistreerde punten
  const stagesWithData = useMemo(() => {
    return stages.filter((s) => (stageAverages?.get(s.id) ?? 0) > 0);
  }, [stages, stageAverages]);

  // Server-side stand t/m laatste etappe-met-data → rang-delta
  const lastStageNum = stagesWithData.length
    ? stagesWithData[stagesWithData.length - 1].stage_number
    : undefined;
  const { data: standRows = [] } = useGameStandings(game?.id, lastStageNum);

  // Subpoule-leden: scoped stage_points voor de subpoule-delta
  const memberEntryIds = useMemo(() => {
    if (!firstSubpoule || !subpouleMembers.length) return [];
    const uids = new Set(subpouleMembers.map((m) => m.user_id));
    return entries.filter((e) => uids.has(e.user_id)).map((e) => e.id);
  }, [firstSubpoule, subpouleMembers, entries]);
  const { data: memberStagePoints = [] } = useStagePointsForEntries(game?.id, memberEntryIds);

  // ── 1: Beste dagklassering in de volle poule ──
  const bestStageRank = useMemo(() => {
    if (!myStageRanks || myStageRanks.size === 0) return null;
    let best: { rank: number; stageId: string } | null = null;
    myStageRanks.forEach((rank, stageId) => {
      if (!best || rank < best.rank) best = { rank, stageId };
    });
    if (!best) return null;
    const stage = stages.find((s) => s.id === best!.stageId);
    return { rank: best.rank, stage: stage ?? null };
  }, [myStageRanks, stages]);

  // ── 2: Overall poule-rang + delta ──
  const overall = useMemo(() => {
    if (!myEntry || !entries.length) return null;
    const sorted = [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;
    const myRow = standRows.find((r) => r.entry_id === myEntry.id);
    const delta = myRow?.delta ?? 0;
    return { rank, total: entries.length, delta };
  }, [myEntry, entries, standRows]);

  // ── 3: Subpoule-rang + delta ──
  const subpoule = useMemo(() => {
    if (!myEntry || !firstSubpoule || !subpouleMembers.length) return null;

    const memberUserIds = new Set(subpouleMembers.map((m) => m.user_id));
    const memberEntries = entries.filter((e) => memberUserIds.has(e.user_id));
    if (!memberEntries.length) return null;

    const sorted = [...memberEntries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;

    let delta = 0;
    if (stagesWithData.length >= 2) {
      const ids = new Set(memberEntries.map((e) => e.id));
      const lastIdx = stages.indexOf(stagesWithData[stagesWithData.length - 1]);
      const prevIdx = stages.indexOf(stagesWithData[stagesWithData.length - 2]);

      const subCum = (upToIdx: number) => {
        const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
        const m = new Map<string, number>();
        memberStagePoints
          .filter((sp) => allowed.has(sp.stage_id) && ids.has(sp.entry_id))
          .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
        return m;
      };

      delta = rankInMap(subCum(prevIdx), myEntry.id, memberEntries) - rankInMap(subCum(lastIdx), myEntry.id, memberEntries);
    }

    return { rank, total: memberEntries.length, name: firstSubpoule.name, delta };
  }, [myEntry, firstSubpoule, subpouleMembers, entries, stagesWithData, stages, memberStagePoints]);

  // ── 4: Topscorer ──
  const topscorer = useMemo(() => {
    if (!schema.length || !ridersAllResults.length) return null;

    const jokerSet = new Set(jokerIds);
    const ptsTable = new Map(
      schema.filter((s) => s.classification === "stage").map((s) => [s.position, s.points]),
    );

    const riderTotals = new Map<string, { pts: number; name: string }>();
    for (const r of ridersAllResults) {
      const base = ptsTable.get(r.finish_position) ?? 0;
      if (base === 0) continue;
      const pts = jokerSet.has(r.rider_id) ? base * jokerMult : base;
      const name = (r.riders as { name: string } | null)?.name ?? "—";
      const cur = riderTotals.get(r.rider_id);
      riderTotals.set(r.rider_id, { pts: (cur?.pts ?? 0) + pts, name: cur?.name ?? name });
    }

    let best: { pts: number; name: string } | null = null;
    for (const info of riderTotals.values()) {
      if (!best || info.pts > best.pts) best = info;
    }
    return best?.pts ? { name: best.name, points: best.pts } : null;
  }, [schema, ridersAllResults, jokerIds, jokerMult]);

  return { bestStageRank, overall, subpoule, topscorer, myStageRanks: myStageRanks ?? null };
}
