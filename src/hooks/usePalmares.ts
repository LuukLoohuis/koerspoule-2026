import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type PalmaresGame = {
  game_id: string;
  game_name: string;
  game_type: string | null;
  year: number | null;
  status: string;
  entry_id: string;
  total_points: number;
  my_rank: number;
  total_participants: number;
  stage_wins: number; // # stages where my entry was #1 in pool
  stage_podiums: number; // # stages where my entry was top-3 in pool
  best_stage_points: number;
};

export type PalmaresSubpoule = {
  subpoule_id: string;
  subpoule_name: string;
  game_id: string;
  game_name: string;
  game_type: string | null;
  my_rank: number;
  total_members: number;
  is_winner: boolean;
  stage_wins: number;
  stage_podiums: number;
};

export function usePalmares() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["palmares", user?.id],
    enabled: Boolean(supabase && user?.id),
    queryFn: async (): Promise<{ games: PalmaresGame[]; subpoules: PalmaresSubpoule[] }> => {
      if (!supabase || !user?.id) return { games: [], subpoules: [] };

      // 1) All my submitted entries
      const { data: myEntries, error: e1 } = await supabase
        .from("entries")
        .select("id, game_id, total_points, status")
        .eq("user_id", user.id);
      if (e1) throw e1;
      const entries = (myEntries ?? []).filter((e) => e.status === "submitted" || (e.total_points ?? 0) > 0);
      if (entries.length === 0) return { games: [], subpoules: [] };

      const gameIds = Array.from(new Set(entries.map((e) => e.game_id)));

      // 2) Games metadata
      const { data: games } = await supabase
        .from("games")
        .select("id, name, game_type, year, status")
        .in("id", gameIds);
      const gameMap = new Map((games ?? []).map((g) => [g.id, g]));

      // 3) All entries per game (for ranking + participant count)
      const { data: allEntries } = await supabase
        .from("entries")
        .select("id, game_id, user_id, total_points")
        .in("game_id", gameIds)
        .eq("status", "submitted");

      // 4) Stage points across all games at once
      const { data: stagePoints } = await supabase
        .from("stage_points")
        .select("entry_id, stage_id, points, stages!inner(game_id)")
        .in("stages.game_id", gameIds);

      // Index stage points: stage_id → ranked entries
      const stageGroups = new Map<string, { entry_id: string; points: number }[]>();
      for (const sp of (stagePoints ?? []) as Array<{ entry_id: string; stage_id: string; points: number }>) {
        if (!stageGroups.has(sp.stage_id)) stageGroups.set(sp.stage_id, []);
        stageGroups.get(sp.stage_id)!.push({ entry_id: sp.entry_id, points: sp.points });
      }
      // Sort each group desc
      for (const arr of stageGroups.values()) arr.sort((a, b) => b.points - a.points);

      // Build per-game palmares
      const palmaresGames: PalmaresGame[] = entries
        .map((myEntry) => {
          const game = gameMap.get(myEntry.game_id);
          if (!game) return null;

          const gameEntries = (allEntries ?? [])
            .filter((e) => e.game_id === myEntry.game_id)
            .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
          const myRank = gameEntries.findIndex((e) => e.id === myEntry.id) + 1;

          // count stage wins / podiums for my entry
          let wins = 0;
          let podiums = 0;
          let bestStage = 0;
          for (const [, ranked] of stageGroups) {
            const idx = ranked.findIndex((r) => r.entry_id === myEntry.id);
            if (idx === -1) continue;
            const pts = ranked[idx].points;
            if (pts > bestStage) bestStage = pts;
            if (idx === 0 && pts > 0) wins++;
            if (idx <= 2 && pts > 0) podiums++;
          }

          return {
            game_id: game.id,
            game_name: game.name,
            game_type: game.game_type ?? null,
            year: game.year ?? null,
            status: game.status,
            entry_id: myEntry.id,
            total_points: myEntry.total_points ?? 0,
            my_rank: myRank || gameEntries.length,
            total_participants: gameEntries.length,
            stage_wins: wins,
            stage_podiums: podiums,
            best_stage_points: bestStage,
          };
        })
        .filter((p): p is PalmaresGame => p !== null);

      // 5) Subpoules where I am member
      const { data: myMemberships } = await supabase
        .from("subpoule_members")
        .select("subpoule_id, subpoules!inner(id, name, game_id)")
        .eq("user_id", user.id);

      type MembershipRow = {
        subpoule_id: string;
        subpoules: { id: string; name: string; game_id: string };
      };
      const memberships = (myMemberships ?? []) as unknown as MembershipRow[];
      const subpouleIds = memberships.map((m) => m.subpoule_id);

      // Members of each subpoule
      const { data: allMembers } = subpouleIds.length
        ? await supabase
            .from("subpoule_members")
            .select("subpoule_id, user_id")
            .in("subpoule_id", subpouleIds)
        : { data: [] };

      const palmaresSubpoules: PalmaresSubpoule[] = memberships
        .map((m) => {
          const sp = m.subpoules;
          const game = gameMap.get(sp.game_id);
          if (!game) return null;

          // members of this subpoule
          const memberUserIds = (allMembers ?? [])
            .filter((mm) => mm.subpoule_id === sp.id)
            .map((mm) => mm.user_id);

          // entries of those members in this game
          const memberEntries = (allEntries ?? [])
            .filter((e) => e.game_id === sp.game_id && memberUserIds.includes(e.user_id))
            .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));

          const myEntryInGame = memberEntries.find((e) => e.user_id === user.id);
          if (!myEntryInGame) return null;

          const myRank = memberEntries.findIndex((e) => e.id === myEntryInGame.id) + 1;

          // stage wins/podiums within subpoule
          const memberEntryIds = new Set(memberEntries.map((e) => e.id));
          let wins = 0;
          let podiums = 0;
          for (const [, ranked] of stageGroups) {
            const subRanked = ranked.filter((r) => memberEntryIds.has(r.entry_id));
            if (subRanked.length === 0) continue;
            const idx = subRanked.findIndex((r) => r.entry_id === myEntryInGame.id);
            if (idx === -1) continue;
            const pts = subRanked[idx].points;
            if (idx === 0 && pts > 0) wins++;
            if (idx <= 2 && pts > 0) podiums++;
          }

          return {
            subpoule_id: sp.id,
            subpoule_name: sp.name,
            game_id: sp.game_id,
            game_name: game.name,
            game_type: game.game_type ?? null,
            my_rank: myRank,
            total_members: memberEntries.length,
            is_winner: myRank === 1,
            stage_wins: wins,
            stage_podiums: podiums,
          };
        })
        .filter((p): p is PalmaresSubpoule => p !== null);

      return { games: palmaresGames, subpoules: palmaresSubpoules };
    },
  });
}
