import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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

export function usePalmares() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["palmares", user?.id],
    enabled: Boolean(supabase && user?.id),
    // Historische erelijst — wijzigt zelden en blijft tijdens de sessie warm.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<{ games: PalmaresGame[]; subpoules: PalmaresSubpoule[] }> => {
      if (!supabase || !user?.id) return { games: [], subpoules: [] };
      const { data, error } = await supabase.rpc("user_palmares_summary");
      if (error) throw error;

      const summary = data as unknown as Partial<{
        games: PalmaresGame[];
        subpoules: PalmaresSubpoule[];
      }> | null;

      return {
        games: summary?.games ?? [],
        subpoules: summary?.subpoules ?? [],
      };
    },
  });
}
