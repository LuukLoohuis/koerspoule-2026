import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/**
 * Set van game_ids waarvoor de ingelogde deelnemer al een entry heeft (in welke
 * status dan ook). Gebruikt door de in-app inschrijf-banner om games waar 'ie al
 * mee bezig is over te slaan — "nog niet ingevuld" = geen entry-rij.
 */
export function useMyEnteredGameIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-entered-games", user?.id],
    enabled: Boolean(supabase && user?.id),
    staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      if (!supabase || !user?.id) return new Set();
      const { data, error } = await supabase
        .from("entries")
        .select("game_id")
        .eq("user_id", user.id);
      if (error) return new Set();
      return new Set((data ?? []).map((e: { game_id: string }) => e.game_id));
    },
  });
}
