/**
 * Eén rangregel voor elk klassement in de app: gelijke punten, gelijke plek
 * (1, 1, 3). Dat is wat RANK() in de game_standings-RPC doet, en daarmee wat
 * Uitslagen toont. De Krant, de Volgwagen en de Subpoule-tab telden elk hun
 * plek in de gesorteerde lijst, waardoor twee ploegen met evenveel punten op
 * het ene scherm 3e en 4e stonden en op het andere allebei 3e.
 */

/** Plek van `mijn` tussen `alle`: 1 + het aantal dat méér punten heeft. */
export function rangVan(mijn: number, alle: Iterable<number>): number {
  let hoger = 0;
  for (const p of alle) if (p > mijn) hoger++;
  return hoger + 1;
}

/**
 * Zet een rang op rijen die al aflopend op punten gesorteerd zijn. De volgorde
 * blijft zoals hij is; alleen wie gelijk staat deelt de plek.
 */
export function metGedeeldeRang<T>(
  gesorteerd: T[],
  punten: (rij: T) => number,
): Array<T & { rank: number }> {
  let vorigePunten: number | null = null;
  let vorigeRang = 0;
  return gesorteerd.map((rij, i) => {
    const p = punten(rij);
    if (vorigePunten === null || p !== vorigePunten) {
      vorigeRang = i + 1;
      vorigePunten = p;
    }
    return { ...rij, rank: vorigeRang };
  });
}

/**
 * Dagklassering zoals de RPC hem geeft: alleen wie die dag punten pakte krijgt
 * een plek. Zonder punten is er geen dagrang (null), net als op Uitslagen.
 */
export function dagrangVan(mijn: number, alle: Iterable<number>): number | null {
  return mijn > 0 ? rangVan(mijn, alle) : null;
}
