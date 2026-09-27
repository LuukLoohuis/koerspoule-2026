import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type RiderById = {
  id: string;
  name: string;
  team: string | null;
  team_id: string | null;
  country_code: string | null;
  start_number: number | null;
  is_dnf: boolean | null;
  is_vervallen: boolean | null;
};

/**
 * De renners van je eigen ploeg op id, met wat elk ploegscherm nodig heeft
 * (naam, ploeg, opgave, vervallen).
 *
 * Eén sleutel voor Mijn ploeg, Pronostiek en Ploeg C: wie het ene scherm
 * bekeek heeft de cache voor het andere al warm. Dat merk je bij het vegen
 * tussen de panelen: de buur hoeft dan niets meer op te halen.
 */
export function useRidersByIds(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["riders-by-ids", sorted],
    enabled: Boolean(supabase && sorted.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RiderById[]> => {
      if (!supabase || sorted.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, team, team_id, country_code, start_number, is_dnf, is_vervallen")
        .in("id", sorted);
      if (error) throw error;
      // is_vervallen staat (nog) niet in de gegenereerde types.
      return (data ?? []) as unknown as RiderById[];
    },
  });
}

/**
 * Alle renners die bij je inschrijving horen: keuzes, jokers en voorspelde
 * klassementsrenners. Elk ploegscherm vraagt precies deze set op, zodat ze
 * dezelfde cache-sleutel delen; de volgorde doet er niet toe, de hook sorteert.
 */
export function eigenRennerIds(entry: {
  picksByCategory: ReadonlyMap<string, string[]>;
  jokerIds: readonly string[];
  predictions: ReadonlyArray<{ rider_id: string }>;
}): string[] {
  const ids = new Set<string>();
  for (const lijst of entry.picksByCategory.values()) for (const id of lijst) ids.add(id);
  for (const id of entry.jokerIds) ids.add(id);
  for (const p of entry.predictions) ids.add(p.rider_id);
  return Array.from(ids);
}
