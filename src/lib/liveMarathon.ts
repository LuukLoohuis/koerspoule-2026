/**
 * Meermarathon — live uitslagen van livemarathon.schaatsen.nl.
 *
 * De bron is een Meteor-app: de HTML is een leeg omhulsel en alle data loopt
 * over DDP/WebSocket. Een poller haalt de documenten op; dit bestand bevat de
 * pure logica die er een leesbare koerssituatie van maakt. Geen netwerk, geen
 * React — zodat het te testen is en zowel server- als clientzijde bruikbaar.
 *
 * Publicaties: races.inTrack / stand.inTrack / premies.inTrack, elk met
 * { trackId }. Zie supabase/migrations/*_meermarathon_live_tracking.sql.
 */

/** Ruwe `stand`-document zoals de bron het levert (deels string, deels number). */
export type RawStandDoc = {
  Beennummer?: string | number | null;
  Shownummer?: string | number | null;
  Relatienummer?: string | number | null;
  Naam?: string | null;
  Sponsor?: string | null;
  AantalRonden?: number | string | null;
  AantalRondenKop?: number | string | null;
  Meter?: number | string | null;
  TijdSort?: number | string | null;
  Tijd?: string | null;
  Lap?: string | null;
  Sectie?: string | null;
  Fastest?: string | null;
  Groep?: number | string | null;
  Punten?: number | string | null;
  Finished?: boolean | null;
};

/** Ruwe `races`-document: één per baan, met de koersstatus. */
export type RawRaceDoc = {
  TotaalAantalRonden?: string | number | null;
  RondeLengte?: string | number | null;
  RondebordRonden?: string | number | null;
  NrRijders?: string | number | null;
  NrRijdersActief?: string | number | null;
  MaxRonden?: string | number | null;
  PelotonRonden?: string | number | null;
  RaceTime?: string | null;
  LapTime?: string | null;
  GemiddeldeRondeTijd?: string | null;
  GemiddeldeRondeSnelheid?: string | null;
  SnelsteRondeTijd?: string | null;
  SnelsteRondeRijderNaam?: string | null;
  SnelsteRondeBeennummer?: string | null;
  SnelsteRondeNr?: string | number | null;
  SnelsteRondeSnelheid?: string | null;
  HuidigeTijd?: string | null;
};

/** Ruwe `premies`-document: Nr1..Nr10 + Naam1..Naam10 naast elkaar. */
export type RawPremieDoc = {
  Volgnr?: number | string | null;
  Ronde?: number | string | null;
  AantalRonden?: number | string | null;
  Vastgesteld?: boolean | null;
} & Record<string, unknown>;

export type LiveRider = {
  beennummer: string;
  shownummer: string | null;
  relatienummer: string | null;
  naam: string;
  sponsor: string | null;
  aantalRonden: number;
  aantalRondenKop: number | null;
  meter: number | null;
  tijdSort: number | null;
  tijd: string | null;
  lap: string | null;
  sectie: string | null;
  fastest: string | null;
  groep: number | null;
  punten: number | null;
  finished: boolean;
};

export type LiveRaceState = {
  totaalRonden: number | null;
  rondeLengte: number | null;
  rondenTeGaan: number | null;
  aantalRijders: number | null;
  aantalActief: number | null;
  maxRonden: number | null;
  pelotonRonden: number | null;
  raceTime: string | null;
  lapTime: string | null;
  gemRondeTijd: string | null;
  gemRondeSnelheid: string | null;
  snelsteRondeTijd: string | null;
  snelsteRondeNaam: string | null;
  snelsteRondeBeennummer: string | null;
  snelsteRondeNr: number | null;
  snelsteRondeSnelheid: string | null;
  bronTijd: string | null;
};

export type LivePremie = {
  volgnr: number;
  ronde: number | null;
  aantalRonden: number | null;
  vastgesteld: boolean;
  posities: { positie: number; beennummer: string; naam: string }[];
};

// ── Normalisatie ───────────────────────────────────────────────────────────

/** De bron mengt strings en getallen ("21", 17). Alles wat leeg is → null. */
export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function normalizeRider(doc: RawStandDoc): LiveRider | null {
  const beennummer = toStr(doc.Beennummer);
  const naam = toStr(doc.Naam);
  if (!beennummer || !naam) return null;
  return {
    beennummer,
    shownummer: toStr(doc.Shownummer),
    relatienummer: toStr(doc.Relatienummer),
    naam,
    sponsor: toStr(doc.Sponsor),
    aantalRonden: toNum(doc.AantalRonden) ?? 0,
    aantalRondenKop: toNum(doc.AantalRondenKop),
    meter: toNum(doc.Meter),
    tijdSort: toNum(doc.TijdSort),
    tijd: toStr(doc.Tijd),
    lap: toStr(doc.Lap),
    sectie: toStr(doc.Sectie),
    fastest: toStr(doc.Fastest),
    groep: toNum(doc.Groep),
    punten: toNum(doc.Punten),
    finished: doc.Finished === true,
  };
}

export function normalizeRace(doc: RawRaceDoc): LiveRaceState {
  return {
    totaalRonden: toNum(doc.TotaalAantalRonden),
    rondeLengte: toNum(doc.RondeLengte),
    rondenTeGaan: toNum(doc.RondebordRonden),
    aantalRijders: toNum(doc.NrRijders),
    aantalActief: toNum(doc.NrRijdersActief),
    maxRonden: toNum(doc.MaxRonden),
    pelotonRonden: toNum(doc.PelotonRonden),
    raceTime: toStr(doc.RaceTime),
    lapTime: toStr(doc.LapTime),
    gemRondeTijd: toStr(doc.GemiddeldeRondeTijd),
    gemRondeSnelheid: toStr(doc.GemiddeldeRondeSnelheid),
    snelsteRondeTijd: toStr(doc.SnelsteRondeTijd),
    snelsteRondeNaam: toStr(doc.SnelsteRondeRijderNaam),
    snelsteRondeBeennummer: toStr(doc.SnelsteRondeBeennummer),
    snelsteRondeNr: toNum(doc.SnelsteRondeNr),
    snelsteRondeSnelheid: toStr(doc.SnelsteRondeSnelheid),
    bronTijd: toStr(doc.HuidigeTijd),
  };
}

/** Nr1..Nr10 / Naam1..Naam10 platslaan tot een lijst; lege plekken vervallen. */
export function normalizePremie(doc: RawPremieDoc): LivePremie | null {
  const volgnr = toNum(doc.Volgnr);
  if (volgnr === null) return null;
  const posities: LivePremie["posities"] = [];
  for (let i = 1; i <= 10; i++) {
    const beennummer = toStr(doc[`Nr${i}`]);
    if (!beennummer) continue;
    posities.push({ positie: i, beennummer, naam: toStr(doc[`Naam${i}`]) ?? "" });
  }
  return {
    volgnr,
    ronde: toNum(doc.Ronde),
    aantalRonden: toNum(doc.AantalRonden),
    vastgesteld: doc.Vastgesteld === true,
    posities,
  };
}

// ── Klassement ─────────────────────────────────────────────────────────────

/**
 * Sorteer zoals de bron dat doet: eerst op afgelegde ronden, dan op tijd.
 * Sorteren op de geformatteerde `tijd` gaat mis zodra iemand ronden achterligt —
 * die heeft een lágere kloktijd maar staat lager in het klassement.
 */
export function sortStandings(riders: LiveRider[]): LiveRider[] {
  return [...riders].sort((a, b) => {
    if (b.aantalRonden !== a.aantalRonden) return b.aantalRonden - a.aantalRonden;
    const at = a.tijdSort ?? Number.MAX_SAFE_INTEGER;
    const bt = b.tijdSort ?? Number.MAX_SAFE_INTEGER;
    if (at !== bt) return at - bt;
    return a.naam.localeCompare(b.naam, "nl");
  });
}

/** Het peloton is de grootste groep rijders op dezelfde ronde: onze referentie. */
export function pelotonLaps(riders: LiveRider[]): number {
  if (riders.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const r of riders) counts.set(r.aantalRonden, (counts.get(r.aantalRonden) ?? 0) + 1);
  let best = riders[0].aantalRonden;
  let bestCount = -1;
  for (const [laps, n] of counts) {
    // Gelijk aantal? Dan wint de laagste ronde — dat is het peloton, niet de kop.
    if (n > bestCount || (n === bestCount && laps < best)) {
      best = laps;
      bestCount = n;
    }
  }
  return best;
}

export type RiderPlacing = {
  rider: LiveRider;
  positie: number;
  /** Ronden voor (+) of achter (−) het peloton. */
  tier: number;
  /** Seconden achterstand op de kop van de eigen groep. */
  gapInGroup: number;
};

export type LiveGroup = {
  index: number;
  tier: number;
  leden: RiderPlacing[];
  /** Seconden tussen deze groep en de groep ervóór; null bij de kopgroep of
   *  wanneer het verschil een hele ronde is. */
  gapToPrev: number | null;
};

export const GAP_THRESHOLD_S = 4;

/**
 * Deel het veld op in groepen. Een breuk ontstaat bij een ronde-verschil, of —
 * binnen dezelfde ronde — bij een tijdgat vanaf `gapThreshold` seconden.
 * Ronden wegen zwaarder dan tijd: wie een ronde voorligt staat altijd hoger.
 */
export function buildGroups(
  riders: LiveRider[],
  gapThreshold = GAP_THRESHOLD_S,
): LiveGroup[] {
  const sorted = sortStandings(riders);
  if (sorted.length === 0) return [];
  const peloton = pelotonLaps(sorted);

  const groups: LiveGroup[] = [];
  let current: RiderPlacing[] = [];
  let groupLeadTijd: number | null = null;

  const secondsBetween = (a: number | null, b: number | null): number | null =>
    a === null || b === null ? null : (a - b) / 1000;

  sorted.forEach((rider, i) => {
    const prev = sorted[i - 1];
    const lapChange = prev ? rider.aantalRonden !== prev.aantalRonden : false;
    const timeGap = prev ? secondsBetween(rider.tijdSort, prev.tijdSort) : null;
    const timeBreak = !lapChange && timeGap !== null && timeGap >= gapThreshold;

    if (prev && (lapChange || timeBreak) && current.length > 0) {
      groups.push({
        index: groups.length,
        tier: current[0].tier,
        leden: current,
        gapToPrev: null, // hieronder ingevuld
      });
      current = [];
      groupLeadTijd = null;
    }

    if (groupLeadTijd === null) groupLeadTijd = rider.tijdSort;
    current.push({
      rider,
      positie: i + 1,
      tier: rider.aantalRonden - peloton,
      gapInGroup: secondsBetween(rider.tijdSort, groupLeadTijd) ?? 0,
    });

    if (i === sorted.length - 1) {
      groups.push({
        index: groups.length,
        tier: current[0].tier,
        leden: current,
        gapToPrev: null,
      });
    }
  });

  // Gat naar de vorige groep: alleen binnen dezelfde ronde is een tijd zinvol.
  for (let i = 1; i < groups.length; i++) {
    const prev = groups[i - 1];
    const cur = groups[i];
    const prevLast = prev.leden[prev.leden.length - 1].rider;
    const curFirst = cur.leden[0].rider;
    cur.gapToPrev =
      prevLast.aantalRonden === curFirst.aantalRonden
        ? secondsBetween(curFirst.tijdSort, prevLast.tijdSort)
        : null;
  }
  return groups;
}

// ── Virtuele punten ────────────────────────────────────────────────────────

export type PointsSchema = Map<number, number>;

export type ProjectedRider = {
  rider: LiveRider;
  positie: number;
  basis: number;
  isJoker: boolean;
  punten: number;
};

export type Projection = {
  rijders: ProjectedRider[];
  ritPunten: number;
};

/**
 * Voorlopige punten voor de eigen ploeg, met exact de regel uit
 * calculate_stage_scores: alleen plek 1 t/m 20 scoort, en een joker telt maal
 * `jokerMultiplier`. Zo kan de live projectie niet afwijken van wat er bij het
 * fiatteren uitkomt.
 */
export function projectPoints(
  placings: RiderPlacing[],
  opts: {
    schema: PointsSchema;
    mineRiderIds: Set<string>;
    jokerRiderIds?: Set<string>;
    riderIdByBeennummer: Map<string, string>;
    jokerMultiplier?: number;
  },
): Projection {
  const mult = opts.jokerMultiplier ?? 2;
  const rijders: ProjectedRider[] = [];

  for (const p of placings) {
    const riderId = opts.riderIdByBeennummer.get(p.rider.beennummer);
    if (!riderId || !opts.mineRiderIds.has(riderId)) continue;
    // DNF/uitgevallen rijders scoren niet, net als in de scorer.
    const basis = p.positie >= 1 && p.positie <= 20 ? (opts.schema.get(p.positie) ?? 0) : 0;
    const isJoker = opts.jokerRiderIds?.has(riderId) ?? false;
    rijders.push({
      rider: p.rider,
      positie: p.positie,
      basis,
      isJoker,
      punten: basis * (isJoker ? mult : 1),
    });
  }

  rijders.sort((a, b) => a.positie - b.positie);
  return { rijders, ritPunten: rijders.reduce((s, r) => s + r.punten, 0) };
}

// ── Rennerkoppeling ────────────────────────────────────────────────────────

/** Diakrieten weg, kleine letters, dubbele spaties samen — voor naam-fallback. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchCandidate = {
  id: string;
  name: string;
  knsbRelatienummer?: string | null;
};

/**
 * Koppel een live rijder aan een renner uit de game. Het KNSB-relatienummer is
 * leidend; alleen als dat ontbreekt vallen we terug op de genormaliseerde naam.
 * Beennummers zijn bewust géén sleutel: die wisselen per wedstrijd.
 */
export function matchRider(
  live: LiveRider,
  candidates: MatchCandidate[],
): MatchCandidate | null {
  if (live.relatienummer) {
    const byNumber = candidates.find(
      (c) => c.knsbRelatienummer && c.knsbRelatienummer === live.relatienummer,
    );
    if (byNumber) return byNumber;
  }
  const target = normalizeName(live.naam);
  const byName = candidates.filter((c) => normalizeName(c.name) === target);
  // Twee renners met dezelfde naam: dan liever niets dan een gokje.
  return byName.length === 1 ? byName[0] : null;
}

/**
 * Naam van een groep, afgeleid uit zijn positie ten opzichte van het peloton.
 *
 * Eerder werden de namen op index toegekend: groep 0 heette altijd "Kopgroep",
 * groep 1 altijd "Eerste achtervolgers". Rijdt het veld samen met één groepje
 * eraf, dan heette het peloton dus "Eerste achtervolgers" -- en bij één groep
 * heette het hele veld "Kopgroep".
 *
 * Het peloton is de grootste groep; dat is ook hoe de wedstrijdleiding het
 * bepaalt. Alles ervoor is kop, alles erna is gelost. Namen die niet van
 * toepassing zijn komen zo vanzelf niet voor.
 */
export function pelotonIndex(groups: LiveGroup[]): number {
  let beste = 0;
  for (let i = 1; i < groups.length; i += 1) {
    if (groups[i].leden.length > groups[beste].leden.length) beste = i;
  }
  return beste;
}

export function groepsNaam(groups: LiveGroup[], index: number): string {
  const g = groups[index];
  if (!g) return "Groep";
  // Een ronde voorsprong weegt zwaarder dan de indeling: dat is geen kopgroep
  // meer maar een uitloper, en dat wil je met het aantal ronden erbij zien.
  if (g.tier > 0) return `Kopgroep · +${g.tier}`;
  const pel = pelotonIndex(groups);
  if (index === pel) return "Peloton";
  if (index < pel) return index === 0 ? "Kopgroep" : "Eerste achtervolgers";
  return "Gelost";
}

/**
 * Rol van een groep in de koers. Bepaalt de kleur op de baan: drie kleuren,
 * los van het aantal ronden voorsprong. Een kopgroep met twee ronden marge is
 * nog steeds de kopgroep; dat verschil staat als badge naast het schijfje.
 * "Eerste achtervolgers" rijden vóór het peloton en horen dus bij de kop.
 */
export type GroepsRol = "kop" | "peloton" | "gelost";

export function groepsRol(groups: LiveGroup[], index: number): GroepsRol {
  const g = groups[index];
  if (!g) return "peloton";
  if (g.tier > 0) return "kop";
  const pel = pelotonIndex(groups);
  if (index === pel) return "peloton";
  return index < pel ? "kop" : "gelost";
}

/**
 * De naam zonder het ronde-verschil: dat staat naast de naam als badge, en
 * twee keer "+2" op één tegel leest als een fout.
 */
export function groepsKopje(groups: LiveGroup[], index: number): string {
  return groepsNaam(groups, index).split(" · ")[0];
}

export type UitslagRegel = {
  positie: number;
  rider: LiveRider;
  punten: number;
  isMine: boolean;
};

/**
 * De virtuele uitslag: het hele veld op volgorde, met de punten die het op dit
 * moment zou opleveren.
 *
 * projectPoints levert alleen je eigen rijders -- genoeg voor je totaal, maar
 * niet om de stand te tonen. Deze functie gebruikt hetzelfde schema uit de
 * database, zodat de lijst niet kan afwijken van wat er bij het fiatteren
 * uitkomt. Buiten de punten van het schema is het 0; die grens ligt in het
 * schema zelf en niet hier.
 */
export function virtueleUitslag(
  placings: RiderPlacing[],
  opts: {
    schema: PointsSchema;
    mineRiderIds: Set<string>;
    riderIdByBeennummer: Map<string, string>;
    limiet?: number;
  },
): UitslagRegel[] {
  const { schema, mineRiderIds, riderIdByBeennummer, limiet = 20 } = opts;
  return [...placings]
    .sort((a, b) => a.positie - b.positie)
    .slice(0, limiet)
    .map((p) => {
      const riderId = riderIdByBeennummer.get(p.rider.beennummer);
      return {
        positie: p.positie,
        rider: p.rider,
        punten: schema.get(p.positie) ?? 0,
        isMine: riderId ? mineRiderIds.has(riderId) : false,
      };
    });
}
