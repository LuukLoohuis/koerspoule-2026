import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Klassement, KlassementRijders } from "@/lib/klassementVoorspelling";

export type KlassementUitslag = {
  /** De winnaars zoals de beheerder ze zette; null zolang een klassement loopt. */
  winnaars: KlassementRijders;
  /** Wat jouw ploeg per klassement kreeg (entry_prediction_points). */
  punten: Partial<Record<Klassement, number>>;
};

/**
 * Meermarathon: hoe je pronostiek uitpakt. De winnaars van het Cup- en het
 * Grand Prix-klassement (openbaar) en de punten die jouw inschrijving ervoor
 * kreeg. Zolang er geen winnaar is, zijn beide leeg.
 */
export function useKlassementUitslag(gameId: string | undefined, entryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["klassement-uitslag", gameId, entryId],
    enabled: Boolean(supabase && enabled && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<KlassementUitslag> => {
      const leeg: KlassementUitslag = { winnaars: { cup: null, grandprix: null }, punten: {} };
      if (!supabase || !gameId) return leeg;
      const { data: winnaars, error } = await supabase
        .from("klassement_winnaars")
        .select("klassement, rider_id")
        .eq("game_id", gameId);
      if (error) throw error;
      if (!winnaars || winnaars.length === 0) return leeg;

      const punten: KlassementUitslag["punten"] = {};
      if (entryId) {
        const { data: rijen } = await supabase
          .from("entry_prediction_points")
          .select("classification, points")
          .eq("entry_id", entryId)
          .in("classification", ["cup", "grandprix"]);
        for (const r of rijen ?? []) punten[r.classification as Klassement] = r.points;
      }
      return {
        winnaars: {
          cup: winnaars.find((w) => w.klassement === "cup")?.rider_id ?? null,
          grandprix: winnaars.find((w) => w.klassement === "grandprix")?.rider_id ?? null,
        },
        punten,
      };
    },
  });
}
