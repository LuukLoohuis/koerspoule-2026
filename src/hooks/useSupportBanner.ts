import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * useSupportBanner — is de handmatige "Steun Koerspoule"-banner aan voor deze
 * game? True zodra MINSTENS één etappe support_banner_visible=true heeft. Geeft
 * ook de hoogste support_banner_updated_at terug, voor de dismiss-key (zodat de
 * banner terugkomt als de admin 'm later opnieuw aanzet). Faalt stil (geen
 * banner) als de migratie nog niet draaide.
 */
export function useSupportBanner(gameId?: string) {
  return useQuery({
    queryKey: ["support-banner", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60_000,
    queryFn: async (): Promise<{ active: boolean; updatedAt: string | null }> => {
      if (!supabase || !gameId) return { active: false, updatedAt: null };
      const { data, error } = await supabase
        .from("stages")
        .select("support_banner_updated_at")
        .eq("game_id", gameId)
        .eq("support_banner_visible", true)
        .order("support_banner_updated_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (error) return { active: false, updatedAt: null }; // kolom mist → geen banner
      const row = (data ?? [])[0] as { support_banner_updated_at: string | null } | undefined;
      return { active: Boolean(row), updatedAt: row?.support_banner_updated_at ?? null };
    },
  });
}
