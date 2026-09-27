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
 * Etappepunten als lookup, voor de live projectie van de Meermarathon.
 *
 * Die moet met exact dezelfde getallen rekenen als calculate_stage_scores,
 * anders wijkt de voorlopige stand af van wat er bij het fiatteren uitkomt.
 * Een jokerfactor hoort er niet bij: de Meermarathon kent geen jokers.
 */
export function useStagePointsSchema(gameId?: string) {
  const rows = usePointsSchema(gameId);

  const schema: PointsSchema = new Map();
  for (const row of rows.data ?? []) {
    if (row.classification === "stage") schema.set(row.position, row.points);
  }

  return { schema, isLoading: rows.isLoading };
}
