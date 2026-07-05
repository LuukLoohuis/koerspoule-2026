import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Joker-punten-multiplier van een game (games.joker_multiplier). De admin stelt
 * 'm in het Berekening-tab in; de server-side puntenberekening gebruikt deze
 * waarde. Client-weergaven die joker-punten tonen MOETEN dezelfde multiplier
 * gebruiken i.p.v. een hardcoded ×2, anders staan joker-punten dubbel bij een
 * game met een andere multiplier (bv. 1).
 *
 * Default 1 zolang de waarde nog niet geladen is → nooit onterecht verdubbelen.
 */
export function useJokerMultiplier(gameId: string | undefined): number {
  const { data } = useQuery({
    queryKey: ["game-joker-mult", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !gameId) return 1;
      const { data } = await supabase
        .from("games")
        .select("joker_multiplier")
        .eq("id", gameId)
        .maybeSingle();
      return Number((data as { joker_multiplier?: number } | null)?.joker_multiplier ?? 1);
    },
  });
  return data ?? 1;
}
