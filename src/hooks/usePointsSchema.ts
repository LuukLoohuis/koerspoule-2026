import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
