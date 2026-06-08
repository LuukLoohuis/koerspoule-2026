import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Totaal behaalde etappepunten per renner voor één entry, t/m de laatst
 * gefiatteerde etappe. Eén query voor de hele ploeg → elke renner-tegel kan
 * z'n totaal tonen zonder losse calls.
 *
 * Returnt een Map<rider_id, total_points>.
 */
export function useRiderEntryTotals(
  gameId: string | undefined,
  entryId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["rider-entry-totals", gameId, entryId],
    enabled: Boolean(supabase && gameId && entryId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Map<string, number>> => {
      const m = new Map<string, number>();
      if (!supabase || !gameId || !entryId) return m;
      const { data, error } = await (supabase as any).rpc("rider_entry_totals", {
        p_game_id: gameId,
        p_entry_id: entryId,
      });
      if (error) throw error;
      for (const row of (data ?? []) as Array<{ rider_id: string; total_points: number }>) {
        m.set(row.rider_id, row.total_points ?? 0);
      }
      return m;
    },
  });
}
