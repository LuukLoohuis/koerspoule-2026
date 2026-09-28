import { isMeermarathonGame } from "@/lib/gameTypes";

type GameLite = { id: string; year: number; game_type?: string | null };

/**
 * Voor welk Meermarathon-peloton de teambouwer is.
 *
 * useCurrentGame({ preferRegistration }) volgt de gekozen game alleen als die
 * open staat voor inschrijving, en valt anders terug op de game waarvoor je
 * nú kunt inschrijven. De pelotonbalk toont echter altijd de gekozen game.
 *
 * - bouwen: beide zeggen hetzelfde.
 * - keuze-dicht: je koos zelf het andere peloton van dit seizoen en dat is
 *   niet open. Dan tonen we dát, met de melding dat inschrijven (nog) niet
 *   kan; anders zegt de pelotonbalk "Vrouwen" terwijl je aan je mannenploeg
 *   bouwt.
 * - volg: geen eigen keuze, of een andere koers. Zet de keuze op de game
 *   waarvoor je inschrijft, zodat de pelotonbalk meeloopt.
 */
export type TeambouwerDoel =
  | { soort: "bouwen"; gameId: string }
  | { soort: "keuze-dicht"; gameId: string }
  | { soort: "volg"; gameId: string };

export function teambouwerDoel(huidig: GameLite, gekozen: GameLite | null, expliciet: boolean): TeambouwerDoel {
  if (!gekozen || gekozen.id === huidig.id) return { soort: "bouwen", gameId: huidig.id };
  if (expliciet && isMeermarathonGame(gekozen.game_type) && gekozen.year === huidig.year) {
    return { soort: "keuze-dicht", gameId: gekozen.id };
  }
  return { soort: "volg", gameId: huidig.id };
}
