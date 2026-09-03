import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Eén renner in de oogst van een etappe. */
export type OogstRegel = {
  rider_id: string;
  rider_name: string | null;
  category_name: string | null;
  category_sort: number;
  finish_position: number | null;
  base_points: number;
  multiplier: number;
  is_joker: boolean;
  did_finish: boolean;
  total_points: number;
};

/**
 * Waar de punten van één etappe vandaan kwamen, per renner.
 *
 * Eén RPC voor de hele ploeg; per renner apart bevragen zou twintig calls per
 * etappe kosten. De functie rekent met dezelfde regel als het fiatteren, dus de
 * som van deze regels is exact het dagtotaal uit stage_points.
 */
export function useOogst(entryId?: string | null, stageId?: string | null) {
  return useQuery({
    queryKey: ["oogst", entryId, stageId],
    enabled: Boolean(supabase && entryId && stageId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OogstRegel[]> => {
      if (!supabase || !entryId || !stageId) return [];
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc("entry_stage_harvest", { p_entry_id: entryId, p_stage_id: stageId });
      if (error) throw error;
      return (data ?? []) as OogstRegel[];
    },
  });
}

/**
 * Slotzin onder de oogst: welke categorie het werk deed en welke stilstond.
 * Geen sjabloon met lege plekken -- zonder duidelijke winnaar of verliezer
 * blijft de regel weg.
 */
export function oogstSlotzin(regels: OogstRegel[]): string | null {
  const metCategorie = regels.filter((r) => r.category_name);
  if (metCategorie.length < 2) return null;

  const perCategorie = new Map<string, number>();
  for (const r of metCategorie) {
    perCategorie.set(r.category_name!, (perCategorie.get(r.category_name!) ?? 0) + r.total_points);
  }
  const gesorteerd = [...perCategorie.entries()].sort((a, b) => b[1] - a[1]);
  const [beste, bestePunten] = gesorteerd[0];
  const [slechtste, slechtstePunten] = gesorteerd[gesorteerd.length - 1];

  if (bestePunten === 0) return "Niemand van je ploeg kwam vandaag aan punten.";
  if (bestePunten === slechtstePunten) return null;
  if (slechtstePunten === 0) {
    return `${beste} deed het werk; ${slechtste.toLowerCase()} bleef op nul.`;
  }
  return `${beste} bracht het meeste binnen, ${slechtste.toLowerCase()} het minst.`;
}
