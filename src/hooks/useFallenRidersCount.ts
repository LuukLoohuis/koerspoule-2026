import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { canRegister, isPreviewStatus } from "@/lib/gameStatus";

/**
 * Aantal door de ingelogde deelnemer gekozen renners dat vóór de koers is
 * vervallen (riders.is_vervallen), in de actieve game. Alleen relevant zolang
 * wisselen mag (inschrijving open of 'open' sneak preview). Leest enkel de eigen
 * entry + de status van de gekozen renners (RLS-veilig). Voedt het telbordje in
 * Mijn Peloton; de namen + vervang-actie staan in de Volgwagen (MyTeamPanel).
 */
export function useFallenRidersCount(gameId?: string, status?: string | null) {
  const { user } = useAuth();
  const mayReplace = canRegister(status) || isPreviewStatus(status);
  return useQuery({
    queryKey: ["fallen-riders-count", gameId, user?.id],
    enabled: Boolean(supabase && gameId && user?.id && mayReplace),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !gameId || !user?.id) return 0;
      const { data: entry } = await supabase
        .from("entries")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!entry) return 0;
      const { data: picks } = await supabase
        .from("entry_picks")
        .select("rider_id")
        .eq("entry_id", (entry as { id: string }).id);
      const riderIds = [...new Set(((picks ?? []) as Array<{ rider_id: string }>).map((p) => p.rider_id))];
      if (riderIds.length === 0) return 0;
      const { count } = await supabase
        .from("riders")
        .select("id", { count: "exact", head: true })
        .in("id", riderIds)
        .eq("is_vervallen", true);
      return count ?? 0;
    },
  });
}
