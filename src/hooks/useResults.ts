import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type StageRow = {
  id: string;
  game_id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  status: string | null;
  stage_type: "vlak" | "heuvelachtig" | "tijdrit" | "bergop" | "ploegentijdrit" | null;
};

export function useStages(gameId?: string) {
  return useQuery({
    queryKey: ["stages", gameId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<StageRow[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("stages")
        .select("id, game_id, stage_number, name, date, status, stage_type")
        .eq("game_id", gameId)
        .order("stage_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StageRow[];
    },
  });
}

export type StageResultRow = {
  id: string;
  stage_id: string;
  rider_id: string;
  rider_name: string | null;
  start_number: number | null;
  finish_position: number | null;
  gc_position: number | null;
  mountain_position: number | null;
  points_position: number | null;
  youth_position: number | null;
  did_finish: boolean | null;
  riders?: {
    id: string;
    name: string;
    start_number: number | null;
    team_id: string | null;
    teams?: { name: string } | null;
  } | null;
};

export function useStageResults(stageId?: string) {
  return useQuery({
    queryKey: ["stage-results", stageId],
    enabled: Boolean(stageId),
    queryFn: async (): Promise<StageResultRow[]> => {
      if (!supabase || !stageId) return [];
      const { data, error } = await supabase
        .from("stage_results")
        .select(
          "id, stage_id, rider_id, rider_name, start_number, finish_position, gc_position, mountain_position, points_position, youth_position, did_finish, riders(id, name, start_number, team_id, teams(name))"
        )
        .eq("stage_id", stageId);
      if (error) throw error;
      return ((data ?? []) as unknown) as StageResultRow[];
    },
  });
}

/** Stage points per entry, for the standings list */
export type StagePointsRow = {
  entry_id: string;
  stage_id: string;
  points: number;
};

export function useStagePoints(gameId?: string) {
  return useQuery({
    queryKey: ["stage-points", gameId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<StagePointsRow[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("entry_id, stage_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId);
      if (error) throw error;
      return (data ?? []).map((r: { entry_id: string; stage_id: string; points: number }) => ({
        entry_id: r.entry_id,
        stage_id: r.stage_id,
        points: r.points,
      }));
    },
  });
}

/** All entries in the game with team_name + total_points (for standings) */
export type EntryStanding = {
  id: string;
  user_id: string;
  team_name: string | null;
  total_points: number;
  display_name: string | null;
};

export function useEntries(gameId?: string) {
  return useQuery({
    queryKey: ["entries-standings", gameId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<EntryStanding[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("entries")
        .select("id, user_id, team_name, total_points")
        .eq("game_id", gameId)
        .eq("status", "submitted")
        .order("total_points", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; user_id: string; team_name: string | null; total_points: number }>;
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      let profileMap = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        profileMap = new Map((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));
      }
      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        team_name: r.team_name,
        total_points: r.total_points ?? 0,
        display_name: profileMap.get(r.user_id) ?? null,
      }));
    },
  });
}
