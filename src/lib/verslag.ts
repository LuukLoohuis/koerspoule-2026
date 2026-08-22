/**
 * Hulpfuncties voor het etappeverslag in de Koerskrant.
 *
 * Apart van het component zodat de tekstbehandeling te testen is: een verslag
 * komt van buiten (geplakt door een admin, mogelijk van een externe bron) en
 * moet dus niet blind vertrouwd worden op vorm.
 */

/** Splitst platte tekst in alinea's; lege regels en witruimte vallen weg. */
export function alineas(tekst: string): string[] {
  return tekst
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Ruwe schatting van de leestijd, afgerond naar boven, minimaal 1 minuut. */
export function leestijdMinuten(tekst: string, woordenPerMinuut = 200): number {
  const woorden = tekst.trim().split(/\s+/).filter(Boolean).length;
  if (woorden === 0) return 0;
  return Math.max(1, Math.ceil(woorden / woordenPerMinuut));
}

/**
 * De eerste alinea, ingekort tot een leesbare intro voor de dichtgeklapte
 * kaart. Knipt op een woordgrens en plakt er een beletselteken achter.
 */
export function intro(tekst: string, maxTekens = 220): string {
  const eerste = alineas(tekst)[0] ?? "";
  if (eerste.length <= maxTekens) return eerste;
  const geknipt = eerste.slice(0, maxTekens);
  const spatie = geknipt.lastIndexOf(" ");
  return `${(spatie > 40 ? geknipt.slice(0, spatie) : geknipt).replace(/[,;:.\s]+$/, "")}…`;
}

/**
 * Bronregel onder het verslag. Zonder bron geen regel -- eigen tekst hoeft
 * niet toegeschreven te worden, en een lege "Bron:" ziet er slordig uit.
 */
export function bronregel(bron: string | null | undefined): string | null {
  const naam = bron?.trim();
  return naam ? `Met toestemming overgenomen van ${naam}` : null;
}

/** Alleen http(s)-links; voorkomt javascript:-URL's uit een geplakte tekst. */
export function veiligeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
