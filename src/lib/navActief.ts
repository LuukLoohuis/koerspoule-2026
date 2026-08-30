/**
 * Welke knop in de onderbalk licht op?
 *
 * De Krant en de rest van de pagina delen één component maar hebben twee
 * routes: /karavaan opent de Krant, /mijn-peloton de Volgwagen, en daarna zegt
 * ?tab= welke tab openstaat. Dat was de bron van een bug: sprong je vanaf de
 * Krant naar Subpoule, dan bleef het pad /karavaan en dus bleef de balk op
 * Krant staan terwijl je naar de subpoule keek.
 *
 * Los van het component zodat dit te toetsen is zonder een router op te tuigen.
 */
export type NavDoel = { to: string; tab?: string };

/** Zonder ?tab= staat de Krant open — zelfde standaard als de pagina zelf. */
export const STANDAARD_TAB = "karavaan";

/** Beide routes tonen dezelfde pagina; alleen de begin-tab verschilt. */
export function opPelotonPagina(pathname: string): boolean {
  return pathname.startsWith("/mijn-peloton") || pathname.startsWith("/karavaan");
}

export function navIsActief(doel: NavDoel, pathname: string, tabParam: string | null): boolean {
  if (doel.tab) return opPelotonPagina(pathname) && (tabParam ?? STANDAARD_TAB) === doel.tab;
  if (doel.to === "/") return pathname === "/";
  return pathname.startsWith(doel.to);
}
