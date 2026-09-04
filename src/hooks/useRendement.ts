import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };

/** Wat één categoriekeuze opleverde, naast wat de poule eruit haalde. */
export type RendementRegel = {
  category_id: string;
  category_name: string;
  category_sort: number;
  rider_name: string | null;
  mijn_punten: number;
  poule_gemiddelde: number;
  poule_beste: number;
};

/**
 * @param subpouleId  Vergelijkingsgroep: een subpoule waar je zelf in zit, of
 *                    null voor de hele poule. Een subpoule met minder dan twee
 *                    ploegen valt aan de databasekant terug op de hele poule.
 */
export function useRendement(entryId?: string | null, subpouleId?: string | null) {
  return useQuery({
    queryKey: ["rendement", entryId, subpouleId ?? null],
    enabled: Boolean(supabase && entryId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RendementRegel[]> => {
      if (!supabase || !entryId) return [];
      const { data, error } = await (supabase as unknown as Rpc)
        .rpc("entry_category_yield", { p_entry_id: entryId, p_subpoule_id: subpouleId ?? null });
      if (error) throw error;
      return (data ?? []) as RendementRegel[];
    },
  });
}

/** Eén renner uit een categorie: de jouwe of een niet-gekozen alternatief. */
export type AlternatiefRegel = {
  rider_id: string;
  rider_name: string | null;
  punten: number;
  is_mijn_keuze: boolean;
  gekozen_door: number;
};

export function useAlternatieven(entryId?: string | null, categoryId?: string | null) {
  return useQuery({
    queryKey: ["alternatieven", entryId, categoryId],
    enabled: Boolean(supabase && entryId && categoryId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AlternatiefRegel[]> => {
      if (!supabase || !entryId || !categoryId) return [];
      const { data, error } = await (supabase as unknown as Rpc)
        .rpc("entry_category_alternatives", { p_entry_id: entryId, p_category_id: categoryId });
      if (error) throw error;
      return (data ?? []) as AlternatiefRegel[];
    },
  });
}

/**
 * De categorie waar je het meest liet liggen: het grootste gat tussen jouw
 * keuze en het gemiddelde van de poule. Dat is het eerlijkste startpunt voor
 * "wat als" -- niet je laagste score, want een categorie waar niemand punt
 * haalt is geen misser.
 */
export function duursteMisser(regels: RendementRegel[]): RendementRegel | null {
  const kandidaten = regels.filter((r) => r.mijn_punten < r.poule_gemiddelde);
  if (kandidaten.length === 0) return null;
  return kandidaten.reduce((a, b) =>
    b.poule_gemiddelde - b.mijn_punten > a.poule_gemiddelde - a.mijn_punten ? b : a,
  );
}
