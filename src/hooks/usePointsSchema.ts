import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PointsSchema } from "@/lib/liveMarathon";

export type PointsSchemaRow = {
  classification: "stage" | "gc" | "kom" | "points" | "youth";
  position: number;
  points: number;
};

export function usePointsSchema(gameId?: string) {
  return useQuery({
    queryKey: ["points-schema", gameId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<PointsSchemaRow[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("points_schema")
        .select("classification, position, points")
        .eq("game_id", gameId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PointsSchemaRow[];
    },
  });
}

/**
 * Etappepunten als lookup, plus de jokerfactor van de game.
 *
 * De live projectie in de Volgwagen moet met exact dezelfde getallen rekenen
 * als calculate_stage_scores, anders wijkt de voorlopige stand af van wat er
 * bij het fiatteren uitkomt.
 */
export function useStagePointsSchema(gameId?: string) {
  const rows = usePointsSchema(gameId);

  const joker = useQuery({
    queryKey: ["joker-multiplier", gameId],
    enabled: Boolean(gameId) && Boolean(supabase),
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !gameId) return 2;
      const { data } = await supabase
        .from("games")
        .select("joker_multiplier")
        .eq("id", gameId)
        .maybeSingle();
      return (data as { joker_multiplier?: number | null } | null)?.joker_multiplier ?? 2;
    },
  });

  const schema: PointsSchema = new Map();
  for (const row of rows.data ?? []) {
    if (row.classification === "stage") schema.set(row.position, row.points);
  }

  return { schema, jokerMultiplier: joker.data ?? 2, isLoading: rows.isLoading };
}
