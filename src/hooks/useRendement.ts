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
  /** Het maximum dat in deze categorie te halen viel, over alle renners erin. */
  categorie_beste: number;
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
 * keuze en de beste renner die in die categorie te kiezen was.
 *
 * Eerder was de maatstaf het poulegemiddelde -- je achterstand op de
 * concurrenten. Dat verzweeg juist de dure gevallen: een renner die tachtig
 * punten pakte terwijl bijna niemand hem koos, drukt het gemiddelde nauwelijks
 * en kwam dus nooit bovendrijven. Wat je liet liggen is wat er te halen viel.
 *
 * Valt er niets te winnen -- jouw keuze wás de beste -- dan geen misser.
 */
export function duursteMisser(regels: RendementRegel[]): RendementRegel | null {
  // Terugval op poule_beste zolang de database de nieuwe kolom nog niet heeft:
  // dan wijst het blok de beste gemaakte keuze aan in plaats van te verdwijnen.
  const gat = (r: RendementRegel) => (r.categorie_beste ?? r.poule_beste) - r.mijn_punten;
  const kandidaten = regels.filter((r) => gat(r) > 0);
  if (kandidaten.length === 0) return null;
  return kandidaten.reduce((a, b) => (gat(b) > gat(a) ? b : a));
}
