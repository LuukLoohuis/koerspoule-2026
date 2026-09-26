import { meermarathonAfstandLabel, meermarathonSeason, meermarathonStageLabel } from "@/lib/gameTypes";
import { mmDag, mmMoment, rangtekst, type MeermarathonGameStatus } from "@/lib/meermarathonSeizoen";

/**
 * "Mijn Meermarathon" bovenaan de Krant: wat er per game op de kaart staat.
 * Alle teksten komen hier uit echte velden; wat de database niet weet (baan,
 * starttijd, wanneer punten gaan tellen) zeggen we niet.
 */

type Status = MeermarathonGameStatus;

/** Doet de speler mee? Een halve ploeg telt ook: die hoort nog af te komen. */
export function doetMee(s: Status): boolean {
  return s.fase !== "niet-ingeschreven";
}

/** "Meermarathon Vrouwen"; een game zonder categorie heet gewoon "Meermarathon". */
export function gameNaam(s: Status): string {
  return s.categorie ? `Meermarathon ${s.label}` : "Meermarathon";
}

/**
 * Het sluitmoment, alleen zolang het nog komt. De database sluit op de
 * gamestatus, niet op registration_closes_at: een verlopen moment bij een
 * open game zou dus iets beloven wat niet meer klopt.
 */
export function actueleDeadline(s: Status, nu: Date): Date | null {
  return s.wijzigbaar && s.deadline && s.deadline.getTime() > nu.getTime() ? s.deadline : null;
}

/** De eerstvolgende deadline over alle games, voor de kop op desktop. */
export function volgendeDeadline(statussen: Status[], nu: Date): Date | null {
  return statussen.reduce<Date | null>((vroegst, s) => {
    const d = actueleDeadline(s, nu);
    return d && (!vroegst || d < vroegst) ? d : vroegst;
  }, null);
}

const TELWOORDEN = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf"];

/** 5 → "vijf"; boven de twaalf gewoon cijfers, zoals in een krant. */
export function telwoord(n: number): string {
  return TELWOORDEN[n] ?? String(n);
}

function rijders(n: number): string {
  return `${telwoord(n)} rijder${n === 1 ? "" : "s"}`;
}

/** "de Vrouwen", "de Vrouwen, de Mannen of allebei". */
function keuzelijst(statussen: Status[]): string {
  const namen = statussen.map((s) => `de ${s.label}`);
  if (namen.length <= 1) return namen[0] ?? "";
  if (namen.length === 2) return `${namen[0]}, ${namen[1]} of allebei`;
  return `${namen.slice(0, -1).join(", ")} of ${namen[namen.length - 1]}`;
}

export type MijnKop = {
  /** "Je rijdt mee in beide games", "Je rijdt mee bij de Vrouwen", … */
  zin: string;
  /** Alleen als je nergens meedoet en instappen nog kan: "Kies vijf rijders voor …". */
  uitnodiging: string | null;
  /** "2026-2027" */
  seizoen: string;
};

export function mijnKop(statussen: Status[]): MijnKop {
  const seizoen = statussen[0] ? meermarathonSeason(statussen[0].game.year) : "";
  const mee = statussen.filter(doetMee);
  if (mee.length >= 2) return { zin: "Je rijdt mee in beide games", uitnodiging: null, seizoen };
  if (mee.length === 1) return { zin: `Je rijdt mee bij de ${mee[0].label}`, uitnodiging: null, seizoen };

  const open = statussen.filter((s) => s.wijzigbaar);
  if (open.length === 0) return { zin: "De inschrijving is gesloten", uitnodiging: null, seizoen };

  // Het aantal rijders alleen noemen als elke open game hetzelfde vraagt.
  const aantallen = new Set(open.map((s) => s.vereist));
  const [aantal] = [...aantallen];
  const wat = aantallen.size === 1 && aantal > 0 ? rijders(aantal) : "je rijders";
  return {
    zin: statussen.length >= 2 ? "Twee games, één schaatswinter" : "Je rijdt nog niet mee",
    uitnodiging: `Kies ${wat} voor ${keuzelijst(open)}`,
    seizoen,
  };
}

// ── Kaart van een game waarin je meedoet ──────────────────────────────────

const AANTAL = new Intl.NumberFormat("nl-NL");

export type KlassementStat =
  | { soort: "stand"; rang: string; totaal: string; delta: number | null }
  | { soort: "leeg"; toelichting: string };

export function klassementStat(s: Status): KlassementStat {
  const uitslagen = s.wedstrijden.filter((w) => w.results_status === "approved").length;
  if (s.klassement) {
    // Na de eerste uitslag vergelijkt game_standings met een stand waarin
    // iedereen nog op nul stond; die "stijging" zegt niets.
    const delta = uitslagen >= 2 && s.klassement.delta !== 0 ? s.klassement.delta : null;
    return { soort: "stand", rang: rangtekst(s.klassement.rank), totaal: AANTAL.format(s.klassement.totaal), delta };
  }
  return { soort: "leeg", toelichting: uitslagen === 0 ? "na de eerste uitslag" : "nog niet bekend" };
}

/** Hoeveel rijders er nog ontbreken; 0 als de ploeg vol is maar nog niet bevestigd. */
export function ontbrekend(s: Status): number {
  return s.vereist > 0 ? Math.max(0, s.vereist - (s.entry?.picks ?? 0)) : 0;
}

export function ploegStat(s: Status): { waarde: string; sub: string } {
  const picks = s.entry?.picks ?? 0;
  if (s.vereist <= 0) return { waarde: String(picks), sub: "nog niet bevestigd" };
  const rest = ontbrekend(s);
  return {
    waarde: `${Math.min(picks, s.vereist)}/${s.vereist}`,
    sub: rest > 0 ? `nog ${rest} rijder${rest === 1 ? "" : "s"} kiezen` : "nog bevestigen",
  };
}

export function volgendeStat(s: Status, vandaag: string): { waarde: string; sub: string | null } {
  const w = s.volgende;
  if (!w) {
    return s.wedstrijden.length === 0
      ? { waarde: "Nog niet bekend", sub: "de kalender volgt" }
      : { waarde: "Geen", sub: "alle wedstrijden zijn gereden" };
  }
  const dag = w.date === vandaag ? "vandaag" : mmDag(w.date);
  return { waarde: meermarathonStageLabel(w), sub: [dag, meermarathonAfstandLabel(w)].filter(Boolean).join(" · ") };
}

/** Statuspil rechtsboven op de kaart. */
export function kaartPil(s: Status): { tekst: string; soort: "ingeschreven" | "let-op" } {
  if (s.fase === "ingeschreven") return { tekst: "Ingeschreven", soort: "ingeschreven" };
  return { tekst: ontbrekend(s) > 0 ? "Ploeg niet compleet" : "Nog niet bevestigd", soort: "let-op" };
}

/** Deadline-regel: `voor` + vet `moment` + `na`. */
export type DeadlineRegel = { toon: "neutraal" | "alert"; voor: string; moment: string | null; na: string };

export function deadlineRegel(s: Status, nu: Date): DeadlineRegel | null {
  const d = actueleDeadline(s, nu);
  if (s.fase === "ingeschreven") {
    // Wissels kunnen alleen tot de inschrijving sluit; daarna ligt de ploeg vast.
    return d ? { toon: "neutraal", voor: "Wissels tot ", moment: mmMoment(d), na: "" } : null;
  }
  if (s.fase !== "onvolledig") return null;
  if (!s.wijzigbaar) {
    // game_standings telt alleen ingediende ploegen.
    return { toon: "alert", voor: "De inschrijving is gesloten; deze ploeg is niet ingediend en telt niet mee", moment: null, na: "" };
  }
  const werk = ontbrekend(s) > 0 ? "Compleet" : "Bevestig je ploeg";
  return d
    ? { toon: "alert", voor: `${werk} vóór `, moment: mmMoment(d), na: ", anders tel je niet mee" }
    : { toon: "alert", voor: "Maak je ploeg compleet en bevestig hem, anders tel je niet mee", moment: null, na: "" };
}

export type KaartActie =
  | { soort: "volgwagen"; tekst: string }
  | { soort: "teambouwer"; tekst: string }
  | { soort: "klassement"; tekst: string };

/** Eén knop per kaart: wat je nu het beste kunt doen. */
export function kaartActie(s: Status): KaartActie {
  if (s.fase === "ingeschreven") return { soort: "volgwagen", tekst: "Naar je Volgwagen" };
  if (!s.wijzigbaar) return { soort: "klassement", tekst: "Bekijk het klassement" };
  return { soort: "teambouwer", tekst: ontbrekend(s) > 0 ? "Maak je ploeg af" : "Bevestig je ploeg" };
}

// ── Uitnodiging voor een game waarin je (nog) niet meedoet ────────────────

export type Uitnodiging = {
  titel: string;
  tekst: string;
  actie: KaartActie;
  /** "Eerst rondkijken" heeft alleen zin zolang je nog kunt instappen. */
  rondkijken: boolean;
};

/** `ookAl`: de speler doet al mee in een andere game van dit seizoen. */
export function uitnodiging(s: Status, ookAl: boolean, nu: Date): Uitnodiging {
  if (!s.wijzigbaar) {
    const klaar = String(s.game.status).toLowerCase() === "finished";
    return {
      titel: `Kijk mee bij de ${s.label}`,
      tekst: klaar
        ? "Het seizoen zit erop; inschrijven kan niet meer. Het klassement blijft te bekijken."
        : "De inschrijving is gesloten. Het klassement en de uitslagen kun je gewoon volgen.",
      actie: { soort: "klassement", tekst: "Bekijk het klassement" },
      rondkijken: false,
    };
  }
  const d = actueleDeadline(s, nu);
  const ploeg = s.vereist > 0 ? `Eigen ploeg van ${rijders(s.vereist)}, eigen klassement.` : "Eigen ploeg, eigen klassement.";
  const instappen = d ? `Instappen kan tot ${mmMoment(d)}.` : "Instappen kan zolang de inschrijving open is.";
  return {
    titel: ookAl ? `Ook meedoen met de ${s.label}?` : `Doe mee bij de ${s.label}`,
    tekst: `${ploeg} ${instappen}`,
    actie: {
      soort: "teambouwer",
      tekst: ookAl ? `Schrijf je in voor de ${s.label}` : `Stel je ${s.label}-ploeg samen`,
    },
    rondkijken: true,
  };
}

/**
 * Voor welke game de kalender punten en "Volgende" toont: de gekozen game als
 * je daarin meedoet, anders een game waarin je wél meedoet. Zo staan er
 * altijd je eigen punten, ook als de keuze nog op de andere game staat.
 */
export function kalenderGameId(statussen: Status[], gekozenGameId: string | null): string | null {
  const gekozen = statussen.find((s) => s.game.id === gekozenGameId) ?? null;
  if (gekozen && doetMee(gekozen)) return gekozen.game.id;
  return statussen.find(doetMee)?.game.id ?? gekozen?.game.id ?? statussen[0]?.game.id ?? null;
}
