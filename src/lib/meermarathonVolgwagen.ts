import { meermarathonAfstandLabel, meermarathonStageLabel } from "@/lib/gameTypes";
import {
  mmDag,
  vandaagIso,
  type MeermarathonGameStatus,
  type MmFase,
  type MmWedstrijd,
} from "@/lib/meermarathonSeizoen";

/**
 * Volgwagen › Mijn ploeg voor de Meermarathon: de rekenkant zonder React of
 * database. De container haalt op, dit maakt er schermregels van.
 */

// ── Aftelling ─────────────────────────────────────────────────────────────

export type Aftelling =
  /** Tot de inschrijving sluit; tot die tijd mag de ploeg nog veranderen. */
  | { soort: "deadline"; dagen: number; uren: number; minuten: number }
  /** Hele kalenderdagen tot de wedstrijddag (2 of meer). */
  | { soort: "dagen"; dagen: number }
  | { soort: "morgen" }
  | { soort: "vandaag" }
  | { soort: "geen" };

const MINUUT = 60_000;
const DAG = 24 * 60 * MINUUT;

/** Kalenderdagen tussen twee YYYY-MM-DD's. In UTC: zomertijd verschuift geen UTC-middernacht. */
export function dagenTussen(vanIso: string, totIso: string): number {
  const utc = (iso: string) => {
    const [j, m, d] = iso.split("-").map(Number);
    return Date.UTC(j, m - 1, d);
  };
  return Math.round((utc(totIso) - utc(vanIso)) / DAG);
}

/**
 * Waarnaar de Volgwagen aftelt. De database kent geen starttijd, dus een
 * aftelling in uren en minuten kan alleen naar het sluitmoment van de
 * inschrijving. Is dat er niet (meer), dan tellen we in hele dagen af naar
 * de wedstrijddag.
 */
export function bouwAftelling(input: {
  nu: Date;
  deadline: Date | null;
  wijzigbaar: boolean;
  wedstrijdDatum: string | null;
}): Aftelling {
  const { nu, deadline, wijzigbaar, wedstrijdDatum } = input;
  if (wijzigbaar && deadline && deadline.getTime() > nu.getTime()) {
    // Naar boven afgerond: "00 min" terwijl er nog 40 seconden over zijn leest
    // als "al dicht".
    const totaal = Math.ceil((deadline.getTime() - nu.getTime()) / MINUUT);
    return {
      soort: "deadline",
      dagen: Math.floor(totaal / 1440),
      uren: Math.floor((totaal % 1440) / 60),
      minuten: totaal % 60,
    };
  }
  if (!wedstrijdDatum) return { soort: "geen" };
  const dagen = dagenTussen(vandaagIso(nu), wedstrijdDatum);
  if (dagen < 0) return { soort: "geen" };
  if (dagen === 0) return { soort: "vandaag" };
  if (dagen === 1) return { soort: "morgen" };
  return { soort: "dagen", dagen };
}

// ── Volgende wedstrijd ────────────────────────────────────────────────────

export type VolgendeKaart = {
  /** "Cup 3", of een melding als er niets gepland staat. */
  titel: string;
  /** "kunstijs · 80 ronden · za 14 nov" */
  detail: string;
  /** false: er staat geen wedstrijd meer op de kalender. */
  gepland: boolean;
  /** YYYY-MM-DD van de wedstrijd, voor de aftelling. */
  datum: string | null;
};

/** "kunstijs · 80 ronden · za 14 nov". Geen locatie of starttijd: die kent de database niet. */
export function wedstrijdDetail(w: Pick<MmWedstrijd, "ijs_type" | "aantal_rondes" | "distance_km" | "date">): string {
  const ondergrond = w.ijs_type === "natuurijs" ? "natuurijs" : w.ijs_type === "kunstijs" ? "kunstijs" : null;
  return [ondergrond, meermarathonAfstandLabel(w), w.date ? mmDag(w.date) : "datum volgt"]
    .filter(Boolean)
    .join(" · ");
}

export function volgendeKaart(status: Pick<MeermarathonGameStatus, "volgende" | "wedstrijden">): VolgendeKaart {
  const w = status.volgende;
  if (w) return { titel: meermarathonStageLabel(w), detail: wedstrijdDetail(w), gepland: true, datum: w.date };
  if (status.wedstrijden.length === 0) {
    return { titel: "Kalender volgt", detail: "De wedstrijden zijn nog niet bekend.", gepland: false, datum: null };
  }
  return { titel: "Seizoen voorbij", detail: "Alle wedstrijden van dit seizoen zijn gereden.", gepland: false, datum: null };
}

// ── Stand van de ploeg ────────────────────────────────────────────────────

/** Is er al een goedgekeurde uitslag? Daarvóór zijn punten en plaatsen nog niets waard. */
export function heeftUitslag(status: Pick<MeermarathonGameStatus, "wedstrijden">): boolean {
  return status.wedstrijden.some((w) => w.results_status === "approved");
}

/**
 * Seizoenspunten van de ploeg. Het klassement wint, zodat punten en plaats
 * uit dezelfde bron komen; anders de som over de goedgekeurde wedstrijden.
 * null zolang er niets gereden is.
 */
export function ploegPunten(
  status: Pick<MeermarathonGameStatus, "wedstrijden" | "klassement" | "puntenPerWedstrijd">,
): number | null {
  if (!heeftUitslag(status)) return null;
  if (status.klassement) return status.klassement.punten;
  return status.wedstrijden
    .filter((w) => w.results_status === "approved")
    .reduce((som, w) => som + (status.puntenPerWedstrijd.get(w.id) ?? 0), 0);
}

/**
 * Plaats binnen een subpoule. Gelijke punten delen een plaats: wie dezelfde
 * stand heeft, staat niet "achter" de ander omdat de database hem later gaf.
 */
export function subpouleRang(
  standen: { id: string; user_id: string; total_points: number | null }[],
  ledenUserIds: Iterable<string>,
  entryId: string,
): { rank: number; totaal: number } | null {
  const leden = new Set(ledenUserIds);
  const binnen = standen.filter((s) => leden.has(s.user_id));
  const mij = binnen.find((s) => s.id === entryId);
  if (!mij) return null;
  const punten = mij.total_points ?? 0;
  const voor = binnen.filter((s) => (s.total_points ?? 0) > punten).length;
  return { rank: voor + 1, totaal: binnen.length };
}

// ── De rijders ────────────────────────────────────────────────────────────

export type PloegRij =
  | {
      soort: "rijder";
      sleutel: string;
      /** Volgnummer in de ploeg (1–5), niet het startnummer. */
      nummer: number;
      naam: string;
      categorie: string;
      ploeg: string | null;
      /** null zolang er geen uitslag is. */
      punten: number | null;
      /** Afgemeld vóór het seizoen (riders.is_vervallen). */
      afgemeld: boolean;
    }
  | { soort: "open"; sleutel: string; nummer: number; categorie: string };

export type PloegRijder = { name: string; team: string | null; is_vervallen?: boolean | null };

/**
 * De ploeg in categorievolgorde, met een open plek voor elke categorie die
 * nog niet vol is. Jokers buiten de categorieën komen achteraan.
 */
export function bouwPloegRijen(input: {
  categorieen: { id: string; name: string; max_picks: number | null }[];
  picks: { category_id: string; rider_id: string }[];
  jokers?: string[];
  rijders: Map<string, PloegRijder>;
  /** Punten per rijder; null als er nog geen uitslag is. */
  punten: Map<string, number> | null;
}): PloegRij[] {
  const rijen: PloegRij[] = [];
  const gekozen = new Set<string>();
  const rijder = (id: string, categorie: string): PloegRij => {
    const r = input.rijders.get(id);
    return {
      soort: "rijder",
      sleutel: id,
      nummer: rijen.length + 1,
      naam: r?.name ?? "Onbekende rijder",
      categorie,
      ploeg: r?.team?.trim() || null,
      punten: input.punten ? input.punten.get(id) ?? 0 : null,
      afgemeld: Boolean(r?.is_vervallen),
    };
  };

  for (const cat of input.categorieen) {
    const ids = input.picks.filter((p) => p.category_id === cat.id).map((p) => p.rider_id);
    for (const id of ids) {
      gekozen.add(id);
      rijen.push(rijder(id, cat.name));
    }
    const open = Math.max(0, (cat.max_picks ?? 1) - ids.length);
    for (let i = 0; i < open; i++) {
      rijen.push({ soort: "open", sleutel: `${cat.id}-open-${i}`, nummer: rijen.length + 1, categorie: cat.name });
    }
  }
  for (const id of input.jokers ?? []) {
    if (gekozen.has(id)) continue;
    gekozen.add(id);
    rijen.push(rijder(id, "Joker"));
  }
  return rijen;
}

// ── Wat de speler nu kan doen ─────────────────────────────────────────────

/**
 * De knop onder de volgende wedstrijd. Er zijn geen wissels per wedstrijd:
 * de ploeg ligt vast zodra de game dichtgaat, dus daarna is er geen knop.
 */
export function ploegActie(input: { fase: MmFase; gekozen: number; vereist: number; wijzigbaar: boolean }): string | null {
  if (!input.wijzigbaar) return null;
  if (input.fase === "ingeschreven") return "Wissel rijders";
  if (input.fase === "niet-ingeschreven") return "Stel je ploeg samen";
  return input.vereist > 0 && input.gekozen >= input.vereist ? "Bevestig je ploeg" : "Maak je ploeg af";
}

/** Bijschrift boven de aftelling naar het sluitmoment. */
export function deadlineBijschrift(fase: MmFase): string {
  return fase === "ingeschreven" ? "Wissels sluiten over" : "Inschrijving sluit over";
}

/** De link naar de teambouwer, voor precies deze game. */
export function teambouwerHref(gameId: string): string {
  return `/team-samenstellen?game=${encodeURIComponent(gameId)}`;
}
