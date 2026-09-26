import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * De voorbeschouwing van één rit, zoals Radio Koerspoule die per etappe
 * bewaart (tabel etappe_voorbeschouwingen, publiek leesbaar). Ontbreekt de
 * tekst, dan geeft dit null en zwijgt de krant -- er wordt niets verzonnen.
 *
 * De gegenereerde Supabase-types kennen de tabel niet; zelfde uitzondering
 * als bij etappe_verslagen.
 */
export function useEtappeVoorbeschouwing(stageId?: string | null) {
  return useQuery({
    queryKey: ["etappe-voorbeschouwing", stageId],
    enabled: Boolean(supabase && stageId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!supabase || !stageId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("etappe_voorbeschouwingen")
        .select("tekst")
        .eq("stage_id", stageId)
        .maybeSingle();
      if (error) throw error;
      const tekst = (data as { tekst?: string | null } | null)?.tekst?.trim();
      return tekst ? tekst : null;
    },
  });
}
