/**
 * useMijnPloegStats — één databron voor de ploeg-statistieken.
 *
 * Gelift uit MijnPloegStats.tsx zodat zowel de StatCards dáár als het
 * "La Salle de Course"-dashboard in MyTeamPanel uit hetzelfde object putten.
 * Query-keys zijn ongewijzigd t.o.v. de oude component — React Query dedupet,
 * dus er komt geen enkele extra fetch bij.
 *
 * De getallen volgen dezelfde regels als de Krant en Uitslagen: admins tellen
 * niet mee in het algemeen klassement, gelijke punten delen de plek en de
 * stand gaat over de laatst goedgekeurde rit. Zonder gameId valt de hook terug
 * op de huidige koers; de Volgwagen geeft de koers uit de koerswisselaar mee.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useRiderEntryTotals } from "@/hooks/useRiderEntryTotals";
import {
  useEntries,
  useStages,
  useMyStageRanks,
  useGameStandings,
  useStagePointsForEntries,
  type StageRow,
} from "@/hooks/useResults";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { rangVan } from "@/lib/rang";
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
  /** Puntentotaal van mijn inschrijving. */
  totaalPunten: number | null;
  /** Mijn resultaat in de laatste etappe waar punten voor staan. */
  laatsteEtappe: { stageNumber: number; rank: number | null; points: number } | null;
};

export function useMijnPloegStats(opts?: {
  gameId?: string;
  selectedSubpouleId?: string;
}): MijnPloegStatsData {
  const { user } = useAuth();
  const { data: currentGame } = useCurrentGame();
  const gameId = opts?.gameId ?? currentGame?.id;
  const { entry, jokerIds, picksByCategory } = useEntry(gameId);
  const { data: entries = [] } = useEntries(gameId);
  const { data: stages = [] } = useStages(gameId);
  const { data: myStageRanks } = useMyStageRanks(gameId, user?.id);
  const { subpoules } = useSubpoules(gameId);
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

  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // Goedgekeurde ritten, de GC-rit inbegrepen: dezelfde reeks als de Krant.
  const goedgekeurd = useMemo(
    () =>
      stages
        .filter((s) => s.results_status === "approved")
        .sort((a, b) => a.stage_number - b.stage_number),
    [stages],
  );
  const laatsteRit = goedgekeurd[goedgekeurd.length - 1] ?? null;

  // Algemeen klassement = de stand van Uitslagen: zonder admins, t/m de laatst
  // goedgekeurde rit, met de rang en verschuiving uit de RPC.
  const { data: standRows = [] } = useGameStandings(gameId, laatsteRit?.stage_number, false);

  // Subpoule-leden: scoped stage_points voor de subpoule-delta
  const memberEntryIds = useMemo(() => {
    if (!firstSubpoule || !subpouleMembers.length) return [];
    const uids = new Set(subpouleMembers.map((m) => m.user_id));
    return entries.filter((e) => uids.has(e.user_id)).map((e) => e.id);
  }, [firstSubpoule, subpouleMembers, entries]);
  const { data: memberStagePoints = [] } = useStagePointsForEntries(gameId, memberEntryIds);

  // Eigen punten per etappe. Apart van memberStagePoints, want dat is beperkt
  // tot subpoule-leden en niet iedereen zit in een subpoule.
  const myEntryIds = useMemo(() => (myEntry ? [myEntry.id] : []), [myEntry]);
  const { data: myStagePoints = [] } = useStagePointsForEntries(gameId, myEntryIds);

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
  // Admins staan niet in deze stand; voor hen blijft het "—", net als in de Krant.
  const overall = useMemo(() => {
    if (!myEntry || !standRows.length) return null;
    const myRow = standRows.find((r) => r.entry_id === myEntry.id);
    if (!myRow) return null;
    return { rank: myRow.rank, total: standRows.length, delta: myRow.delta ?? 0 };
  }, [myEntry, standRows]);

  // ── 3: Subpoule-rang + delta ──
  const subpoule = useMemo(() => {
    // Vóór de eerste goedgekeurde rit is er nog geen stand ("—", zoals de Krant).
    if (!myEntry || !firstSubpoule || !subpouleMembers.length || !laatsteRit) return null;

    const memberUserIds = new Set(subpouleMembers.map((m) => m.user_id));
    const memberEntries = entries.filter((e) => memberUserIds.has(e.user_id));
    if (!memberEntries.some((e) => e.id === myEntry.id)) return null;

    // Officiële totalen, gelijke punten delen de plek (zoals de Krant).
    const totaal = (e: { total_points?: number | null }) => e.total_points ?? 0;
    const rank = rangVan(totaal(myEntry), memberEntries.map(totaal));

    // Verschuiving t.o.v. de vorige goedgekeurde rit. De stand van toen is het
    // officiële totaal min de punten van de laatste rit: dezelfde terugrekening
    // als de Krant, zodat bonuspunten aan beide kanten gelijk meetellen.
    let delta = 0;
    if (goedgekeurd.length >= 2 && laatsteRit) {
      const laatstePunten = new Map<string, number>();
      for (const sp of memberStagePoints) {
        if (sp.stage_id === laatsteRit.id) {
          laatstePunten.set(sp.entry_id, (laatstePunten.get(sp.entry_id) ?? 0) + sp.points);
        }
      }
      const vorig = (e: { id: string; total_points?: number | null }) =>
        totaal(e) - (laatstePunten.get(e.id) ?? 0);
      delta = rangVan(vorig(myEntry), memberEntries.map(vorig)) - rank;
    }

    return { rank, total: memberEntries.length, name: firstSubpoule.name, delta };
  }, [myEntry, firstSubpoule, subpouleMembers, entries, goedgekeurd, laatsteRit, memberStagePoints]);

  // ── 4: Topscorer ──
  // Uit dezelfde rennertotalen als het ploegblad, zodat de topscorer en de
  // gouden medaille daar dezelfde renner met hetzelfde aantal punten zijn.
  const { data: riderTotals } = useRiderEntryTotals(gameId, entry?.id);
  const topRenner = useMemo(() => {
    if (!riderTotals) return null;
    let best: { id: string; points: number } | null = null;
    for (const id of allRiderIds) {
      const points = riderTotals.get(id) ?? 0;
      if (points > 0 && (!best || points > best.points)) best = { id, points };
    }
    return best;
  }, [riderTotals, allRiderIds]);
  const { data: topRennerNaam } = useQuery({
    queryKey: ["rider-name", topRenner?.id],
    enabled: Boolean(supabase && topRenner?.id),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase!.from("riders").select("name").eq("id", topRenner!.id).single();
      if (error) throw error;
      return (data?.name as string | undefined) ?? "—";
    },
  });
  const topscorer = topRenner && topRennerNaam ? { name: topRennerNaam, points: topRenner.points } : null;

  // ── 5: Laatste etappe met punten ──
  const laatsteEtappe = useMemo(() => {
    const ritten = goedgekeurd.filter((s) => !s.is_gc);
    const laatste = ritten[ritten.length - 1];
    if (!laatste || !myEntry) return null;
    const punten = myStagePoints
      .filter((sp) => sp.stage_id === laatste.id && sp.entry_id === myEntry.id)
      .reduce((som, sp) => som + sp.points, 0);
    return {
      stageNumber: laatste.stage_number,
      rank: myStageRanks?.get(laatste.id) ?? null,
      points: punten,
    };
  }, [goedgekeurd, myEntry, myStagePoints, myStageRanks]);

  return {
    bestStageRank,
    overall,
    subpoule,
    topscorer,
    myStageRanks: myStageRanks ?? null,
    totaalPunten: myEntry?.total_points ?? null,
    laatsteEtappe,
  };
}
