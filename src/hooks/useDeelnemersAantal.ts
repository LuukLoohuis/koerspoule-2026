import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Aantal deelnemers van één game, via count_deelnemers_game.
 *
 * Eén plek voor deze telling, want hij wordt op twee schermen getoond (de
 * homepage-teller en de inschrijfbanner) en moet daar hetzelfde getal geven --
 * en dezelfde cache delen, zodat het niet twee aanroepen worden.
 *
 * `enabled` hoort de admin-vlag games.deelnemers_teller_visible te zijn: dit
 * cijfer gaat nooit vanzelf ergens aan.
 */
export function useDeelnemersAantal(gameId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["count-deelnemers-game", gameId],
    enabled: Boolean(supabase && gameId && enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !gameId) return 0;
      // De gegenereerde Supabase-types kennen deze functie nog niet; de cast
      // houdt die ruis op één plek in plaats van bij elke aanroeper.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>)("count_deelnemers_game", { p_game_id: gameId });
      if (error) return 0;
      return typeof data === "number" ? data : 0;
    },
  });
}
