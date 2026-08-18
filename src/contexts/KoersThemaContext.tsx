/**
 * Welke koers hoort bij dít scherm?
 *
 * De trui en de beker kwamen altijd uit het actieve sitethema. Dat klopt
 * zolang je naar de lopende koers kijkt, maar niet bij een afgeronde game:
 * wie de uitslagen van de Tour terugzoekt terwijl de site in Vuelta-rood
 * staat, kreeg de rode trui en de Vuelta-beker boven het algemeen
 * klassement. De winnaar van die Tour droeg geel, en dat verandert niet meer.
 *
 * Een scherm dat een specifieke game toont, zet hier de themasleutel van díe
 * game. Zonder provider blijft het gedrag zoals het was: het sitethema.
 */
import { createContext, useContext, type ReactNode } from "react";
import { useThema } from "@/contexts/ThemaContext";
import { THEMAS, type Thema, type ThemaKey } from "@/lib/themas";

const KoersThemaContext = createContext<ThemaKey | null>(null);

export function KoersThemaProvider({ themaKey, children }: { themaKey: ThemaKey | null; children: ReactNode }) {
  return <KoersThemaContext.Provider value={themaKey}>{children}</KoersThemaContext.Provider>;
}

/**
 * Het thema waar koersbeeld (trui, beker) uit moet komen: het opgelegde thema
 * van het scherm, anders dat van de site.
 */
export function useKoersThema(): Thema {
  const opgelegd = useContext(KoersThemaContext);
  const { thema } = useThema();
  return opgelegd ? THEMAS[opgelegd] : thema;
}
