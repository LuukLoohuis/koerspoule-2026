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

/** Bedoelde lengte van een etappeverslag: kort genoeg om echt gelezen te worden. */
export const LENGTE_MIN = 5;
export const LENGTE_MAX = 10;

const AFKORTINGEN = ["bijv", "nr", "ca", "resp", "incl", "excl", "etc", "evt", "ong", "max", "afb"];
const AFKORTING_RE = new RegExp(`\\b(?:${AFKORTINGEN.join("|")})\\.`, "gi");

function stripAfkortingen(tekst: string): string {
  // Losse letter + punt vangt initialen ("M. van der Poel") en samenstellingen
  // als "z.t." of "o.a."; de lijst vangt de meerletterige die daarna nog
  // overblijven. Geen echte taalanalyse -- wel genoeg voor koersteksten.
  return tekst.replace(/\b[A-Za-zÀ-ÿ]\./g, "").replace(AFKORTING_RE, "");
}

/**
 * Telt zinnen zoals een lezer ze ziet.
 *
 * Twee valkuilen die in koersteksten gegarandeerd voorkomen: afkortingen als
 * "z.t." (zelfde tijd) staan in vrijwel elke uitslag, en initialen als
 * "M. van der Poel" zijn de normale schrijfwijze. Beide eindigen op een punt
 * met een spatie erachter en zouden anders als zinseinde meetellen.
 *
 * De telling stuurt de hint voor de redacteur en de hertelling in de
 * generatie; een verkeerde telling kost daar dus een onnodige OpenAI-ronde.
 */
export function telZinnen(tekst: string): number {
  return stripAfkortingen(tekst)
    .split(/[.!?]+(?=\s+["'\u201C\u2018(]?[A-ZÀ-Ý]|\s*$)/)
    .map((z) => z.trim())
    .filter(Boolean).length;
}
