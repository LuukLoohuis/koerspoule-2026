import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type BenchmarkEntry = {
  user_id: string;
  display_name: string;
  entry_id: string | null;
  team_name: string | null;
  total_points: number;
};

export type BenchmarkStage = {
  id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  approved_at: string | null;
};

export type BenchmarkCategory = {
  id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
};

export type BenchmarkData = {
  entries: BenchmarkEntry[];
  stages: BenchmarkStage[];
  categories: BenchmarkCategory[];
  stage_points: Array<{ entry_id: string; stage_id: string; points: number }>;
  category_points: Array<{ entry_id: string; category_id: string; points: number }>;
};

export function useSubpouleBenchmark(subpouleId?: string, gameId?: string) {
  return useQuery({
    queryKey: ["subpoule-benchmark", subpouleId, gameId],
    enabled: Boolean(supabase && subpouleId && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<BenchmarkData> => {
      if (!supabase || !subpouleId || !gameId) {
        return { entries: [], stages: [], categories: [], stage_points: [], category_points: [] };
      }
      const { data, error } = await (supabase as any).rpc("subpoule_benchmark_data", {
        p_subpoule_id: subpouleId,
        p_game_id: gameId,
      });
      if (error) throw error;
      return (data ?? {
        entries: [],
        stages: [],
        categories: [],
        stage_points: [],
        category_points: [],
      }) as BenchmarkData;
    },
  });
}
