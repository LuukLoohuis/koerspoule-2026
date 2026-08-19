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
