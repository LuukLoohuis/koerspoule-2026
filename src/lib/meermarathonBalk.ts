import {
  meermarathonStageKort,
  meermarathonStageLabel,
  wedstrijdTypeVan,
  WEDSTRIJD_TYPES,
  type WedstrijdType,
} from "@/lib/gameTypes";

/**
 * De uitslagenbalk van de Meermarathon: één balk per wedstrijd, gekleurd naar
 * de soort (Cup, Grand Prix, ONK, NK). Zonder React of database.
 *
 * Een wielerrit heeft kilometers en een terrein; een schaatswedstrijd niet.
 * De hoogte van een balk zegt hier daarom hoeveel jouw ploeg er scoorde,
 * afgezet tegen je beste wedstrijd.
 */

export type BalkBron = {
  id: string;
  stage_number: number;
  name?: string | null;
  date: string | null;
  is_gc: boolean;
  results_status: string | null;
  ijs_type?: string | null;
  wedstrijd_type?: string | null;
};

export type BalkWedstrijd = {
  id: string;
  nummer: number;
  soort: WedstrijdType;
  /** "Cup 3", "NK", of de eigen naam van de wedstrijd. */
  label: string;
  /** Onder de balk: "3", of "ONK" / "NK" voor een titelwedstrijd. */
  kort: string;
  date: string | null;
  /** Staat er een goedgekeurde uitslag? */
  gereden: boolean;
  /** Punten van jouw ploeg; null zonder uitslag of zonder ploeg. */
  punten: number | null;
  /** Hoogte van de balk, 0 tot 1; null zolang de wedstrijd nog komt. */
  fractie: number | null;
};

/** Zonder eigen ploeg valt er niets te vergelijken: elke gereden wedstrijd even hoog. */
export const BALK_ZONDER_PLOEG = 0.6;

export function bouwWedstrijdBalk(
  stages: BalkBron[],
  puntenPerStage: Map<string, number>,
  { heeftPloeg, totaal }: { heeftPloeg: boolean; totaal?: number | null },
): { wedstrijden: BalkWedstrijd[]; totaal: number | null } {
  const echt = stages.filter((s) => !s.is_gc).sort((a, b) => a.stage_number - b.stage_number);
  const punten = (s: BalkBron) => puntenPerStage.get(s.id) ?? 0;
  const gereden = (s: BalkBron) => s.results_status === "approved";
  const beste = Math.max(0, ...echt.filter(gereden).map(punten));

  const wedstrijden = echt.map((s): BalkWedstrijd => {
    const klaar = gereden(s);
    return {
      id: s.id,
      nummer: s.stage_number,
      soort: wedstrijdTypeVan(s),
      label: meermarathonStageLabel(s),
      kort: meermarathonStageKort(s),
      date: s.date,
      gereden: klaar,
      punten: klaar && heeftPloeg ? punten(s) : null,
      fractie: !klaar ? null : !heeftPloeg ? BALK_ZONDER_PLOEG : beste > 0 ? punten(s) / beste : 0,
    };
  });

  const som = wedstrijden.reduce((n, w) => n + (w.punten ?? 0), 0);
  return { wedstrijden, totaal: heeftPloeg ? totaal ?? som : null };
}

/** Hoeveel wedstrijden er van elke soort op de kalender staan, in vaste volgorde. */
export function soortenInBalk(wedstrijden: BalkWedstrijd[]): { soort: WedstrijdType; aantal: number }[] {
  return WEDSTRIJD_TYPES.map((w) => ({
    soort: w.value,
    aantal: wedstrijden.filter((x) => x.soort === w.value).length,
  })).filter((s) => s.aantal > 0);
}
