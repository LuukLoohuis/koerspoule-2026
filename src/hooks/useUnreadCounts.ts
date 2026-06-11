import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCounts(gameId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subpoule-unread", gameId, user?.id],
    enabled: Boolean(supabase && gameId && user?.id),
    // Polt elke 60s, MAAR stopt zodra de query faalt — anders blijft een
    // kapotte/erroring RPC eindeloos elke 60s een teruggerolde transactie
    // produceren (rollback-storm + cloud-kosten).
    refetchInterval: (query) => (query.state.status === "error" ? false : 60_000),
    retry: false,
    queryFn: async () => {
      if (!supabase || !gameId) return {} as Record<string, number>;
      const { data, error } = await supabase.rpc("subpoule_unread_counts", { p_game_id: gameId });
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { subpoule_id: string; unread_count: number }[]) {
        map[row.subpoule_id] = row.unread_count;
      }
      return map;
    },
  });
}
