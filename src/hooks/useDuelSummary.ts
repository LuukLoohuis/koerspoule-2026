import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useSubpouleEntries, useGameEntries } from "@/hooks/useSubpouleEntries";
import { useRiderBasePoints } from "@/components/TeamComparison";
import { useJokerMultiplier } from "@/hooks/useJokerMultiplier";

export type DuelRow = { label: string; diff: number; same: boolean };
export type DuelSummaryData = {
  ready: boolean;
  isLoading: boolean;
  hasTeams: boolean;
  myTotal: number;
  oppTotal: number;
  rows: DuelRow[];
};

/**
 * Compacte duel-cijfers voor de popover, gedeeld met dezelfde bronnen als
 * TeamComparison (react-query dedupet, dus geen dubbele fetch). Geeft de totalen
 * en per-categorie het verschil + "zelfde keuze"-vlag terug — exact dezelfde
 * berekening als in TeamComparison, maar zonder de volledige weergave.
 */
export function useDuelSummary(
  subpouleId: string | undefined,
  gameId: string | undefined,
  myUserId: string | undefined,
  opponentUserId: string | undefined,
): DuelSummaryData {
  const { data: categories = [] } = useCategories(gameId);
  const { data: subpouleData, isLoading: subLoading } = useSubpouleEntries(subpouleId, gameId);
  const { data: gameData, isLoading: gameLoading } = useGameEntries(subpouleId ? undefined : gameId);
  const detail = subpouleId ? subpouleData : gameData;
  const isLoading = subpouleId ? subLoading : gameLoading;
  const { data: basePts } = useRiderBasePoints(gameId);
  const jokerMult = useJokerMultiplier(gameId);

  return useMemo<DuelSummaryData>(() => {
    const me = detail?.entries.find((e) => e.user_id === myUserId) ?? null;
    const opp = detail?.entries.find((e) => e.user_id === opponentUserId) ?? null;
    if (!me?.entry_id || !opp?.entry_id) {
      return { ready: false, isLoading, hasTeams: false, myTotal: 0, oppTotal: 0, rows: [] };
    }
    const pointFor = (id: string, jokers: Set<string>) => (basePts?.get(id) ?? 0) * (jokers.has(id) ? jokerMult : 1);
    const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const rows: DuelRow[] = sorted.map((cat) => {
      const myIds = me.picks.get(cat.id) ?? [];
      const oppIds = opp.picks.get(cat.id) ?? [];
      const same =
        myIds.length > 0 && myIds.length === oppIds.length && myIds.every((id) => oppIds.includes(id));
      const myPts = myIds.reduce((s, id) => s + pointFor(id, me.jokers), 0);
      const oppPts = oppIds.reduce((s, id) => s + pointFor(id, opp.jokers), 0);
      return { label: cat.short_name || cat.name, diff: myPts - oppPts, same };
    });
    return { ready: true, isLoading, hasTeams: true, myTotal: me.total_points, oppTotal: opp.total_points, rows };
  }, [detail, categories, basePts, jokerMult, myUserId, opponentUserId, isLoading]);
}
