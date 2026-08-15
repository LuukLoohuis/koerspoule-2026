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
  stages_count: number;
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

type PalmaresSummary = {
  games: PalmaresGame[];
  subpoules: PalmaresSubpoule[];
};

const emptyBenchmark: BenchmarkData = {
  entries: [],
  stages: [],
  categories: [],
  stage_points: [],
  category_points: [],
  picks: [],
};

async function fetchLegacyPalmares(userId: string): Promise<PalmaresSummary> {
  if (!supabase) return { games: [], subpoules: [] };

  const { data: myEntries, error: entriesError } = await supabase
    .from("entries")
    .select("id, game_id, status")
    .eq("user_id", userId);
  if (entriesError) throw entriesError;

  const entries = (myEntries ?? []).filter((entry) => entry.status === "submitted");
  if (entries.length === 0) return { games: [], subpoules: [] };

  const gameIds = Array.from(new Set(entries.map((entry) => entry.game_id)));
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, name, game_type, year, status")
    .in("id", gameIds);
  if (gamesError) throw gamesError;

  const gameMap = new Map((games ?? []).map((game) => [game.id, game]));
  const gameBenchmarks = new Map<string, BenchmarkData>();

  await Promise.all(gameIds.map(async (gameId) => {
    const { data, error } = await supabase.rpc("game_benchmark_data", { p_game_id: gameId });
    gameBenchmarks.set(
      gameId,
      error ? emptyBenchmark : { ...emptyBenchmark, ...(data ?? {}) } as BenchmarkData,
    );
  }));

  const myEntryByGameId = new Map(entries.map((entry) => [entry.game_id, entry.id]));
  const palmaresGames: PalmaresGame[] = entries.flatMap((myEntry) => {
    const game = gameMap.get(myEntry.game_id);
    if (!game) return [];

    const benchmark = gameBenchmarks.get(myEntry.game_id) ?? emptyBenchmark;
    const sortedEntries = [...benchmark.entries].sort((a, b) => b.total_points - a.total_points);
    const myRank = sortedEntries.findIndex((entry) => entry.entry_id === myEntry.id) + 1 || sortedEntries.length;
    const approvedPoints = benchmark.entries.find((entry) => entry.entry_id === myEntry.id)?.total_points ?? 0;
    const stageGroups = new Map<string, { entry_id: string; points: number }[]>();

    for (const stagePoint of benchmark.stage_points) {
      if (!stageGroups.has(stagePoint.stage_id)) stageGroups.set(stagePoint.stage_id, []);
      stageGroups.get(stagePoint.stage_id)!.push({ entry_id: stagePoint.entry_id, points: stagePoint.points });
    }
    for (const stageEntries of stageGroups.values()) stageEntries.sort((a, b) => b.points - a.points);

    const stageMeta = new Map(benchmark.stages.map((stage) => [stage.id, stage]));
    const dagzeges: StageDagzege[] = [];
    let stageWins = 0;
    let stagePodiums = 0;

    for (const [stageId, stageEntries] of stageGroups) {
      const meta = stageMeta.get(stageId);
      if (!meta) continue;
      const index = stageEntries.findIndex((entry) => entry.entry_id === myEntry.id);
      if (index === -1) continue;
      const points = stageEntries[index].points;
      if (index === 0 && points > 0) {
        stageWins += 1;
        dagzeges.push({
          stage_id: stageId,
          stage_number: meta.stage_number,
          stage_name: meta.name,
          date: meta.date,
          points,
        });
      }
      if (index <= 2 && points > 0) stagePodiums += 1;
    }

    dagzeges.sort((a, b) => a.stage_number - b.stage_number);
    return [{
      game_id: game.id,
      game_name: game.name,
      game_type: game.game_type ?? null,
      year: game.year ?? null,
      status: game.status,
      entry_id: myEntry.id,
      approved_points: approvedPoints,
      my_rank: myRank,
      total_participants: benchmark.entries.length,
      stage_wins: stageWins,
      stage_podiums: stagePodiums,
      stages_count: benchmark.stages.length,
      dagzeges,
    }];
  });

  const { data: myMemberships, error: membershipsError } = await supabase
    .from("subpoule_members")
    .select("subpoule_id, subpoules!inner(id, name, game_id)")
    .eq("user_id", userId);
  if (membershipsError) throw membershipsError;

  type MembershipRow = {
    subpoule_id: string;
    subpoules: { id: string; name: string; game_id: string };
  };
  const memberships = (myMemberships ?? []) as unknown as MembershipRow[];
  const subpouleBenchmarks = new Map<string, BenchmarkData>();

  await Promise.all(memberships.map(async (membership) => {
    const subpoule = membership.subpoules;
    const { data, error } = await supabase.rpc("subpoule_benchmark_data", {
      p_subpoule_id: subpoule.id,
      p_game_id: subpoule.game_id,
    });
    subpouleBenchmarks.set(
      subpoule.id,
      error ? emptyBenchmark : { ...emptyBenchmark, ...(data ?? {}) } as BenchmarkData,
    );
  }));

  const palmaresSubpoules: PalmaresSubpoule[] = memberships.flatMap((membership) => {
    const subpoule = membership.subpoules;
    const game = gameMap.get(subpoule.game_id);
    const myEntryId = myEntryByGameId.get(subpoule.game_id);
    if (!game || !myEntryId) return [];

    const benchmark = subpouleBenchmarks.get(subpoule.id) ?? emptyBenchmark;
    const sortedEntries = [...benchmark.entries].sort((a, b) => b.total_points - a.total_points);
    const myRank = sortedEntries.findIndex((entry) => entry.entry_id === myEntryId) + 1 || sortedEntries.length;
    const stageGroups = new Map<string, { entry_id: string; points: number }[]>();

    for (const stagePoint of benchmark.stage_points) {
      if (!stageGroups.has(stagePoint.stage_id)) stageGroups.set(stagePoint.stage_id, []);
      stageGroups.get(stagePoint.stage_id)!.push({ entry_id: stagePoint.entry_id, points: stagePoint.points });
    }
    for (const stageEntries of stageGroups.values()) stageEntries.sort((a, b) => b.points - a.points);

    let stageWins = 0;
    let stagePodiums = 0;
    for (const stageEntries of stageGroups.values()) {
      const index = stageEntries.findIndex((entry) => entry.entry_id === myEntryId);
      if (index === -1) continue;
      const points = stageEntries[index].points;
      if (index === 0 && points > 0) stageWins += 1;
      if (index <= 2 && points > 0) stagePodiums += 1;
    }

    return [{
      subpoule_id: subpoule.id,
      subpoule_name: subpoule.name,
      game_id: subpoule.game_id,
      game_name: game.name,
      game_type: game.game_type ?? null,
      my_rank: myRank,
      total_members: benchmark.entries.length,
      is_winner: myRank === 1,
      stage_wins: stageWins,
      stage_podiums: stagePodiums,
    }];
  });

  return { games: palmaresGames, subpoules: palmaresSubpoules };
}

export function usePalmares() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["palmares", user?.id],
    enabled: Boolean(supabase && user?.id),
    // Historische erelijst — wijzigt zelden en blijft tijdens de sessie warm.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PalmaresSummary> => {
      if (!supabase || !user?.id) return { games: [], subpoules: [] };
      const { data, error } = await supabase.rpc("user_palmares_summary");
      const summary = data as unknown as Partial<{
        games: PalmaresGame[];
        subpoules: PalmaresSubpoule[];
      }> | null;

      if (!error && (summary?.games?.length ?? 0) > 0) {
        return { games: summary?.games ?? [], subpoules: summary?.subpoules ?? [] };
      }

      return fetchLegacyPalmares(user.id);
    },
  });
}
