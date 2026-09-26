/**
 * Mijn Peloton › Uitslagen voor de Meermarathon: haalt de data op en geeft
 * die aan UitslagenMeermarathonWeergave.
 *
 * Het klassement telt tot en met de laatste wedstrijd met een goedgekeurde
 * uitslag, zonder beheerders (zoals overal in het algemeen klassement).
 * "Per wedstrijd" is de bestaande uitslagweergave, zodat de uitslag per
 * wedstrijd precies blijft werken zoals hij werkte.
 */
import { useEffect, useMemo, useState } from "react";
import ResultsView from "@/components/ResultsView";
import UitslagenMeermarathonWeergave, {
  type KlassementStand,
  type UitslagenSegment,
} from "@/components/meermarathon/UitslagenMeermarathonWeergave";
import { useAuth } from "@/hooks/useAuth";
import { useGameStandings, useStages } from "@/hooks/useResults";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { meermarathonCategorieLabel, meermarathonStageLabel } from "@/lib/gameTypes";
import { bouwKalender } from "@/lib/meermarathonKalender";
import { heeftEerdereUitslag, laatsteGoedgekeurdeWedstrijd } from "@/lib/meermarathonKlassement";
import { mmDag } from "@/lib/meermarathonSeizoen";

export default function UitslagenMeermarathon({
  gameId,
  gameName,
  categorie,
  initialView,
  initialStageNumber,
}: {
  gameId: string;
  gameName?: string | null;
  categorie?: string | null;
  initialView?: "etappes" | "klassement";
  initialStageNumber?: number | null;
}) {
  const { user } = useAuth();

  // Het segment is van deze tab, niet van de game: wissel je in de koersbalk
  // van Vrouwen naar Mannen, dan blijf je op hetzelfde segment staan.
  const [segment, setSegment] = useState<UitslagenSegment>(initialView === "etappes" ? "wedstrijd" : "klassement");
  // Een sprong naar een uitslag (bv. "beste wedstrijd" in de Volgwagen) opent
  // "Per wedstrijd", ook als je hier al op een ander segment stond.
  useEffect(() => {
    if (initialView === "etappes") setSegment("wedstrijd");
    else if (initialView === "klassement") setSegment("klassement");
  }, [initialView, initialStageNumber]);

  const stagesQ = useStages(gameId);
  const stages = useMemo(() => stagesQ.data ?? [], [stagesQ.data]);
  const laatste = useMemo(() => laatsteGoedgekeurdeWedstrijd(stages), [stages]);
  const standQ = useGameStandings(gameId, laatste?.stage_number, false);

  const { statussen, isLoading: seizoenLaadt } = useMeermarathonSeizoen();
  const status = statussen.find((s) => s.game.id === gameId) ?? null;
  const kalender = useMemo(
    () => (seizoenLaadt ? null : bouwKalender(statussen, gameId)),
    [seizoenLaadt, statussen, gameId],
  );

  const stand = useMemo((): KlassementStand => {
    // isPending en niet isLoading: zolang de inlog nog niet rond is staat de
    // query uit, en dan zou een lege tabel even "geen ploegen" suggereren.
    if (stagesQ.isPending) return { soort: "laden" };
    if (stagesQ.isError) return { soort: "fout" };
    if (!laatste) {
      const volgende = status?.volgende ?? null;
      return {
        soort: "leeg",
        volgende: volgende
          ? { label: meermarathonStageLabel(volgende), dag: volgende.date ? mmDag(volgende.date) : null }
          : null,
      };
    }
    if (standQ.isPending) return { soort: "laden" };
    if (standQ.isError) return { soort: "fout" };
    return {
      soort: "stand",
      wedstrijdLabel: meermarathonStageLabel(laatste),
      rijen: standQ.data,
      metBeweging: heeftEerdereUitslag(stages, laatste.stage_number),
    };
  }, [stagesQ.isPending, stagesQ.isError, laatste, status, standQ.isPending, standQ.isError, standQ.data, stages]);

  return (
    <UitslagenMeermarathonWeergave
      categorieLabel={meermarathonCategorieLabel(categorie)}
      stand={stand}
      eigenUserId={user?.id ?? null}
      kalender={kalender}
      segment={segment}
      onSegment={setSegment}
      perWedstrijd={
        <ResultsView
          showHeader={false}
          gameId={gameId}
          gameName={gameName}
          initialView="etappes"
          initialStageNumber={initialStageNumber}
          alleenEtappes
        />
      }
    />
  );
}
