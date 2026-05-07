import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type StartlistTeam = {
  id: string;
  name: string;
  short_name: string | null;
  riders: Array<{
    id: string;
    name: string;
    start_number: number | null;
    is_youth_eligible: boolean;
  }>;
};

export function useStartlist(gameId?: string, search?: string, teamId?: string) {
  return useQuery({
    queryKey: ["startlist", gameId, search, teamId],
    enabled: Boolean(gameId),
    queryFn: async (): Promise<StartlistTeam[]> => {
      if (!supabase || !gameId) return [];

      let teamsQuery = supabase
        .from("teams")
        .select("id, name, short_name")
        .eq("game_id", gameId)
        .order("name", { ascending: true });

      if (teamId) {
        teamsQuery = teamsQuery.eq("id", teamId);
      }

      const { data: teams, error: teamsError } = await teamsQuery;
      if (teamsError) throw teamsError;
      if (!teams?.length) return [];

      const teamIds = teams.map((t) => t.id);
      let riderQuery = supabase
        .from("riders")
        .select("id, name, start_number, team_id")
        .in("team_id", teamIds)
        .order("start_number", { ascending: true });

      if (search?.trim()) {
        riderQuery = riderQuery.ilike("name", `%${search.trim()}%`);
      }

      const { data: riders, error: ridersError } = await riderQuery;
      if (ridersError) throw ridersError;

      return teams
        .map((team) => ({
          id: team.id,
          name: team.name,
          short_name: team.short_name,
          riders: (riders ?? [])
            .filter((r) => r.team_id === team.id)
            .map((r) => ({
              id: r.id,
              name: r.name,
              start_number: r.start_number,
            })),
        }))
        .filter((t) => t.riders.length > 0 || !search?.trim());
    },
  });
}
