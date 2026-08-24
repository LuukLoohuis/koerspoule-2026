/**
 * Hulpfuncties voor De Legende: het archiefverhaal in de rechterkolom van de
 * Koerskrant.
 *
 * Het verhaal komt uit het rubriek-tabje van de admin en is dus vrije tekst.
 * De krant toont er eerst één alinea van en zet de rest achter "Lees het
 * verhaal"; die splitsing hoort testbaar te zijn, los van het component.
 */
import { alineas, veiligeUrl, zonderNadruk } from "@/lib/verslag";

/** Kortste opening die nog als intro leest; korter is een losse zin. */
const OPENING_MIN = 90;

export type LegendeDelen = {
  /** Wat dicht zichtbaar is. */
  teaser: string;
  /** Wat achter het uitklappen zit; leeg bij een verhaal van één alinea. */
  rest: string[];
};

export function legendeDelen(tekst: string | null | undefined): LegendeDelen {
  const schoon = zonderNadruk(String(tekst ?? ""));
  let stukken = alineas(schoon);

  // Wie een verhaal intikt of plakt gebruikt vaak enkele regeleindes in plaats
  // van een lege regel ertussen. Zonder deze terugval is zo'n verhaal één
  // alinea, staat het in zijn geheel dichtgeklapt op de voorpagina en valt er
  // niets te lezen achter "Lees het verhaal".
  if (stukken.length <= 1) {
    const regels = schoon
      .split(/\r?\n/)
      .map((r) => r.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (regels.length > 1) {
      // Losse regels zijn zinnen, geen alinea's. Vooraan zoveel zinnen als
      // nodig voor een fatsoenlijke opening, de rest als één blok erachter --
      // een kolom met tien alinea's van één zin leest als een boodschappenlijst.
      let opening = regels[0];
      let i = 1;
      while (i < regels.length && opening.length < OPENING_MIN) {
        opening = `${opening} ${regels[i]}`;
        i += 1;
      }
      const staart = regels.slice(i).join(" ");
      stukken = staart ? [opening, staart] : [opening];
    }
  }

  if (stukken.length === 0) return { teaser: "", rest: [] };
  return { teaser: stukken[0], rest: stukken.slice(1) };
}

/**
 * Het regeltje boven de kop: "De Legende · 1913". Zonder jaartal blijft het
 * bij de rubrieknaam -- een losse punt zonder wat erachter leest als een fout.
 */
export function legendeKicker(rubriek: string, jaar: string | null | undefined): string {
  const schoon = String(jaar ?? "").trim();
  return schoon ? `${rubriek} · ${schoon}` : rubriek;
}

/**
 * Bronvermelding onderaan. Een bron mag ook een losse naam zijn ("Tourarchief"),
 * dus een url is optioneel; alleen http(s) komt erdoor.
 */
export function legendeBron(bron: string | null | undefined): { tekst: string; url: string | null } | null {
  const schoon = String(bron ?? "").trim();
  if (!schoon) return null;
  const url = veiligeUrl(schoon);
  return url ? { tekst: schoon.replace(/^https?:\/\//, ""), url } : { tekst: schoon, url: null };
}
