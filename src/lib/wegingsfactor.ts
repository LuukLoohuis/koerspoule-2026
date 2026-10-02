import type { PointsSchema } from "@/lib/liveMarathon";

/**
 * Meermarathon: hoe zwaar een wedstrijd telt.
 *
 * De beheerder geeft per wedstrijd een factor op (`stages.wegingsfactor`,
 * standaard 1); een Grand Prix die dubbel telt heeft 2. Een rijder scoort de
 * schemapunten maal die factor, per rijder afgerond -- precies zoals
 * calculate_stage_scores in de database. Waar de app zelf punten uit het
 * schema afleidt (live, de uitslag per rijder, de ploegvergelijking) volgt hij
 * dezelfde regel, anders telt het scherm iets anders op dan de stand.
 *
 * Alleen de wedstrijdpunten wegen; de pronostiek telt zoals hij telde.
 */

/** Hoogste factor die het beheer accepteert; dezelfde grens als de database. */
export const WEGING_MAX = 10;

/** De factor van een wedstrijd; 1 zonder (geldige) waarde. */
export function wegingVan(stage: { wegingsfactor?: number | string | null } | null | undefined): number {
  const n = Number(stage?.wegingsfactor ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Schemapunten maal de factor, afgerond zoals Postgres `round()` op numeric:
 * x,5 gaat van nul af. De factor gaat eerst naar hele honderdsten (zo staat
 * hij ook in de database), zodat bv. 30 × 1,15 niet door de binaire breuk op
 * 34,4999… uitkomt maar op 34,5 -- en dus op 35, net als in de stand.
 */
export function gewogenPunten(punten: number, weging: number): number {
  const exact = (punten * Math.round(weging * 100)) / 100;
  return Math.sign(exact) * Math.round(Math.abs(exact));
}

/** "2", "1,5": de factor als getal met een komma, zoals in het invoerveld. */
export function wegingGetal(weging: number): string {
  return String(Math.round(weging * 100) / 100).replace(".", ",");
}

/** "×2", "×1,5": de factor zoals hij in de app staat. */
export function wegingLabel(weging: number): string {
  return `×${wegingGetal(weging)}`;
}

/** Korte uitleg naast de naam van een wedstrijd; null als hij gewoon telt. */
export function wegingUitleg(weging: number): string | null {
  if (weging === 1) return null;
  if (weging === 2) return "telt dubbel";
  return `telt ${wegingLabel(weging)}`;
}

/**
 * Invoer uit het beheer: "2", "1,5" of "1.5". Null als het geen geldige
 * factor is (leeg, 0 of minder, boven het maximum).
 */
export function leesWeging(invoer: string): number | null {
  const tekst = invoer.trim().replace(",", ".");
  if (tekst === "") return null;
  const n = Number(tekst);
  if (!Number.isFinite(n) || n > WEGING_MAX) return null;
  const afgerond = Math.round(n * 100) / 100;
  return afgerond > 0 ? afgerond : null;
}

/** De factor per wedstrijd-id, om uitslagregels (met stage_id) te wegen. */
export function wegingPerWedstrijd(
  stages: ReadonlyArray<{ id: string; wegingsfactor?: number | string | null }>,
): Map<string, number> {
  return new Map(stages.map((s) => [s.id, wegingVan(s)]));
}

/** Het puntenschema van één wedstrijd met de factor er al in, voor de live projectie. */
export function schemaMetWeging(schema: PointsSchema, weging: number): PointsSchema {
  if (weging === 1) return schema;
  return new Map([...schema].map(([plek, punten]) => [plek, gewogenPunten(punten, weging)]));
}
