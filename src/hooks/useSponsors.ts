import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Sponsor = {
  id: string;
  naam: string;
  logo_url: string | null;
  link_url: string | null;
  zichtbaar: boolean;
  sort_order: number;
  created_at: string;
};

/**
 * Zichtbare platform-sponsoren voor de landingspagina-strook. Leest alleen de
 * publieke velden van zichtbare sponsoren (RLS: sponsors publiek leesbaar).
 */
export function useVisibleSponsors() {
  return useQuery({
    queryKey: ["sponsors", "visible"],
    enabled: Boolean(supabase),
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Sponsor[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, naam, logo_url, link_url, zichtbaar, sort_order, created_at")
        .eq("zichtbaar", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Sponsor[];
    },
  });
}
