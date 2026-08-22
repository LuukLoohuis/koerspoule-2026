import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * De gegenereerde Supabase-types kennen etappe_verslagen nog niet. Eén
 * gedocumenteerde uitzondering hier is beter dan een `as any` op elke
 * aanroepplek: zodra de types opnieuw gegenereerd zijn, valt alleen dit
 * hulpje weg en verandert er verder niets.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const verslagTabel = () => (supabase as any).from("etappe_verslagen");

export type EtappeVerslag = {
  stage_id: string;
  tekst: string;
  bron: string | null;
  bron_url: string | null;
  updated_at: string | null;
};

/**
 * Het verslag van de laatst gefiatteerde etappe: de terugblik die in de krant
 * als hoofdartikel staat. Spiegelbeeld van de voorbeschouwing.
 */
export function useEtappeVerslag(stageId?: string | null) {
  return useQuery({
    queryKey: ["etappe-verslag", stageId],
    enabled: Boolean(supabase && stageId),
    // Kort geldig: het verslag verschijnt vlak na het fiatteren, en dan hoort
    // de voorpagina het meteen te tonen. De mutaties invalideren deze query
    // ook, maar dat helpt niet in een ander tabblad of na een navigatie.
    staleTime: 30 * 1000,
    queryFn: async (): Promise<EtappeVerslag | null> => {
      if (!supabase || !stageId) return null;
      const { data, error } = await verslagTabel()
        .select("stage_id, tekst, bron, bron_url, updated_at")
        .eq("stage_id", stageId)
        .maybeSingle();
      if (error) throw error;
      return ((data as EtappeVerslag | null) ?? null);
    },
  });
}
