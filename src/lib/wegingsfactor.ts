import type { PointsSchema } from "@/lib/liveMarathon";
import { meermarathonStageLabel, wedstrijdTypeVan, WEDSTRIJD_TYPES } from "@/lib/gameTypes";

/**
 * Meermarathon: hoe zwaar een wedstrijd telt.
 *
 * De beheerder geeft per wedstrijd een factor op (`stages.wegingsfactor`,
 * standaard 1); een Grand Prix die dubbel telt heeft 2. Een rijder scoort de
 * schemapunten maal die factor, per rijder afgerond -- precies zoals
 * calculate_stage_scores in de database. Waar de app zelf punten uit het
 * schema afleidt (live, de uitslag per rijder, de ploegvergelijking) volgt hij
 * dezelfde regel, anders telt het scherm iets anders op dan de stand.
 *
 * Alleen de wedstrijdpunten wegen; de pronostiek telt zoals hij telde.
 */

/** Hoogste factor die het beheer accepteert; dezelfde grens als de database. */
export const WEGING_MAX = 10;

/** De factor van een wedstrijd; 1 zonder (geldige) waarde. */
export function wegingVan(stage: { wegingsfactor?: number | string | null } | null | undefined): number {
  const n = Number(stage?.wegingsfactor ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Schemapunten maal de factor, afgerond zoals Postgres `round()` op numeric:
 * x,5 gaat van nul af. De factor gaat eerst naar hele honderdsten (zo staat
 * hij ook in de database), zodat bv. 30 × 1,15 niet door de binaire breuk op
 * 34,4999… uitkomt maar op 34,5 -- en dus op 35, net als in de stand.
 */
export function gewogenPunten(punten: number, weging: number): number {
  const exact = (punten * Math.round(weging * 100)) / 100;
  return Math.sign(exact) * Math.round(Math.abs(exact));
}

/** "2", "1,5": de factor als getal met een komma, zoals in het invoerveld. */
export function wegingGetal(weging: number): string {
  return String(Math.round(weging * 100) / 100).replace(".", ",");
}

/** "×2", "×1,5": de factor zoals hij in de app staat. */
export function wegingLabel(weging: number): string {
  return `×${wegingGetal(weging)}`;
}

/** Korte uitleg naast de naam van een wedstrijd; null als hij gewoon telt. */
export function wegingUitleg(weging: number): string | null {
  if (weging === 1) return null;
  if (weging === 2) return "telt dubbel";
  return `telt ${wegingLabel(weging)}`;
}

/**
 * Invoer uit het beheer: "2", "1,5" of "1.5". Null als het geen geldige
 * factor is (leeg, 0 of minder, boven het maximum).
 */
export function leesWeging(invoer: string): number | null {
  const tekst = invoer.trim().replace(",", ".");
  if (tekst === "") return null;
  const n = Number(tekst);
  if (!Number.isFinite(n) || n > WEGING_MAX) return null;
  const afgerond = Math.round(n * 100) / 100;
  return afgerond > 0 ? afgerond : null;
}

/** De factor per wedstrijd-id, om uitslagregels (met stage_id) te wegen. */
export function wegingPerWedstrijd(
  stages: ReadonlyArray<{ id: string; wegingsfactor?: number | string | null }>,
): Map<string, number> {
  return new Map(stages.map((s) => [s.id, wegingVan(s)]));
}

/** Het puntenschema van één wedstrijd met de factor er al in, voor de live projectie. */
export function schemaMetWeging(schema: PointsSchema, weging: number): PointsSchema {
  if (weging === 1) return schema;
  return new Map([...schema].map(([plek, punten]) => [plek, gewogenPunten(punten, weging)]));
}

/** "Dubbel", "Anderhalf", "Gewoon", "Driekwart", "Half": de weging in één woord. */
export function wegingWoord(weging: number): string {
  const woorden: Record<string, string> = {
    "3": "Driedubbel",
    "2": "Dubbel",
    "1.5": "Anderhalf",
    "1": "Gewoon",
    "0.75": "Driekwart",
    "0.5": "Half",
    "0.25": "Kwart",
  };
  return woorden[String(Math.round(weging * 100) / 100)] ?? (weging > 1 ? "Zwaarder" : "Lichter");
}

/** [1, 2, …, 12] → "1 t/m 12"; [2, 4, 5] → "2, 4 en 5". Pas vanaf drie op een rij een reeks. */
export function nummerReeks(nummers: number[]): string {
  const uniek = [...new Set(nummers)].sort((a, b) => a - b);
  const delen: string[] = [];
  for (let i = 0; i < uniek.length; ) {
    let j = i;
    while (j + 1 < uniek.length && uniek[j + 1] === uniek[j] + 1) j += 1;
    if (j - i >= 2) delen.push(`${uniek[i]} t/m ${uniek[j]}`);
    else for (let k = i; k <= j; k += 1) delen.push(String(uniek[k]));
    i = j + 1;
  }
  return delen.length <= 1 ? delen.join("") : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
}

type WedstrijdBron = {
  stage_number: number;
  name?: string | null;
  wedstrijd_type?: string | null;
  ijs_type?: string | null;
  is_gc?: boolean | null;
  wegingsfactor?: number | string | null;
};

export type WegingGroep = {
  weging: number;
  /** "Cup 1 t/m 12", "Grand Prix 2, 4 en 5", "ONK": de wedstrijden met deze weging, samengevat. */
  wedstrijden: string[];
  /** De eerste wedstrijd met deze weging, voluit: voor een rekenvoorbeeld ("ONK gewonnen?"). */
  voorbeeld: string;
};

/** Een genummerde naam: "Cup 1 Amsterdam", "Vierdaagse dag 3 Amsterdam", "Grand Prix 2". */
const GENUMMERD = /^(.+?)\s+(\d+)(?:\s+(.*))?$/;

/** "grand prix" → "Grand Prix": de soort zoals de app hem schrijft; iets anders krijgt alleen een hoofdletter. */
function netjesPrefix(prefix: string): string {
  const soort = WEDSTRIJD_TYPES.find((w) => w.label.toLowerCase() === prefix.toLowerCase());
  return soort ? soort.label : prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

/** "grand prix 5" → "Grand Prix 5", "Grand prix Finale" → "Grand Prix Finale": in het beheer wisselt de spelling. */
function netjesSoort(label: string): string {
  const klein = label.toLowerCase();
  const soort = WEDSTRIJD_TYPES.find((w) => klein === w.label.toLowerCase() || klein.startsWith(`${w.label.toLowerCase()} `));
  return soort ? soort.label + label.slice(soort.label.length) : label;
}

/**
 * De wedstrijden van één weging, kort: "Cup 1 Amsterdam" t/m "Cup 12 Groningen"
 * worden "Cup 1 t/m 12" (de plaatsen vallen weg), één losse genummerde
 * wedstrijd houdt zijn plaats ("Vierdaagse dag 3 Amsterdam"), een titel heet
 * naar zijn soort ("ONK", "NK") en de rest blijft zoals hij heet.
 */
/** Hoe een wedstrijd in het reglement heet: een titel naar zijn soort, de rest met rechtgetrokken spelling. */
function reglementNaam(s: WedstrijdBron): { label: string; titel: boolean } {
  const soort = wedstrijdTypeVan(s);
  const titel = soort === "onk" || soort === "nk";
  return {
    label: titel ? WEDSTRIJD_TYPES.find((w) => w.value === soort)!.label : netjesSoort(meermarathonStageLabel(s)),
    titel,
  };
}

function samenvatten(wedstrijden: WedstrijdBron[]): string[] {
  type Item = { label: string; sleutel?: string; prefix?: string; nummers: number[]; rest?: string };
  const items: Item[] = [];
  for (const s of wedstrijden) {
    const { label, titel } = reglementNaam(s);
    const m = titel ? null : GENUMMERD.exec(label);
    if (!m) {
      if (!items.some((i) => !i.sleutel && i.label === label)) items.push({ label, nummers: [] });
      continue;
    }
    const sleutel = m[1].toLowerCase();
    const bestaand = items.find((i) => i.sleutel === sleutel);
    if (bestaand) bestaand.nummers.push(Number(m[2]));
    else items.push({ label, sleutel, prefix: netjesPrefix(m[1]), nummers: [Number(m[2])], rest: m[3] });
  }
  return items.map((i) => {
    if (!i.sleutel) return i.label;
    if (i.nummers.length === 1) return [i.prefix, i.nummers[0], i.rest].filter(Boolean).join(" ");
    return `${i.prefix} ${nummerReeks(i.nummers)}`;
  });
}

/**
 * De weging per factor, zwaarste eerst, voor het koersreglement: ×2 "ONK,
 * Grand Prix Finale", ×1 "Cup 1 t/m 12". Het eindklassement (GC) is geen
 * wedstrijd en valt weg.
 */
export function wegingPerFactor(stages: ReadonlyArray<WedstrijdBron>): WegingGroep[] {
  const perFactor = new Map<number, WedstrijdBron[]>();
  for (const s of [...stages].filter((s) => !s.is_gc).sort((a, b) => a.stage_number - b.stage_number)) {
    const weging = wegingVan(s);
    perFactor.set(weging, [...(perFactor.get(weging) ?? []), s]);
  }
  return [...perFactor.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weging, groep]) => ({ weging, wedstrijden: samenvatten(groep), voorbeeld: reglementNaam(groep[0]).label }));
}
