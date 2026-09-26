import {
  isMeermarathonGame,
  meermarathonCategorieLabel,
  meermarathonCategorieRang,
  parseMeermarathonCategorie,
  type MeermarathonCategorie,
} from "@/lib/gameTypes";

/**
 * Meermarathon per seizoen: twee losse games (Vrouwen en Mannen) die de
 * speler naast elkaar ziet. Hier staat de logica zonder React of database,
 * zodat de koersbalk en "Mijn Meermarathon" hetzelfde zeggen.
 */

export type MmGameLite = {
  id: string;
  name: string;
  year: number;
  status: string;
  game_type: string | null;
  categorie?: string | null;
  registration_closes_at?: string | null;
};

export type MmWedstrijd = {
  id: string;
  game_id: string;
  stage_number: number;
  name: string | null;
  /** Datum zonder tijd (YYYY-MM-DD); de database kent geen starttijd. */
  date: string | null;
  status: string | null;
  is_gc: boolean;
  results_status: string | null;
  ijs_type: string | null;
  wedstrijd_type: string | null;
  aantal_rondes: number | null;
  distance_km: number | null;
};

export type MmEntry = {
  id: string;
  status: "draft" | "submitted" | string;
  teamName: string | null;
  picks: number;
};

/**
 * - ingeschreven: ploeg ingediend.
 * - onvolledig: begonnen, nog niet ingediend.
 * - niet-ingeschreven: geen entry, of een lege conceptploeg. De teambouwer
 *   maakt bij een bezoek meteen een lege entry aan; dat is nog geen keuze.
 */
export type MmFase = "ingeschreven" | "onvolledig" | "niet-ingeschreven";

export type MmKlassement = { rank: number; totaal: number; delta: number; punten: number };

export type MeermarathonGameStatus = {
  game: MmGameLite;
  categorie: MeermarathonCategorie | null;
  /** "Vrouwen", "Mannen", of "Meermarathon" zonder categorie. */
  label: string;
  entry: MmEntry | null;
  /** Aantal rijders dat een complete ploeg telt (som van max_picks). */
  vereist: number;
  fase: MmFase;
  wedstrijden: MmWedstrijd[];
  volgende: MmWedstrijd | null;
  klassement: MmKlassement | null;
  /** Punten van jouw ploeg per wedstrijd (stage_id → punten). */
  puntenPerWedstrijd: Map<string, number>;
  /** Mag de ploeg nog veranderen? De database sluit bij locked/live/finished. */
  wijzigbaar: boolean;
  /** Tot wanneer, als de beheerder een sluitmoment heeft gezet. */
  deadline: Date | null;
};

const GESLOTEN = ["locked", "live", "finished", "closed"];

export function isWijzigbaar(status: string | null | undefined): boolean {
  return !GESLOTEN.includes(String(status ?? "").toLowerCase());
}

/** De Meermarathon-games van één seizoen, vrouwen eerst. */
export function meermarathonSeizoenGames<T extends MmGameLite>(games: T[], year: number): T[] {
  return games
    .filter((g) => isMeermarathonGame(g.game_type) && g.year === year)
    .sort((a, b) => meermarathonCategorieRang(a.categorie) - meermarathonCategorieRang(b.categorie));
}

/**
 * Welk seizoen de speler bedoelt: dat van de gekozen game als het een
 * Meermarathon is, anders het nieuwste Meermarathon-seizoen.
 */
export function meermarathonSeizoenJaar(games: MmGameLite[], gekozen?: MmGameLite | null): number | null {
  if (gekozen && isMeermarathonGame(gekozen.game_type)) return gekozen.year;
  const jaren = games.filter((g) => isMeermarathonGame(g.game_type)).map((g) => g.year);
  return jaren.length ? Math.max(...jaren) : null;
}

export function mmFase(entry: MmEntry | null): MmFase {
  if (!entry) return "niet-ingeschreven";
  if (entry.status === "submitted") return "ingeschreven";
  return entry.picks > 0 ? "onvolledig" : "niet-ingeschreven";
}

/** Vandaag als YYYY-MM-DD in lokale tijd; stages.date is ook lokaal bedoeld. */
export function vandaagIso(nu: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${nu.getFullYear()}-${pad(nu.getMonth() + 1)}-${pad(nu.getDate())}`;
}

/**
 * De eerstvolgende wedstrijd: vandaag of later. Zonder datum telt de eerste
 * wedstrijd zonder goedgekeurde uitslag.
 */
export function volgendeWedstrijd(wedstrijden: MmWedstrijd[], vandaag: string): MmWedstrijd | null {
  const echt = wedstrijden.filter((w) => !w.is_gc).sort((a, b) => a.stage_number - b.stage_number);
  const gedateerd = echt.find((w) => w.date != null && w.date >= vandaag);
  if (gedateerd) return gedateerd;
  return echt.find((w) => w.date == null && w.results_status !== "approved") ?? null;
}

export function bouwGameStatus(input: {
  game: MmGameLite;
  entry: MmEntry | null;
  vereist: number;
  wedstrijden: MmWedstrijd[];
  klassement: MmKlassement | null;
  puntenPerWedstrijd: Map<string, number>;
  vandaag: string;
}): MeermarathonGameStatus {
  const categorie = parseMeermarathonCategorie(input.game.categorie);
  const wijzigbaar = isWijzigbaar(input.game.status);
  const sluit = input.game.registration_closes_at ? new Date(input.game.registration_closes_at) : null;
  return {
    game: input.game,
    categorie,
    label: meermarathonCategorieLabel(categorie) ?? "Meermarathon",
    entry: input.entry,
    vereist: input.vereist,
    fase: mmFase(input.entry),
    wedstrijden: input.wedstrijden.filter((w) => !w.is_gc).sort((a, b) => a.stage_number - b.stage_number),
    volgende: volgendeWedstrijd(input.wedstrijden, input.vandaag),
    klassement: input.klassement,
    puntenPerWedstrijd: input.puntenPerWedstrijd,
    wijzigbaar,
    deadline: wijzigbaar && sluit && !Number.isNaN(sluit.getTime()) ? sluit : null,
  };
}

export type KoersbalkPil = {
  tekst: string;
  soort: "live" | "vandaag" | "ingeschreven" | "let-op" | "open" | "neutraal";
};

/** Het statuslabel onder een segment van de koersbalk. */
export function koersbalkPil(s: MeermarathonGameStatus, vandaag: string): KoersbalkPil {
  const vandaagWedstrijd = s.volgende?.date === vandaag;
  if (String(s.game.status).toLowerCase() === "live" && vandaagWedstrijd) return { tekst: "Live", soort: "live" };
  if (vandaagWedstrijd && s.fase !== "niet-ingeschreven") return { tekst: "Vandaag", soort: "vandaag" };
  if (s.fase === "ingeschreven") return { tekst: "Ingeschreven", soort: "ingeschreven" };
  if (s.fase === "onvolledig") {
    return s.vereist > 0
      ? { tekst: `Ploeg ${Math.min(s.entry?.picks ?? 0, s.vereist)}/${s.vereist}`, soort: "let-op" }
      : { tekst: "Ploeg niet compleet", soort: "let-op" };
  }
  return s.wijzigbaar ? { tekst: "Inschrijving open", soort: "open" } : { tekst: "Meekijken", soort: "neutraal" };
}

// ── Opmaak ────────────────────────────────────────────────────────────────

const DAG = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const KORT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
const TIJD = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" });

/** Middag als anker, zodat een datum nooit door een tijdzone een dag opschuift. */
function alsDatum(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

const zonderPunt = (s: string) => s.replace(/\./g, "");

/** "za 14 nov" */
export function mmDag(iso: string | null): string {
  return iso ? zonderPunt(DAG.format(alsDatum(iso))) : "n.t.b.";
}

/** "14 nov" */
export function mmKorteDatum(iso: string | null): string {
  return iso ? zonderPunt(KORT.format(alsDatum(iso))) : "n.t.b.";
}

/** "vr 13 nov, 23:59" */
export function mmMoment(d: Date): string {
  return `${zonderPunt(DAG.format(d))}, ${TIJD.format(d)}`;
}

/** "12e" */
export function rangtekst(n: number): string {
  return `${n}e`;
}
