import { isMeermarathonGame } from "@/lib/gameTypes";
import { isPreviewStatus } from "@/lib/gameStatus";
import { pastBijZoek } from "@/lib/ploegZoek";

/**
 * Ploeg samenstellen voor de Meermarathon: de regels zonder React of
 * database. De teambouwer, de kiezer en de testbank rekenen hier allemaal
 * mee, zodat "3/5 gekozen" overal hetzelfde betekent.
 */

export type PsRijder = {
  id: string;
  naam: string;
  /** Naam van de schaatsploeg (riders.team_id → teams.name). */
  ploeg: string | null;
  /** Beennummer; ontbreekt zolang de startlijst er geen heeft. */
  nummer: number | null;
};

export type PsCategorie = {
  id: string;
  naam: string;
  /** categories.max_picks; bij de Meermarathon normaal 1. */
  max: number;
  rijders: PsRijder[];
};

/** categorie-id → gekozen rijder-ids. */
export type PsGekozen = ReadonlyMap<string, readonly string[]>;

/** Waarvoor de kiezer openstaat: een plek in een categorie, of een joker. */
export type KiesDoel =
  | { soort: "categorie"; categorieId: string; plek: number }
  | { soort: "joker"; plek: number };

export type PsSlot = {
  /** Stabiele sleutel, ook bruikbaar als React-key. */
  sleutel: string;
  categorie: PsCategorie;
  /** Volgnummer van de categorie, vanaf 1 ("Categorie 4"). */
  volgnummer: number;
  /** Plek binnen de categorie, vanaf 0. */
  plek: number;
  rijder: PsRijder | null;
};

export function doelSleutel(doel: KiesDoel): string {
  return doel.soort === "joker" ? `joker:${doel.plek}` : `${doel.categorieId}:${doel.plek}`;
}

export function zelfdeDoel(a: KiesDoel | null, b: KiesDoel | null): boolean {
  return a != null && b != null && doelSleutel(a) === doelSleutel(b);
}

/**
 * Alleen keuzes die de categorie echt toelaat, zonder dubbelen en niet meer
 * dan max_picks. Een rijder die de beheerder later uit een categorie haalt,
 * blijft anders als spookkeuze meetellen voor "compleet".
 */
export function geldigeKeuzes(categorieen: PsCategorie[], gekozen: PsGekozen): Map<string, string[]> {
  const uit = new Map<string, string[]>();
  for (const c of categorieen) {
    const toegestaan = new Set(c.rijders.map((r) => r.id));
    const ids = (gekozen.get(c.id) ?? []).filter((id, i, arr) => toegestaan.has(id) && arr.indexOf(id) === i);
    uit.set(c.id, ids.slice(0, Math.max(1, c.max)));
  }
  return uit;
}

export function bouwSlots(categorieen: PsCategorie[], gekozen: PsGekozen): PsSlot[] {
  const geldig = geldigeKeuzes(categorieen, gekozen);
  const slots: PsSlot[] = [];
  categorieen.forEach((c, i) => {
    const ids = geldig.get(c.id) ?? [];
    for (let plek = 0; plek < Math.max(1, c.max); plek++) {
      const id = ids[plek];
      slots.push({
        sleutel: `${c.id}:${plek}`,
        categorie: c,
        volgnummer: i + 1,
        plek,
        rijder: id ? (c.rijders.find((r) => r.id === id) ?? null) : null,
      });
    }
  });
  return slots;
}

/** "Categorie 4 · Vechters"; bij meer plekken in één categorie ook "· 2/3". */
export function slotLabel(slot: Pick<PsSlot, "categorie" | "volgnummer" | "plek">): string {
  const basis = `Categorie ${slot.volgnummer} · ${slot.categorie.naam}`;
  return slot.categorie.max > 1 ? `${basis} · ${slot.plek + 1}/${slot.categorie.max}` : basis;
}

export type Telling = { gekozen: number; vereist: number; compleet: boolean };

export function telling(categorieen: PsCategorie[], gekozen: PsGekozen): Telling {
  const geldig = geldigeKeuzes(categorieen, gekozen);
  let aantal = 0;
  let vereist = 0;
  for (const c of categorieen) {
    vereist += Math.max(1, c.max);
    aantal += geldig.get(c.id)?.length ?? 0;
  }
  // Zonder categorieën is er niets te bevestigen: de database zou een lege
  // ploeg wel accepteren (geen categorie ontbreekt), maar dan doe je nergens mee.
  return { gekozen: aantal, vereist, compleet: vereist > 0 && aantal === vereist };
}

/** "A", "A en B", "A, B en C". */
export function opsomming(namen: string[]): string {
  if (namen.length <= 1) return namen[0] ?? "";
  return `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
}

/** "Nog open: Vechters en Talent", of null als de ploeg compleet is. */
export function nogOpenTekst(categorieen: PsCategorie[], gekozen: PsGekozen): string | null {
  const geldig = geldigeKeuzes(categorieen, gekozen);
  const open = categorieen.filter((c) => (geldig.get(c.id)?.length ?? 0) < Math.max(1, c.max)).map((c) => c.naam);
  return open.length ? `Nog open: ${opsomming(open)}` : null;
}

/** "Meermarathon Mannen · kies 5 rijders, één per categorie". */
export function ondertitel(gameNaam: string, categorieen: PsCategorie[]): string {
  if (categorieen.length === 0) return `${gameNaam} · de categorieën volgen nog`;
  const vereist = categorieen.reduce((n, c) => n + Math.max(1, c.max), 0);
  const rijders = vereist === 1 ? "1 rijder" : `${vereist} rijders`;
  if (categorieen.every((c) => Math.max(1, c.max) === 1)) {
    return categorieen.length === 1 ? `${gameNaam} · kies 1 rijder` : `${gameNaam} · kies ${rijders}, één per categorie`;
  }
  return `${gameNaam} · kies ${rijders} uit ${categorieen.length} categorieën`;
}

/** Beennummer oplopend (zonder nummer achteraan), daarna op naam. */
export function sorteerRijders(rijders: readonly PsRijder[]): PsRijder[] {
  return [...rijders].sort(
    (a, b) => (a.nummer ?? Number.MAX_SAFE_INTEGER) - (b.nummer ?? Number.MAX_SAFE_INTEGER) || a.naam.localeCompare(b.naam, "nl"),
  );
}

export type KandidaatStatus = "kies" | "huidig" | "bezet";
export type Kandidaat = { rijder: PsRijder; status: KandidaatStatus };

/**
 * De rijders die je voor één plek kunt kiezen, gefilterd op naam of ploeg.
 *
 * - huidig: staat nu op deze plek (je kunt hem weghalen).
 * - bezet: zit al elders in je ploeg of is joker. De database weigert hem
 *   daar toch; hier zie je het vóór je tikt.
 */
export function kandidaten(
  rijders: readonly PsRijder[],
  opties: { huidig: string | null; bezet: ReadonlySet<string>; zoek: string },
): Kandidaat[] {
  return sorteerRijders(rijders)
    .filter((r) => pastBijZoek(r.naam, r.ploeg ?? undefined, opties.zoek))
    .map((rijder) => ({
      rijder,
      status: rijder.id === opties.huidig ? "huidig" : opties.bezet.has(rijder.id) ? "bezet" : "kies",
    }));
}

/**
 * Wat er naar de database moet om een plek te vullen of te wisselen.
 *
 * Bij één plek per categorie vervangt save_entry_pick in één stap, en schuift
 * de keuze ook direct goed in de cache. toggle_entry_pick zou dat server-side
 * ook doen, maar zet de nieuwe rijder even náást de oude en dan toont de plek
 * tot de herlaadronde nog de oude naam. Bij meer plekken moet de oude er
 * eerst uit, anders weigert de database omdat de categorie vol zit.
 */
export type PickActie = { soort: "vervang" | "aan-uit"; rijderId: string };

export function pickActies(opties: {
  max: number;
  inCategorie: readonly string[];
  oud: string | null;
  nieuw: string;
}): PickActie[] {
  const { max, inCategorie, oud, nieuw } = opties;
  if (nieuw === oud || inCategorie.includes(nieuw)) return [];
  if (Math.max(1, max) === 1) return [{ soort: "vervang", rijderId: nieuw }];
  if (oud) return [{ soort: "aan-uit", rijderId: oud }, { soort: "aan-uit", rijderId: nieuw }];
  return inCategorie.length < max ? [{ soort: "aan-uit", rijderId: nieuw }] : [];
}

/** Jokers mogen niet uit een categorie komen; de rest van de startlijst wel. */
export function jokerPool(startlijst: readonly PsRijder[], categorieen: PsCategorie[]): PsRijder[] {
  const inCategorie = new Set(categorieen.flatMap((c) => c.rijders.map((r) => r.id)));
  return sorteerRijders(startlijst.filter((r) => !inCategorie.has(r.id)));
}

export const MAX_JOKERS = 2;

/** De jokerlijst na het zetten (of leegmaken) van één jokerplek. */
export function jokersNa(huidig: readonly string[], plek: number, nieuw: string | null): string[] {
  const plekken: (string | null)[] = Array.from({ length: MAX_JOKERS }, (_, i) => huidig[i] ?? null);
  if (plek >= 0 && plek < MAX_JOKERS) plekken[plek] = nieuw;
  const uit: string[] = [];
  for (const id of plekken) if (id && !uit.includes(id)) uit.push(id);
  return uit;
}

// ── Welke game ────────────────────────────────────────────────────────────

type GameLite = { id: string; year: number; game_type?: string | null };

/**
 * Voor welke game deze pagina is.
 *
 * useCurrentGame({ preferRegistration }) volgt de gekozen game alleen als die
 * open staat voor inschrijving, en valt anders terug op de game waarvoor je
 * nú kunt inschrijven. De koersbalk toont echter altijd de gekozen game.
 *
 * - bouwen: beide zeggen hetzelfde.
 * - keuze-dicht: je koos zelf de andere categorie van dit seizoen en die is
 *   niet open. Dan tonen we díe, gesloten; anders zegt de koersbalk
 *   "Vrouwen" terwijl je aan je Mannen-ploeg bouwt.
 * - volg: geen eigen keuze, of een andere koers. Zet de keuze op de game
 *   waarvoor je inschrijft, zodat de koersbalk meeloopt.
 */
export type TeambouwerDoel =
  | { soort: "bouwen"; gameId: string }
  | { soort: "keuze-dicht"; gameId: string }
  | { soort: "volg"; gameId: string };

export function teambouwerDoel(huidig: GameLite, gekozen: GameLite | null, expliciet: boolean): TeambouwerDoel {
  if (!gekozen || gekozen.id === huidig.id) return { soort: "bouwen", gameId: huidig.id };
  if (expliciet && isMeermarathonGame(gekozen.game_type) && gekozen.year === huidig.year) {
    return { soort: "keuze-dicht", gameId: gekozen.id };
  }
  return { soort: "volg", gameId: huidig.id };
}

export type SluitReden = "nog-niet-open" | "gesloten";

/** Sneak preview (open, concept) is "nog niet open"; al het andere is dicht. */
export function sluitReden(status: string | null | undefined): SluitReden {
  return isPreviewStatus(status) ? "nog-niet-open" : "gesloten";
}
