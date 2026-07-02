import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * useSupportBanner — is de handmatige "Steun Koerspoule"-banner aan voor deze
 * game? Game-breed (games.support_banner_visible), niet meer per etappe. Geeft
 * ook support_banner_updated_at terug, voor de dismiss-key (zodat de banner
 * terugkomt als de admin 'm later opnieuw aanzet). Faalt stil (geen banner)
 * als de migratie nog niet draaide.
 */
export function useSupportBanner(gameId?: string) {
  return useQuery({
    queryKey: ["support-banner", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60_000,
    queryFn: async (): Promise<{ active: boolean; updatedAt: string | null }> => {
      if (!supabase || !gameId) return { active: false, updatedAt: null };
      const { data, error } = await supabase
        .from("games")
        .select("support_banner_visible, support_banner_updated_at")
        .eq("id", gameId)
        .maybeSingle();
      if (error || !data) return { active: false, updatedAt: null };
      return {
        active: Boolean((data as any).support_banner_visible),
        updatedAt: (data as any).support_banner_updated_at ?? null,
      };
    },
  });
}
