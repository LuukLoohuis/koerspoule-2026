import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PrijsSoort = "podium_1" | "podium_2" | "podium_3" | "dagprijs" | "ereplaats" | "grootste_subpoule";

export type Prize = {
  id: string;
  game_id: string;
  soort: PrijsSoort;
  titel: string;
  omschrijving: string;
  sponsor_naam: string | null;
  sponsor_logo_url: string | null;
  sponsor_url: string | null;
  afbeelding_url: string | null;
  prijs_label: string | null;
  badge_top: string | null;
  badge_bottom: string | null;
  is_dagprijs_vandaag: boolean;
  sort_order: number;
  rang: number | null;
  created_at: string;
};

/** Prijzen van een game, publiek leesbaar (RLS), gesorteerd op sort_order. */
export function usePrizes(gameId?: string) {
  return useQuery({
    queryKey: ["prizes", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Prize[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("prizes")
        .select("*")
        .eq("game_id", gameId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Prize[];
    },
  });
}
