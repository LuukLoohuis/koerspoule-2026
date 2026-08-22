// Kop boven het hoofdartikel van de Krant.
//
// Een kop is een feitelijke bewering, bovenaan de voorpagina. Staat er
// "Vingegaard slaat toe" terwijl Roglic won, dan is dat geen stijlfoutje maar
// gewoon onjuist. Daarom: het FEIT komt uit de uitslag, de FORMULERING mag van
// het model komen -- en alleen als die formulering het feit bevat.

// Tussenvoegsels expliciet op een lijst i.p.v. herkennen aan kleine letters:
// startlijsten schrijven net zo vaak "Mathieu Van Der Poel" als "van der Poel",
// en dan leverde de kleineletter-truc "Poel" op -- een verkeerde naam boven een
// krantenkop.
const TUSSENVOEGSELS = new Set([
  "van", "de", "der", "den", "ten", "ter", "te", "het", "op",
  "du", "des", "del", "della", "di", "da", "dos", "das", "le", "la", "el", "af", "av",
]);

/** Achternaam uit een volledige naam; tussenvoegsels blijven eraan vast. */
export function achternaam(volledig: string | null | undefined): string {
  const delen = String(volledig ?? "").trim().split(/\s+/).filter(Boolean);
  if (delen.length <= 1) return delen[0] ?? "";
  const eersteTussen = delen.findIndex((d, i) => i > 0 && TUSSENVOEGSELS.has(d.toLowerCase()));
  return eersteTussen > 0 ? delen.slice(eersteTussen).join(" ") : delen[delen.length - 1];
}

/** Zoekt normalisatie-ongevoelig; "Roglic" moet ook "Roglič" vinden. */
function plat(tekst: string): string {
  return tekst.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Noemt deze kop de winnaar? Zo niet, dan gebruiken we hem niet. */
export function kopNoemtWinnaar(kop: string | null | undefined, winnaar: string | null | undefined): boolean {
  const naam = achternaam(winnaar);
  if (!kop?.trim() || !naam) return false;
  return plat(kop).includes(plat(naam));
}

/**
 * Noemt deze kop een deelnemer of ploeg uit de poule?
 *
 * De generator krijgt de instructie dat de kop over de KOERS gaat en geen naam
 * van een deelnemer of subpoule mag bevatten. Een model houdt zich daar niet
 * altijd aan -- "Pogacar zet JWielerteam op kop" noemt de ritwinnaar én een
 * ploegnaam, en glipte daarmee door de winnaarscontrole heen. Deze check vangt
 * dat af, zodat we terugvallen op het sjabloon.
 *
 * Korte namen worden genegeerd: een ploeg die "De" of "AB" heet zou anders elke
 * kop afkeuren.
 */
export function kopNoemtPoulenaam(kop: string | null | undefined, namen: Array<string | null | undefined>): boolean {
  const platteKop = plat(String(kop ?? ""));
  if (!platteKop) return false;
  return namen.some((n) => {
    const naam = plat(String(n ?? "").trim());
    return naam.length >= 3 && platteKop.includes(naam);
  });
}

/** Aankomstplaats uit een etappenaam als "Monaco>Monaco" of "Oviedo - Angliru". */
export function aankomstplaats(etappeNaam: string | null | undefined): string | null {
  const naam = String(etappeNaam ?? "").trim();
  if (!naam) return null;
  // Inclusief U+203A: de app schrijft etappenamen als "Thoiry › Paris", en zonder
  // dat teken bleef de hele naam als "plaats" staan.
  const delen = naam.split(/\s*(?:>|›|»|→|–|—|-)\s*/).filter(Boolean);
  const laatste = delen[delen.length - 1]?.trim();
  return laatste && laatste.length > 1 ? laatste : null;
}

/**
 * De kop voor de voorpagina.
 *
 * Voorkeur voor de gegenereerde kop, maar alleen als die de winnaar noemt.
 * Anders een sjabloon uit de uitslag: saai, maar altijd waar. En is er nog geen
 * winnaar, dan geeft dit null terug -- dan hoort de voorpagina de
 * voorbeschouwing te tonen in plaats van een lege kop.
 */
export function bouwKop(input: {
  gegenereerd?: string | null;
  winnaar?: string | null;
  etappeNaam?: string | null;
  etappeNummer?: number | null;
  /** Ploeg- en deelnemersnamen die niet in de kop thuishoren. */
  poulenamen?: Array<string | null | undefined>;
}): string | null {
  const { gegenereerd, winnaar, etappeNaam, etappeNummer, poulenamen = [] } = input;
  if (kopNoemtWinnaar(gegenereerd, winnaar) && !kopNoemtPoulenaam(gegenereerd, poulenamen)) {
    return gegenereerd!.trim();
  }

  const naam = achternaam(winnaar);
  if (!naam) return null;

  const plaats = aankomstplaats(etappeNaam);
  if (plaats) return `${naam} wint in ${plaats}`;
  return etappeNummer ? `${naam} wint etappe ${etappeNummer}` : `${naam} wint`;
}
