/**
 * De ranglijst op Ploeg C: rekenwerk los van het scherm.
 *
 * Elke renner heeft een rij punten per etappe (uit de rider_stage_points-RPC,
 * dus mét joker-multiplier). Het scherm kiest een rit; daaruit volgen de
 * dagpunten (die ene rit) en het totaal (alles tot en met die rit). De
 * sortering "Punten" zet het totaal voorop, "Vandaag" wie in de gekozen rit
 * scoorde.
 */

export type EtappePunten = { stage_number: number; total_points: number };

export type Sortering = "punten" | "vandaag";

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
