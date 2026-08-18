/**
 * Welke trui hoort bij dít scherm?
 *
 * TruiBadge las altijd het actieve sitethema. Dat klopt zolang je naar de
 * lopende koers kijkt, maar niet bij een afgeronde game: wie de uitslagen van
 * de Tour terugzoekt terwijl de site in Vuelta-rood staat, kreeg de rode trui
 * boven het algemeen klassement. De winnaar van die Tour droeg geel, en dat
 * verandert niet meer.
 *
 * Een scherm dat een specifieke game toont, zet hier de themasleutel van díe
 * game. Zonder provider blijft het gedrag zoals het was: het actieve thema.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { ThemaKey } from "@/lib/themas";

const TruiThemaContext = createContext<ThemaKey | null>(null);

export function TruiThemaProvider({ themaKey, children }: { themaKey: ThemaKey | null; children: ReactNode }) {
  return <TruiThemaContext.Provider value={themaKey}>{children}</TruiThemaContext.Provider>;
}

/** De themasleutel die truien moeten gebruiken, of null = volg het sitethema. */
export function useTruiThemaKey(): ThemaKey | null {
  return useContext(TruiThemaContext);
}
