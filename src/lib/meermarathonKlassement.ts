/**
 * Het Meermarathon-klassement onder Uitslagen: welke rijen je ziet, en wat
 * er over jouw plek te zeggen valt. Zonder React of database, zodat de regels
 * (top 5, "⋮", de rijen rond jou) los te testen zijn.
 */

/** Wat de game_standings-RPC per ingediende ploeg teruggeeft, voor zover we het gebruiken. */
export type MmStandRij = {
  entry_id: string;
  user_id: string;
  team_name: string | null;
  display_name: string | null;
  rank: number;
  /** prev_rank − rank: positief is gestegen. */
  delta: number;
  total: number;
  /** Punten in de laatst meegetelde wedstrijd. */
  stage_points: number;
};

export type KlassementRegel<R> =
  | { soort: "rij"; rij: R; jij: boolean }
  | { soort: "gat"; verborgen: number };

/**
 * De top, dan een "⋮", dan jouw rij met zijn buren.
 *
 * Een gat van één rij vullen we op: de "⋮" zou evenveel ruimte kosten als de
 * rij die hij verbergt. Achter de laatste getoonde rij komt geen "⋮"; daar is
 * de knop "Toon volledig klassement" voor.
 */
export function klassementRegels<R extends { user_id: string }>(
  rijen: R[],
  eigenUserId: string | null | undefined,
  { top = 5, marge = 1, volledig = false }: { top?: number; marge?: number; volledig?: boolean } = {},
): KlassementRegel<R>[] {
  const jij = eigenUserId ? rijen.findIndex((r) => r.user_id === eigenUserId) : -1;
  const regel = (i: number): KlassementRegel<R> => ({ soort: "rij", rij: rijen[i], jij: i === jij });
  if (volledig) return rijen.map((_, i) => regel(i));

  const toon = new Set<number>();
  for (let i = 0; i < Math.min(top, rijen.length); i++) toon.add(i);
  if (jij >= 0) {
    for (let i = Math.max(0, jij - marge); i <= Math.min(rijen.length - 1, jij + marge); i++) toon.add(i);
  }

  const volgorde = [...toon].sort((a, b) => a - b);
  const regels: KlassementRegel<R>[] = [];
  volgorde.forEach((i, n) => {
    const vorige = n === 0 ? -1 : volgorde[n - 1];
    const tussen = i - vorige - 1;
    if (tussen === 1) regels.push(regel(i - 1));
    else if (tussen > 1) regels.push({ soort: "gat", verborgen: tussen });
    regels.push(regel(i));
  });
  return regels;
}

/** Hoeveel rijen de ingeklapte lijst niet laat zien. */
export function verborgenRijen<R>(rijen: R[], regels: KlassementRegel<R>[]): number {
  return rijen.length - regels.filter((r) => r.soort === "rij").length;
}

type WedstrijdLite = { stage_number: number; is_gc: boolean; results_status: string | null };

/** De laatste wedstrijd met een goedgekeurde uitslag: tot daar telt het klassement. */
export function laatsteGoedgekeurdeWedstrijd<W extends WedstrijdLite>(wedstrijden: W[]): W | null {
  return wedstrijden
    .filter((w) => !w.is_gc && w.results_status === "approved")
    .reduce<W | null>((max, w) => (max == null || w.stage_number > max.stage_number ? w : max), null);
}

/**
 * Is er vóór deze wedstrijd al een uitslag? Zo niet, dan betekent de delta
 * uit de RPC niets: na de eerste wedstrijd staat "vorige keer" iedereen
 * gelijk op 1, en zou elke ploeg behalve de leider gezakt lijken.
 */
export function heeftEerdereUitslag(wedstrijden: WedstrijdLite[], nummer: number): boolean {
  return wedstrijden.some((w) => !w.is_gc && w.results_status === "approved" && w.stage_number < nummer);
}

export type Beweging = { richting: "op" | "neer" | "gelijk"; plaatsen: number };

export type JouwPlek = {
  rank: number;
  ploegnaam: string;
  punten: number;
  /** Punten achter de leider; 0 als je (gedeeld) bovenaan staat. */
  achterstand: number;
  /** Staan er meer ploegen op 1? Dan deel je de leiding. */
  gedeeldeLeiding: boolean;
  beweging: Beweging | null;
};

export function ploegnaam(rij: Pick<MmStandRij, "team_name" | "display_name">): string {
  return rij.team_name?.trim() || rij.display_name?.trim() || "Ploeg zonder naam";
}

export function jouwPlek(
  rijen: MmStandRij[],
  eigenUserId: string | null | undefined,
  { metBeweging }: { metBeweging: boolean },
): JouwPlek | null {
  const mij = eigenUserId ? rijen.find((r) => r.user_id === eigenUserId) : undefined;
  if (!mij) return null;
  const leider = Math.max(...rijen.map((r) => r.total));
  const delta = mij.delta ?? 0;
  return {
    rank: mij.rank,
    ploegnaam: ploegnaam(mij),
    punten: mij.total,
    achterstand: Math.max(0, leider - mij.total),
    gedeeldeLeiding: mij.rank === 1 && rijen.filter((r) => r.rank === 1).length > 1,
    beweging: metBeweging
      ? { richting: delta > 0 ? "op" : delta < 0 ? "neer" : "gelijk", plaatsen: Math.abs(delta) }
      : null,
  };
}

// ── Opmaak ────────────────────────────────────────────────────────────────

const GETAL = new Intl.NumberFormat("nl-NL");

/** "1.204" */
export function mmGetal(n: number): string {
  return GETAL.format(n);
}

/** "▲ 4", "▼ 2", "=": het teken zelf; voor schermlezers zie bewegingLabel. */
export function bewegingTeken(b: Beweging): string {
  if (b.richting === "gelijk") return "=";
  return `${b.richting === "op" ? "▲" : "▼"} ${b.plaatsen}`;
}

/** "4 plaatsen gestegen" */
export function bewegingLabel(b: Beweging): string {
  if (b.richting === "gelijk") return "gelijk gebleven";
  const plaatsen = `${b.plaatsen} ${b.plaatsen === 1 ? "plaats" : "plaatsen"}`;
  return `${plaatsen} ${b.richting === "op" ? "gestegen" : "gezakt"}`;
}

/** "65 achter de leider" (lang) of "65 achter" (kort); bovenaan "aan de leiding". */
export function achterstandTekst(plek: Pick<JouwPlek, "achterstand" | "gedeeldeLeiding">, kort = false): string {
  if (plek.achterstand === 0) return plek.gedeeldeLeiding ? "gedeeld aan de leiding" : "aan de leiding";
  return kort ? `${mmGetal(plek.achterstand)} achter` : `${mmGetal(plek.achterstand)} achter de leider`;
}

/** "1.204 ploegen" */
export function ploegenTekst(n: number): string {
  return `${mmGetal(n)} ${n === 1 ? "ploeg" : "ploegen"}`;
}
