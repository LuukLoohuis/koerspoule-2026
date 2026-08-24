import { buildGroups, type LiveRider, type LiveRaceState } from "@/lib/liveMarathon";
import type { LiveRace, LiveTrack } from "@/hooks/useLiveRace";

/**
 * Nagebootste marathon om het live-tabblad te kunnen bekijken buiten een
 * wedstrijdavond om.
 *
 * Alleen voor beheerders en alleen als je er expliciet om vraagt: er wordt
 * niets naar de database geschreven en de echte feed wordt niet aangeraakt.
 * De weergave zet er een duidelijke melding boven, want cijfers die echt lijken
 * maar het niet zijn, zijn erger dan geen cijfers.
 *
 * De stand is een pure functie van `tick`. Zo is hij testbaar, en levert
 * dezelfde tick altijd hetzelfde beeld op.
 */

/** Groepen zoals ze op een echte avond ontstaan: uitlopers, kop, peloton, gelost. */
const GROEPEN = [
  { label: "u2", n: 2, start: 98.42, tempo: 1.007 },
  { label: "u1", n: 3, start: 97.28, tempo: 1.004 },
  { label: "kop", n: 7, start: 96.12, tempo: 1.0025 },
  { label: "pel", n: 21, start: 96.0, tempo: 1.0 },
  { label: "ach", n: 10, start: 95.66, tempo: 0.9865 },
] as const;

const NAMEN = [
  "Jorrit Bergsma", "Simon Schouten", "Bart Hoolwerff", "Crispijn Ariëns", "Arjan Stroetinga",
  "Evert Hoolwerff", "Jordy Harink", "Chris Huizinga", "Gary Hekman", "Willem Hoolwerff",
  "Robert Post", "Mats Stoltenborg", "Elmar Reinders", "Menno Kramer", "Wessel Klein",
  "Jesse Stuiver", "Rens Kok", "Sipke Bouma", "Tjerk Nauta", "Douwe Hylkema",
  "Marten Visser", "Hidde Boersma", "Fokke de Vries", "Klaas Jan Postma", "Sander Kooij",
  "Ruben Zijlstra", "Age Wijbenga", "Jelle Bakker", "Sjoerd Hoekstra", "Wietse Terpstra",
  "Bauke de Jong", "Hessel Nauta", "Sietse Boonstra", "Gerben Dijkstra", "Ids Postma",
  "Freerk van der Meer", "Anne Sikkema", "Pieter Kuipers", "Rinse Adema", "Jouke Zijlstra",
  "Djurre Wiersma", "Lieuwe Bosma", "Wibe Hoekstra",
] as const;

const TOTAAL_RONDEN = 125;
const RONDE_LENGTE = 400;
/** Aangenomen rondetijd; zet seconden om in ronde-fracties. */
const RONDETIJD_S = 32;
/**
 * Ronden per tik. Op ware snelheid (1,2 s per tik bij 32 s per ronde) schoot
 * het veld zichtbaar door en verspringen de schijfjes elke tik. Een kwart
 * daarvan leest rustiger; het gaat om de weergave, niet om een wedstrijdklok.
 */
const SNELHEID = 0.25;
const STAP = (1.2 / RONDETIJD_S) * SNELHEID;

export type SimulatieOpts = {
  /** Beennummers die als "van mij" moeten gelden. */
  mijnBeennummers?: string[];
  baanNaam?: string;
};

/** Bouwt de rijders voor één moment in de koers. `tick` is het aantal stappen. */
export function simuleerRijders(tick: number): LiveRider[] {
  const rijders: LiveRider[] = [];
  let n = 0;
  for (const groep of GROEPEN) {
    for (let k = 0; k < groep.n; k += 1) {
      const naam = NAMEN[n % NAMEN.length];
      // Binnen een groep rijdt iedereen net iets achter de kop, zodat een pak
      // als een sliert leest en niet als één punt.
      const afstand = groep.start + tick * STAP * groep.tempo - k * 0.0055;
      const beennummer = String(n + 1).padStart(2, "0");
      rijders.push({
        beennummer,
        shownummer: beennummer,
        relatienummer: null,
        naam,
        sponsor: null,
        aantalRonden: Math.floor(afstand),
        aantalRondenKop: null,
        meter: Math.round((afstand % 1) * RONDE_LENGTE),
        // Kloktijd loopt op met de afstand; sortStandings gebruikt dit voor
        // rijders binnen dezelfde ronde.
        tijdSort: Math.round((100 - afstand) * RONDETIJD_S * 1000),
        tijd: null,
        lap: null,
        sectie: null,
        fastest: null,
        groep: null,
        punten: null,
        finished: false,
      });
      n += 1;
    }
  }
  return rijders;
}

/** Volledige racestand voor één moment. */
export function simuleerRace(tick: number, opts: SimulatieOpts = {}): LiveRace {
  const baanNaam = opts.baanNaam ?? "Haaksbergen";
  const rijders = simuleerRijders(tick);
  const groups = buildGroups(rijders);
  const maxRonden = Math.min(TOTAAL_RONDEN, Math.max(...rijders.map((r) => r.aantalRonden)) + 1);

  const state: LiveRaceState = {
    totaalRonden: TOTAAL_RONDEN,
    rondeLengte: RONDE_LENGTE,
    rondenTeGaan: Math.max(0, TOTAAL_RONDEN - maxRonden),
    aantalRijders: rijders.length,
    aantalActief: rijders.length,
    maxRonden,
    pelotonRonden: groups.length > 0 ? groups[Math.floor(groups.length / 2)].leden[0]?.rider.aantalRonden ?? null : null,
    raceTime: null,
    lapTime: null,
    gemRondeTijd: null,
    gemRondeSnelheid: null,
    snelsteRondeTijd: null,
    snelsteRondeNaam: null,
    snelsteRondeBeennummer: null,
    snelsteRondeNr: null,
    snelsteRondeSnelheid: null,
    bronTijd: null,
  };

  const track: LiveTrack = {
    trackId: baanNaam,
    label: baanNaam,
    categorie: "heren",
    state,
    riders: rijders,
    groups,
    premies: [],
    // Beennummer -> rider_id. In de simulatie is het beennummer zelf de
    // sleutel, zodat "mijn rijders" zonder database werkt.
    riderIdByBeennummer: new Map(rijders.map((r) => [r.beennummer, `sim-${r.beennummer}`])),
    syncedAt: new Date().toISOString(),
  };

  return {
    stageId: "simulatie",
    stageNumber: 0,
    stageName: `${baanNaam} · simulatie`,
    ijsType: "natuurijs",
    tracks: [track],
    syncedAt: track.syncedAt,
  };
}

/** rider_id's die in de simulatie als "van mij" gelden. */
export function simulatieMijnRiderIds(beennummers: string[]): Set<string> {
  return new Set(beennummers.map((b) => `sim-${b}`));
}

/** Standaardselectie: één rijder per groep, zodat elke situatie zichtbaar is. */
export const SIM_MIJN_BEENNUMMERS = ["03", "09", "14", "27", "39"];
