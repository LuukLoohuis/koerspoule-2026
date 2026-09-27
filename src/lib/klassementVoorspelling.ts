/**
 * Meermarathon-pronostiek: per peloton de winnaar van het Cup-klassement
 * (kunstijs) en van het Grand Prix-klassement (natuurijs). De regels zonder
 * React of database, gedeeld door de Pronostiek-tab en het beheer
 * (Eindklassementen).
 */

/** Pronostiek: de winnaar van het Cup- of het Grand Prix-klassement. */
export type Klassement = "cup" | "grandprix";

/** De twee klassementen van de pronostiek, in de volgorde van het scherm. */
export const KLASSEMENTEN: ReadonlyArray<{ key: Klassement; label: string; ondergrond: string }> = [
  { key: "cup", label: "Cup-klassement", ondergrond: "kunstijs" },
  { key: "grandprix", label: "Grand Prix-klassement", ondergrond: "natuurijs" },
];

/** Per klassement een rijder-id (voorspeld, of de winnaar), of null. */
export type KlassementRijders = Record<Klassement, string | null>;

/**
 * Punten voor een goede klassementsvoorspelling zonder eigen puntenschema
 * (points_schema 'pred_klassement'). Zelfde standaard als in
 * calculate_prediction_points.
 */
export const KLASSEMENT_PUNTEN = 50;

export type KlassementTelling = Record<Klassement, { voorspeld: number; goed: number }>;

/** Het aantal voorspellingen per klassement, en hoeveel daarvan de winnaar noemen. */
export function telVoorspellingen(
  voorspellingen: ReadonlyArray<{ classification: string; rider_id: string }>,
  winnaars: KlassementRijders,
): KlassementTelling {
  const tel = (k: Klassement) => {
    const van = voorspellingen.filter((p) => p.classification === k);
    return { voorspeld: van.length, goed: winnaars[k] ? van.filter((p) => p.rider_id === winnaars[k]).length : 0 };
  };
  return { cup: tel("cup"), grandprix: tel("grandprix") };
}
