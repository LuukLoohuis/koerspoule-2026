// Zoeken op rennernaam én ploegnaam in de ploegbouwer.
//
// Los van de pagina gehouden omdat de rennerlijst er twee keer staat (mobiel en
// web) en de filtering in beide takken hetzelfde moet werken. Eén bron, twee
// aanroepen.

/**
 * Kleinletters zonder accenten, zodat "pogacar" ook Pogačar vindt en
 * "intermarche" ook Intermarché. Nederlandse gebruikers typen die tekens niet.
 */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Past deze renner bij de zoekterm? Lege zoekterm laat alles door. */
export function pastBijZoek(naam: string, ploeg: string | undefined, zoek: string): boolean {
  const q = normaliseer(zoek);
  if (!q) return true;
  return normaliseer(naam).includes(q) || normaliseer(ploeg ?? "").includes(q);
}

/**
 * Hoeveel renners heb je per ploeg gekozen, over je hele selectie heen.
 *
 * Dit is de vraag waar het om draait: je wilt niet per ongeluk je halve ploeg
 * uit één wielerploeg halen, want die rijden dezelfde koers en pakken vaak
 * dezelfde punten -- of geen van allen.
 */
export function telPerPloeg(
  gekozenIds: Iterable<string>,
  ploegVanRenner: Map<string, string>,
): Map<string, number> {
  const telling = new Map<string, number>();
  for (const id of gekozenIds) {
    const ploeg = ploegVanRenner.get(id);
    if (!ploeg) continue;
    telling.set(ploeg, (telling.get(ploeg) ?? 0) + 1);
  }
  return telling;
}

/** Ploegen met minstens één gekozen renner, aflopend op aantal, dan op naam. */
export function ploegenGesorteerd(telling: Map<string, number>): Array<[string, number]> {
  return [...telling.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
}

export type PloegInfo = { short_name: string | null; jersey_url: string | null };

export type PloegChip = {
  naam: string;
  aantal: number;
  /** Korte code voor naast het shirt; valt terug op de eerste drie letters. */
  kort: string;
  /** Shirt van de ploeg, of null als die er niet is. */
  trui: string | null;
};

/** Eerste drie letters als er geen short_name is; beter dan een leeg vakje. */
function korteCode(naam: string, short: string | null): string {
  const s = (short ?? "").trim();
  if (s) return s;
  const letters = naam.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
  return (letters.slice(0, 3) || naam.slice(0, 3)).toUpperCase();
}

/**
 * Chips voor de ploegverdeling: shirt, korte code en aantal.
 *
 * De volledige naam blijft meegaan voor het title-attribuut en de schermlezer --
 * hij staat alleen niet meer permanent in beeld, want afgekapte namen als
 * "Team Visma | Leas…" zeggen minder dan het shirt zelf.
 */
export function ploegChips(
  telling: Map<string, number>,
  info: Map<string, PloegInfo>,
): PloegChip[] {
  return ploegenGesorteerd(telling).map(([naam, aantal]) => ({
    naam,
    aantal,
    kort: korteCode(naam, info.get(naam)?.short_name ?? null),
    trui: info.get(naam)?.jersey_url ?? null,
  }));
}
