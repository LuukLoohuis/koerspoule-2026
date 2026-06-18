import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePointsForEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import type { Celebration } from "@/components/DaguitslagCelebration";

/**
 * useDaguitslagCelebration — vuurt het ritzege/podium-feestje (confetti + banner)
 * voor de ingelogde gebruiker op de LAATSTE gefiatteerde rit van een subpoule.
 *
 * Losgekoppeld van DaguitslagChart zodat het ook afgaat op tabs zónder de chart
 * (bv. de Ranking-tab van een subpoule, waar je als eerste binnenkomt). Vuurt
 * één keer per scope+rit via localStorage; de scope-key is identiek aan die van
 * DaguitslagChart, dus chart en Ranking vieren samen hooguit één keer.
 */
export function useDaguitslagCelebration(
  subpouleId?: string,
  gameId?: string,
  gameStatus?: string,
): { celebration: Celebration | null; closeCelebration: () => void } {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;

  const { data: members = [] } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);

  const memberEntryIds = useMemo(() => {
    const ids = new Set(members.map((m) => m.user_id));
    return entries.filter((e) => ids.has(e.user_id)).map((e) => e.id);
  }, [members, entries]);
  const { data: stagePoints = [] } = useStagePointsForEntries(game?.id, memberEntryIds);

  // Laatste gefiatteerde rit (geen GC-row).
  const latestApproved = useMemo(() => {
    const approved = stages.filter((s) => !s.is_gc && s.results_status === "approved");
    return approved.length ? approved[approved.length - 1] : null;
  }, [stages]);

  // Mijn rang onder de scorers van die rit (alleen wie punten heeft telt mee).
  const myRank = useMemo(() => {
    if (!user?.id || !latestApproved) return 0;
    const pts = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === latestApproved.id)
      .forEach((sp) => pts.set(sp.entry_id, (pts.get(sp.entry_id) ?? 0) + sp.points));
    const ranked = members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return { user_id: m.user_id, points: entry ? pts.get(entry.id) ?? 0 : 0 };
      })
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points);
    const idx = ranked.findIndex((r) => r.user_id === user.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [user?.id, latestApproved, stagePoints, members, entries]);

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const closeCelebration = useCallback(() => setCelebration(null), []);
  const stageId = latestApproved?.id;
  useEffect(() => {
    if (!stageId || myRank < 1 || myRank > 3) return;
    const scope = subpouleId || `game-${game?.id ?? ""}`;
    const key = `kp_celebrated:${scope}:${stageId}:${myRank}`;
    let already = true;
    try {
      already = localStorage.getItem(key) === "1";
    } catch {
      already = true; // localStorage geblokkeerd → niet vieren (geen spam/crash)
    }
    if (already) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* negeer */
    }
    setCelebration({ type: myRank === 1 ? "win" : "podium", rank: myRank });
  }, [stageId, myRank, subpouleId, game?.id]);

  return { celebration, closeCelebration };
}
