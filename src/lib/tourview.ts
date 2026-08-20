// Koppeling naar tourview.pages.dev, dat interactieve 3D-etappeprofielen host.
//
// De paden zijn per koers én per jaar: /la-vuelta-2026/stage-1. Eerder stond er
// één hardgecodeerd Tour-pad in de Voorbeschouwing, waardoor je bij de Vuelta de
// kop van etappe 1 Monaco-Monaco zag met daaronder de Tour-etappe naar Barcelona.

const SLUGS: Record<string, string> = {
  tour: "tour-de-france",
  tdf: "tour-de-france",
  giro: "giro-d-italia",
  vuelta: "la-vuelta",
};

/**
 * URL van het 3D-profiel, of null als tourview deze koers niet heeft.
 *
 * Bewust géén terugval op de Tour: de Tour de France Femmes en de Meermarathon
 * staan er niet op, en een profiel van de verkeerde koers tonen is erger dan
 * geen profiel tonen. De knop hoort dan gewoon weg te blijven.
 */
export function tourviewUrl(
  gameType: string | null | undefined,
  jaar: number | null | undefined,
  etappe: number | null | undefined,
): string | null {
  const slug = SLUGS[String(gameType ?? "").toLowerCase()];
  if (!slug || !jaar || !etappe || etappe < 1) return null;
  return `https://tourview.pages.dev/${slug}-${jaar}/stage-${etappe}`;
}
