import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Eén etappe-regel uit de rider_stage_points RPC. */
export type RiderStagePointsRow = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  stage_type: string | null;
  finish_position: number | null;
  base_points: number;
  multiplier: number;
  total_points: number;
};

/**
 * Per-etappe punten van één renner binnen een game.
 *
 * Lazy: vuurt alleen wanneer zowel gameId als riderId gezet zijn — geef
 * riderId = null door zolang de dropdown dicht is, dan blijft enabled false
 * en wordt er niets opgehaald. Eén query per geopende renner, gecachet.
 *
 * entryId optioneel: indien meegegeven past de RPC de joker-multiplier toe
 * voor die entry (zelfde regel als de server-side scoring). Zonder entryId
 * krijg je de kale rennerpunten (multiplier 1).
 */
export function useRiderStagePoints(
  gameId: string | undefined,
  riderId: string | null | undefined,
  entryId?: string | null,
) {
  return useQuery({
    queryKey: ["rider-stage-points", gameId, riderId, entryId ?? null],
    enabled: Boolean(supabase && gameId && riderId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RiderStagePointsRow[]> => {
      if (!supabase || !gameId || !riderId) return [];
      const { data, error } = await (supabase as any).rpc("rider_stage_points", {
        p_game_id: gameId,
        p_rider_id: riderId,
        p_entry_id: entryId ?? null,
      });
      if (error) throw error;
      return ((data ?? []) as RiderStagePointsRow[])
        .slice()
        .sort((a, b) => a.stage_number - b.stage_number);
    },
  });
}
