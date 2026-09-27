/**
 * De ranglijst op Ploeg C: rekenwerk los van het scherm.
 *
 * Elke renner heeft een rij punten per etappe (uit de rider_stage_points-RPC,
 * dus mét joker-multiplier). Het scherm kiest een rit; daaruit volgen de
 * dagpunten (die ene rit) en het totaal (alles tot en met die rit). De
 * sortering "Punten" zet het totaal voorop, "Vandaag" wie in de gekozen rit
 * scoorde.
 *
 * Tik je een renner aan, dan klapt zijn rij open met de ritten waarin hij
 * scoorde; rittenVanRenner zet die op een rij.
 */

export type EtappePunten = {
  stage_number: number;
  total_points: number;
  /** De rest is voor het uitklapvak; de ranglijst zelf rekent zonder. */
  stage_name?: string | null;
  stage_type?: string | null;
  /** Plaats in de rituitslag waar de punten vandaan komen (1 t/m 20). */
  finish_position?: number | null;
  /** Joker-multiplier zoals de RPC hem toepaste; 1 zonder joker. */
  multiplier?: number | null;
};

export type Sortering = "punten" | "vandaag";

/** Eén rit van één renner, zoals het uitklapvak hem toont. */
export type RitScore = {
  nummer: number;
  naam: string | null;
  /** stage_type uit de database (vlak, heuvelachtig, bergop, tijdrit). */
  type: string | null;
  plaats: number | null;
  multiplier: number;
  punten: number;
};

/**
 * De ritten van één renner tot en met `totRit`, oplopend. Elke goedgekeurde
 * rit staat erin, ook die zonder punten: het balkje laat zo zien wáár in de
 * koers hij scoorde. Dezelfde grens als telPunten, dus de som is het totaal
 * in de rij.
 */
export function rittenVanRenner(
  etappes: readonly EtappePunten[],
  ritten: ReadonlyArray<{ nummer: number; naam: string | null }>,
  totRit: number | null,
): RitScore[] {
  if (totRit == null) return [];
  const perRit = new Map<number, RitScore>();
  for (const r of ritten) {
    if (r.nummer > totRit) continue;
    perRit.set(r.nummer, { nummer: r.nummer, naam: r.naam, type: null, plaats: null, multiplier: 1, punten: 0 });
  }
  for (const e of etappes) {
    if (e.stage_number > totRit) continue;
    const rit = perRit.get(e.stage_number) ?? {
      nummer: e.stage_number,
      naam: null,
      type: null,
      plaats: null,
      multiplier: 1,
      punten: 0,
    };
    perRit.set(e.stage_number, {
      nummer: rit.nummer,
      naam: e.stage_name?.trim() || rit.naam,
      type: e.stage_type ?? rit.type,
      plaats: e.finish_position ?? rit.plaats,
      multiplier: Math.max(rit.multiplier, e.multiplier ?? 1),
      punten: rit.punten + (e.total_points ?? 0),
    });
  }
  return [...perRit.values()].sort((a, b) => a.nummer - b.nummer);
}

/** Dagpunten van rit `totRit` en het totaal tot en met die rit. */
export function telPunten(etappes: EtappePunten[], totRit: number | null): { dag: number; totaal: number } {
  if (totRit == null) return { dag: 0, totaal: 0 };
  let dag = 0;
  let totaal = 0;
  for (const e of etappes) {
    if (e.stage_number > totRit) continue;
    totaal += e.total_points ?? 0;
    if (e.stage_number === totRit) dag += e.total_points ?? 0;
  }
  return { dag, totaal };
}

type Sorteerbaar = { naam: string; dag: number; totaal: number };

/**
 * "Punten": totaal aflopend, dan dagpunten, dan naam. "Vandaag": wie in de
 * gekozen rit scoorde bovenaan, daarbinnen op totaal. Een opgave staat gewoon
 * waar zijn punten hem zetten; hij wordt niet apart naar onderen geduwd.
 */
export function sorteerRenners<T extends Sorteerbaar>(renners: readonly T[], sortering: Sortering): T[] {
  const opNaam = (a: T, b: T) => a.naam.localeCompare(b.naam, "nl");
  return [...renners].sort((a, b) => {
    if (sortering === "vandaag") {
      return b.dag - a.dag || b.totaal - a.totaal || opNaam(a, b);
    }
    return b.totaal - a.totaal || b.dag - a.dag || opNaam(a, b);
  });
}

/**
 * De topscorer: het hoogste totaal, mits boven nul. Bij gelijke stand wint
 * de eerste in alfabetische volgorde, zodat de sticker niet wisselt met de
 * sortering.
 */
export function topscorerId<T extends { id: string } & Sorteerbaar>(renners: readonly T[]): string | null {
  let best: T | null = null;
  for (const r of renners) {
    if (r.totaal <= 0) continue;
    if (!best || r.totaal > best.totaal || (r.totaal === best.totaal && r.naam.localeCompare(best.naam, "nl") < 0)) {
      best = r;
    }
  }
  return best?.id ?? null;
}

/** Som van de ploegpunten tot en met een rit (voor de teruggespoelde stand). */
export function ploegTotaalTotRit(
  punten: ReadonlyArray<{ stage_id: string; points: number }>,
  ritNummerVan: ReadonlyMap<string, number>,
  totRit: number | null,
): number {
  if (totRit == null) return 0;
  let som = 0;
  for (const p of punten) {
    const nr = ritNummerVan.get(p.stage_id);
    if (nr != null && nr <= totRit) som += p.points ?? 0;
  }
  return som;
}

/** Dagpunten van de ploeg in één rit. */
export function ploegDagpunten(
  punten: ReadonlyArray<{ stage_id: string; points: number }>,
  stageId: string | null,
): number {
  if (!stageId) return 0;
  return punten.filter((p) => p.stage_id === stageId).reduce((som, p) => som + (p.points ?? 0), 0);
}
