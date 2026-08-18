/**
 * Klikcijfers per sponsorlink, voor het beheerscherm.
 *
 * De RPC levert één rij per link-plek-combinatie, inclusief links waar nog
 * nooit op geklikt is — een nul is zelf ook een antwoord. Namen komen mee uit
 * de database, zodat het scherm niets hoeft samen te voegen.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SponsorKlikRij = {
  bron: "sponsor" | "prijs";
  bron_id: string;
  veld: "link_url" | "sponsor_url" | "sponsor_url_2";
  plek: "voorpagina" | "dagprijsbanner" | "prijzenpagina";
  naam: string;
  url: string;
  aantal: number;
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * @param dagen   Terugkijkvenster; null = sinds de start.
 * @param gameId  Beperkt de prijzen tot deze koers. Platformsponsoren hangen
 *                aan geen enkele game en blijven altijd staan.
 */
export function useSponsorKlikken(dagen: number | null, gameId?: string) {
  return useQuery({
    queryKey: ["sponsor-klikken", dagen, gameId ?? null],
    enabled: Boolean(supabase),
    staleTime: 60_000,
    queryFn: async (): Promise<SponsorKlikRij[]> => {
      if (!supabase) return [];
      const { data, error } = await (supabase as unknown as RpcClient)
        .rpc("admin_sponsor_klikken", { p_dagen: dagen, p_game_id: gameId ?? null });
      if (error) throw error;
      return ((data ?? []) as SponsorKlikRij[]).map((r) => ({ ...r, aantal: Number(r.aantal) }));
    },
  });
}
