/**
 * Testbank-demo voor scherm 17 (zie src/dev-meermarathon.tsx): de groepen bij
 * een echte koers. Cup 2 Utrecht, Beloften, 24-10-2026: halverwege met vijf
 * uitlopers op een ronde, en na de finish, toen het peloton was afgebeld en Has
 * en Verduijn doorreden tot ronde 100. Brondata uit
 * src/test/fixtures/livemarathon-utrecht-beloften.json, geen database.
 */
import type { ReactNode } from "react";
import LiveTab from "@/components/meermarathon/LiveTab";
import { buildGroups, type LiveRaceState, type LiveRider } from "@/lib/liveMarathon";
import type { LiveRace } from "@/hooks/useLiveRace";
import { Frame, GEDEELD } from "@/dev/mm/Scherm4Demo";
import fixture from "@/test/fixtures/livemarathon-utrecht-beloften.json";

type Rij = {
  beennummer: string;
  naam: string;
  aantal_ronden: number;
  aantal_ronden_kop: number | null;
  tijd_sort: number | null;
  tijd: string | null;
  finished: boolean;
};

// Vier rijders "van jou", verspreid over het veld: een uitloper, iemand uit de
// sprint, iemand in het peloton en iemand die er na twintig ronden uit lag.
const MIJN = new Map([
  ["Stefan Has", "utr-has"],
  ["Sietse de Vries", "utr-devries"],
  ["Niels Immerzeel", "utr-immerzeel"],
  ["Arie Boer", "utr-boer"],
]);

function rijders(rijen: Rij[]): LiveRider[] {
  return rijen.map((r) => ({
    beennummer: r.beennummer,
    shownummer: r.beennummer,
    relatienummer: null,
    naam: r.naam,
    sponsor: null,
    aantalRonden: r.aantal_ronden,
    aantalRondenKop: r.aantal_ronden_kop,
    meter: 0,
    tijdSort: r.tijd_sort,
    tijd: r.tijd,
    lap: null,
    sectie: null,
    fastest: null,
    groep: null,
    punten: null,
    finished: r.finished,
  }));
}

function staat(ronde: number, rondenTeGaan: number, raceTime: string, actief: number): LiveRaceState {
  return {
    totaalRonden: 100,
    rondeLengte: 400,
    rondenTeGaan,
    aantalRijders: 70,
    aantalActief: actief,
    maxRonden: ronde,
    pelotonRonden: null,
    raceTime,
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
}

function race(rijen: Rij[], s: LiveRaceState): LiveRace {
  const riders = rijders(rijen);
  const riderIdByBeennummer = new Map<string, string>();
  for (const r of riders) {
    const id = MIJN.get(r.naam);
    if (id) riderIdByBeennummer.set(r.beennummer, id);
  }
  const syncedAt = new Date().toISOString();
  return {
    stageId: "demo-utrecht",
    stageNumber: 2,
    stageName: "Cup 2 Utrecht",
    ijsType: "kunstijs",
    tracks: [
      {
        trackId: "Utrecht",
        label: "Beloften Divisie Mannen",
        categorie: "Beloften Divisie Mannen",
        state: s,
        riders,
        groups: buildGroups(riders),
        premies: [],
        riderIdByBeennummer,
        syncedAt,
      },
    ],
    syncedAt,
  };
}

const HALVERWEGE = race(fixture.ronde43 as Rij[], staat(43, 57, "23:29", 70));
const FINISH = race(fixture.finish as Rij[], staat(100, 0, "54:34", 70));

const OPTIES = {
  ...GEDEELD,
  mineRiderIds: new Set(MIJN.values()),
  mijnRijders: [...MIJN].map(([naam, id]) => ({ id, naam })),
  categorie: "mannen",
};

function Staat({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="m-0 font-inter text-sm font-bold">{titel}</h3>
      <div className="flex flex-wrap items-start gap-8 overflow-x-auto pb-2">{children}</div>
    </div>
  );
}

export default function Scherm17Demo() {
  return (
    <div className="space-y-12">
      <Staat titel="Na de finish · peloton afgebeld in ronde 94, Has en Verduijn door tot 100">
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab race={FINISH} {...OPTIES} />
        </Frame>
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab race={FINISH} {...OPTIES} />
        </Frame>
      </Staat>
      <Staat titel="Halverwege · ronde 43, vijf uitlopers op een ronde">
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab race={HALVERWEGE} {...OPTIES} />
        </Frame>
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab race={HALVERWEGE} {...OPTIES} />
        </Frame>
      </Staat>
    </div>
  );
}
