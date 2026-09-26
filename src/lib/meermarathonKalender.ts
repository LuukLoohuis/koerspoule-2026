import { meermarathonAfstandLabel, meermarathonStageLabel } from "@/lib/gameTypes";
import type { MeermarathonGameStatus, MmWedstrijd } from "@/lib/meermarathonSeizoen";

/**
 * Eén kalender voor het seizoen. Vrouwen en Mannen rijden op dezelfde avond
 * op dezelfde baan, elk hun eigen afstand; die komen op één regel samen
 * ("Kunstijs · 80 / 125 ronden"). Punten en "Volgende" horen bij de game die
 * de speler bekijkt.
 */
export type KalenderRij = {
  sleutel: string;
  /** YYYY-MM-DD, of null als de datum nog niet vaststaat. */
  date: string | null;
  label: string;
  /** "Kunstijs · 80 / 125 ronden", "Natuurijs · als het vriest". */
  detail: string;
  /** Punten van jouw ploeg; null als er (nog) geen uitslag is. */
  punten: number | null;
  volgende: boolean;
};

const ONDERGROND: Record<string, string> = { kunstijs: "Kunstijs", natuurijs: "Natuurijs" };

/** "80 ronden" + "125 ronden" → "80 / 125 ronden"; gelijke eenheden delen hun woord. */
function samengevoegdeAfstand(wedstrijden: MmWedstrijd[]): string | null {
  const labels = wedstrijden.map((w) => meermarathonAfstandLabel(w)).filter((l): l is string => Boolean(l));
  if (labels.length <= 1) return labels[0] ?? null;
  const delen = labels.map((l) => /^(\S+) (ronden?|km)$/.exec(l));
  const eenheid = (d: RegExpExecArray) => (d[2] === "ronde" ? "ronden" : d[2]);
  if (delen.every(Boolean) && new Set(delen.map((d) => eenheid(d!))).size === 1) {
    return `${delen.map((d) => d![1]).join(" / ")} ${eenheid(delen[0]!)}`;
  }
  return labels.join(" / ");
}

export function bouwKalender(statussen: MeermarathonGameStatus[], gekozenGameId: string | null): KalenderRij[] {
  const gekozen = statussen.find((s) => s.game.id === gekozenGameId) ?? statussen[0] ?? null;

  // Samen op datum; zonder datum op wedstrijdnummer (ONK "als het vriest").
  const groepen = new Map<string, MmWedstrijd[]>();
  for (const s of statussen) {
    for (const w of s.wedstrijden) {
      const sleutel = w.date ?? `nr-${w.stage_number}`;
      groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), w]);
    }
  }

  const rijen = [...groepen.entries()].map(([sleutel, groep]): KalenderRij & { nummer: number } => {
    const eigen = groep.find((w) => w.game_id === gekozen?.game.id) ?? null;
    const basis = eigen ?? groep[0];
    const ondergrond = basis.ijs_type ? ONDERGROND[basis.ijs_type] ?? null : null;
    const afstand = samengevoegdeAfstand(groep);
    const zonderDatumOpNatuurijs = basis.date == null && basis.ijs_type === "natuurijs";
    const detail = [ondergrond, afstand ?? (zonderDatumOpNatuurijs ? "als het vriest" : null)].filter(Boolean).join(" · ");
    const heeftUitslag = eigen?.results_status === "approved";
    const punten = eigen && heeftUitslag && gekozen?.entry ? gekozen.puntenPerWedstrijd.get(eigen.id) ?? 0 : null;
    return {
      nummer: Math.min(...groep.map((w) => w.stage_number)),
      sleutel,
      date: basis.date,
      label: meermarathonStageLabel(basis),
      detail,
      punten,
      volgende: Boolean(eigen && gekozen?.volgende?.id === eigen.id),
    };
  });

  // Op wedstrijdnummer, zoals de bond ze nummert: een ONK zonder datum staat
  // zo gewoon tussen de Grand Prix' en het NK.
  return rijen.sort((a, b) => a.nummer - b.nummer).map(({ nummer: _nummer, ...rij }) => rij);
}
