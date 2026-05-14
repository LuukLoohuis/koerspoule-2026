import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { type BenchmarkData } from "@/hooks/useSubpouleBenchmark";

export type StageDagzege = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  date: string | null;
  points: number;
};

export type PalmaresGame = {
  game_id: string;
  game_name: string;
  game_type: string | null;
  year: number | null;
  status: string;
  entry_id: string;
  approved_points: number;
  my_rank: number;
  total_participants: number;
  stage_wins: number;
  stage_podiums: number;
  dagzeges: StageDagzege[];
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

const emptyBenchmark: BenchmarkData = {
  entries: [],
  stages: [],
  categories: [],
  stage_points: [],
  category_points: [],
  picks: [],
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
        .select("id, game_id, status")
        .eq("user_id", user.id);
      if (e1) throw e1;
      const entries = (myEntries ?? []).filter((e) => e.status === "submitted");
      if (entries.length === 0) return { games: [], subpoules: [] };

      const gameIds = Array.from(new Set(entries.map((e) => e.game_id)));

      // 2) Games metadata
      const { data: games } = await supabase
        .from("games")
        .select("id, name, game_type, year, status")
        .in("id", gameIds);
      const gameMap = new Map((games ?? []).map((g) => [g.id, g]));

      // 3) Fetch game_benchmark_data RPC for each game (SECURITY DEFINER — bypasses RLS)
      const gameBenchmarks = new Map<string, BenchmarkData>();
      await Promise.all(
        gameIds.map(async (gameId) => {
          const { data, error } = await (supabase as any).rpc("game_benchmark_data", {
            p_game_id: gameId,
          });
          if (error) {
            console.error("game_benchmark_data error", gameId, error);
            gameBenchmarks.set(gameId, emptyBenchmark);
          } else {
            gameBenchmarks.set(gameId, { ...emptyBenchmark, ...(data ?? {}) } as BenchmarkData);
          }
        })
      );

      // Lookup: game_id → my submitted entry_id
      const myEntryByGameId = new Map(entries.map((e) => [e.game_id, e.id]));

      // 4) Build per-game palmares from benchmark data
      const palmaresGames: PalmaresGame[] = entries
        .map((myEntry) => {
          const game = gameMap.get(myEntry.game_id);
          if (!game) return null;

          const bm = gameBenchmarks.get(myEntry.game_id) ?? emptyBenchmark;

          // Rank all entries by total_points descending
          const sortedEntries = [...bm.entries].sort((a, b) => b.total_points - a.total_points);
          const myRank =
            sortedEntries.findIndex((e) => e.entry_id === myEntry.id) + 1 ||
            sortedEntries.length;
          const myBmEntry = bm.entries.find((e) => e.entry_id === myEntry.id);
          const approvedPoints = myBmEntry?.total_points ?? 0;

          // Build stageGroups from stage_points
          const stageGroups = new Map<string, { entry_id: string; points: number }[]>();
          for (const sp of bm.stage_points) {
            if (!stageGroups.has(sp.stage_id)) stageGroups.set(sp.stage_id, []);
            stageGroups.get(sp.stage_id)!.push({ entry_id: sp.entry_id, points: sp.points });
          }
          for (const arr of stageGroups.values()) arr.sort((a, b) => b.points - a.points);

          const stageMeta = new Map(bm.stages.map((s) => [s.id, s]));

          let wins = 0;
          let podiums = 0;
          const dagzeges: StageDagzege[] = [];

          for (const [stageId, stageRanked] of stageGroups) {
            const meta = stageMeta.get(stageId);
            if (!meta) continue;
            const idx = stageRanked.findIndex((r) => r.entry_id === myEntry.id);
            if (idx === -1) continue;
            const pts = stageRanked[idx].points;
            if (idx === 0 && pts > 0) {
              wins++;
              dagzeges.push({
                stage_id: stageId,
                stage_number: meta.stage_number,
                stage_name: meta.name,
                date: meta.date,
                points: pts,
              });
            }
            if (idx <= 2 && pts > 0) podiums++;
          }
          dagzeges.sort((a, b) => a.stage_number - b.stage_number);

          return {
            game_id: game.id,
            game_name: game.name,
            game_type: game.game_type ?? null,
            year: game.year ?? null,
            status: game.status,
            entry_id: myEntry.id,
            approved_points: approvedPoints,
            my_rank: myRank,
            total_participants: bm.entries.length,
            stage_wins: wins,
            stage_podiums: podiums,
            dagzeges,
          };
        })
        .filter((p): p is PalmaresGame => p !== null);

      // 5) Subpoules where I am a member
      const { data: myMemberships } = await supabase
        .from("subpoule_members")
        .select("subpoule_id, subpoules!inner(id, name, game_id)")
        .eq("user_id", user.id);

      type MembershipRow = {
        subpoule_id: string;
        subpoules: { id: string; name: string; game_id: string };
      };
      const memberships = (myMemberships ?? []) as unknown as MembershipRow[];

      // 6) Fetch subpoule_benchmark_data RPC for each subpoule (SECURITY DEFINER — bypasses RLS)
      const subpouleBenchmarks = new Map<string, BenchmarkData>();
      await Promise.all(
        memberships.map(async (m) => {
          const sp = m.subpoules;
          const { data, error } = await (supabase as any).rpc("subpoule_benchmark_data", {
            p_subpoule_id: sp.id,
            p_game_id: sp.game_id,
          });
          if (error) {
            console.error("subpoule_benchmark_data error", sp.id, error);
            subpouleBenchmarks.set(sp.id, emptyBenchmark);
          } else {
            subpouleBenchmarks.set(sp.id, { ...emptyBenchmark, ...(data ?? {}) } as BenchmarkData);
          }
        })
      );

      // 7) Build per-subpoule palmares
      const palmaresSubpoules: PalmaresSubpoule[] = memberships
        .map((m) => {
          const sp = m.subpoules;
          const game = gameMap.get(sp.game_id);
          if (!game) return null;

          const mySubmittedEntryId = myEntryByGameId.get(sp.game_id);
          if (!mySubmittedEntryId) return null;

          const bm = subpouleBenchmarks.get(sp.id) ?? emptyBenchmark;

          // Rank subpoule entries by total_points descending
          const sortedEntries = [...bm.entries].sort((a, b) => b.total_points - a.total_points);
          const myRank =
            sortedEntries.findIndex((e) => e.entry_id === mySubmittedEntryId) + 1 ||
            sortedEntries.length;

          // Build stageGroups
          const stageGroups = new Map<string, { entry_id: string; points: number }[]>();
          for (const spRow of bm.stage_points) {
            if (!stageGroups.has(spRow.stage_id)) stageGroups.set(spRow.stage_id, []);
            stageGroups.get(spRow.stage_id)!.push({ entry_id: spRow.entry_id, points: spRow.points });
          }
          for (const arr of stageGroups.values()) arr.sort((a, b) => b.points - a.points);

          let wins = 0;
          let podiums = 0;

          for (const [, stageRanked] of stageGroups) {
            const idx = stageRanked.findIndex((r) => r.entry_id === mySubmittedEntryId);
            if (idx === -1) continue;
            const pts = stageRanked[idx].points;
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
            total_members: bm.entries.length,
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
