/**
 * Weging van het Wielerdirecteur-cijfer. Staat hier één keer: het cijfer
 * wordt op drie plekken berekend (Hors Catégorie, de Krant en de rapporten in
 * bulk) en die moeten hetzelfde zeggen.
 *
 * Zonder jokers (Meermarathon) vervalt de Joker Prestatie. Haar 20% gaat naar
 * de andere drie onderdelen, in ongeveer dezelfde verhouding, afgerond op vijf.
 */
export type DirecteurDelen = { pool: number; monkey: number; joker: number; diff: number };

export const WEGING_MET_JOKERS: DirecteurDelen = { pool: 0.45, monkey: 0.25, joker: 0.2, diff: 0.1 };
export const WEGING_ZONDER_JOKERS: DirecteurDelen = { pool: 0.55, monkey: 0.3, joker: 0, diff: 0.15 };

export function directeurWeging(metJokers: boolean): DirecteurDelen {
  return metJokers ? WEGING_MET_JOKERS : WEGING_ZONDER_JOKERS;
}

/** Het ruwe cijfer, van 0 tot 1, uit de deelscores. */
export function directeurRuw(delen: DirecteurDelen, weging: DirecteurDelen): number {
  return delen.pool * weging.pool + delen.monkey * weging.monkey + delen.joker * weging.joker + delen.diff * weging.diff;
}

/** 0.45 → 45: zo staat de weging in de uitleg. */
export function wegingPct(weging: number): number {
  return Math.round(weging * 100);
}
