import { useMemo } from "react";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { useGameStandings, useStages } from "@/hooks/useResults";
import { canRegister } from "@/lib/gameStatus";
import { meermarathonStageLabel, parseMeermarathonCategorie, type MeermarathonCategorie } from "@/lib/gameTypes";
import { bouwTotaalklassement, type TotaalBron, type TotaalBronRij } from "@/lib/meermarathonTotaal";
import { getInitialResultsStageIndex } from "@/lib/resultSelection";

export type TotaalPeloton = {
  categorie: MeermarathonCategorie;
  gameId: string;
  /** "Cup 3": de laatst verwerkte wedstrijd; null zolang er geen uitslag is. */
  stand: string | null;
  /** Kun je hier nog instappen? Dan wijst het totaal de weg. */
  inschrijfbaar: boolean;
};

/**
 * De stand van één peloton, precies zoals Uitslagen › Klassement hem zonder
 * keuze opent: het eindklassement als dat er is, anders de laatst verwerkte
 * wedstrijd. Dezelfde queries als dat klassement, dus geen dubbel werk.
 */
function usePelotonStand(gameId: string | undefined) {
  const { data: stages, isLoading: stagesLaden } = useStages(gameId);
  const stage = stages?.[getInitialResultsStageIndex(stages ?? [], true)];
  const { data: stand, isLoading: standLaadt } = useGameStandings(gameId, stage?.stage_number, false);
  const eind = stage?.is_gc === true;
  const verwerkt = stage?.results_status === "approved";

  // De voorspellingsbonus telt pas in het eindklassement, net als per peloton.
  const rijen = useMemo<TotaalBronRij[]>(
    () =>
      (stand ?? []).map((r) => ({
        user_id: r.user_id,
        display_name: r.display_name,
        team_name: r.team_name,
        punten: eind ? r.total : r.cum_points,
      })),
    [stand, eind],
  );

  return {
    rijen,
    stand: !stage || !verwerkt ? null : eind ? "Eindstand" : meermarathonStageLabel(stage),
    isLoading: Boolean(gameId) && (stagesLaden || standLaadt),
  };
}

/**
 * Totaalklassement van de Meermarathon: je punten bij de vrouwen en de mannen
 * opgeteld. Een seizoen heeft hooguit twee pelotons, dus twee vaste standen.
 */
export function useMeermarathonTotaal() {
  const { seizoen } = useMeermarathonSeizoen();
  const vrouwen = seizoen.find((g) => parseMeermarathonCategorie(g.categorie) === "vrouwen");
  const mannen = seizoen.find((g) => parseMeermarathonCategorie(g.categorie) === "mannen");
  const v = usePelotonStand(vrouwen?.id);
  const m = usePelotonStand(mannen?.id);

  const heeftV = Boolean(vrouwen);
  const heeftM = Boolean(mannen);
  const rijen = useMemo(() => {
    const bronnen: TotaalBron[] = [];
    if (heeftV) bronnen.push({ categorie: "vrouwen", rijen: v.rijen });
    if (heeftM) bronnen.push({ categorie: "mannen", rijen: m.rijen });
    return bouwTotaalklassement(bronnen);
  }, [heeftV, heeftM, v.rijen, m.rijen]);

  const pelotons: TotaalPeloton[] = [];
  if (vrouwen) pelotons.push({ categorie: "vrouwen", gameId: vrouwen.id, stand: v.stand, inschrijfbaar: canRegister(vrouwen.status) });
  if (mannen) pelotons.push({ categorie: "mannen", gameId: mannen.id, stand: m.stand, inschrijfbaar: canRegister(mannen.status) });

  return { rijen, pelotons, isLoading: v.isLoading || m.isLoading };
}
