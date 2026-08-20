// Kop boven het hoofdartikel van de Krant.
//
// Een kop is een feitelijke bewering, bovenaan de voorpagina. Staat er
// "Vingegaard slaat toe" terwijl Roglic won, dan is dat geen stijlfoutje maar
// gewoon onjuist. Daarom: het FEIT komt uit de uitslag, de FORMULERING mag van
// het model komen -- en alleen als die formulering het feit bevat.

/** Achternaam uit een volledige naam; tussenvoegsels blijven eraan vast. */
export function achternaam(volledig: string | null | undefined): string {
  const delen = String(volledig ?? "").trim().split(/\s+/).filter(Boolean);
  if (delen.length <= 1) return delen[0] ?? "";
  // "Mathieu van der Poel" -> "van der Poel": alles vanaf het eerste
  // kleingeschreven tussenvoegsel, anders het laatste woord.
  const eersteTussen = delen.findIndex((d, i) => i > 0 && d === d.toLowerCase());
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

/** Aankomstplaats uit een etappenaam als "Monaco>Monaco" of "Oviedo - Angliru". */
export function aankomstplaats(etappeNaam: string | null | undefined): string | null {
  const naam = String(etappeNaam ?? "").trim();
  if (!naam) return null;
  const delen = naam.split(/\s*(?:>|→|–|—|-)\s*/).filter(Boolean);
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
}): string | null {
  const { gegenereerd, winnaar, etappeNaam, etappeNummer } = input;
  if (kopNoemtWinnaar(gegenereerd, winnaar)) return gegenereerd!.trim();

  const naam = achternaam(winnaar);
  if (!naam) return null;

  const plaats = aankomstplaats(etappeNaam);
  if (plaats) return `${naam} wint in ${plaats}`;
  return etappeNummer ? `${naam} wint etappe ${etappeNummer}` : `${naam} wint`;
}
