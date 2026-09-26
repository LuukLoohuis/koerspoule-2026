/** Testbank-demo voor scherm 4 (zie src/dev-meermarathon.tsx). Nepdata, geen database. */
import { useEffect, useState, type ReactNode } from "react";
import LiveTab from "@/components/meermarathon/LiveTab";
import { buildGroups, type LiveRaceState, type LiveRider, type PointsSchema } from "@/lib/liveMarathon";
import { simuleerRace, simulatieMijnRiderIds, SIM_MIJN_BEENNUMMERS } from "@/lib/liveSimulatie";
import type { LiveRace, LiveTrack } from "@/hooks/useLiveRace";

// Schaal zoals in docs/design/live-meermarathon; in de app komt hij uit points_schema.
const SCHEMA: PointsSchema = new Map(
  [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((p, i) => [i + 1, p]),
);

// Negenendertig verzonnen namen, één per rijder. Jouw vier staan op de plekken
// uit het ontwerp (P4, P13, P17, P31), zodat de cijfers kloppen met de PNG.
const NAMEN = [
  "Femke Dijkstra", "Anouk Postma", "Marit Hoekstra", "Lotte Bosma", "Sanne de Vries", "Ilse Zijlstra",
  "Jet Wiersma", "Roos Kuipers", "Fenna Sikkema", "Tessa Adema", "Maaike Nauta", "Rixt Mulder",
  "Iris Kooistra", "Wendy Boonstra", "Evi Hylkema", "Lieke Bakker", "Noor Visser", "Nynke Terpstra",
  "Mirthe Jansen", "Floor de Jong", "Sietske Boersma", "Froukje Meijer", "Anne Kramer", "Lisa Klein",
  "Merel Stuiver", "Janneke Kok", "Hilde Bouma", "Tjitske Wijbenga", "Baukje Postma", "Aukje Hekman",
  "Esmee Wijnia", "Dieuwke Dijkstra", "Gerrie Harink", "Yvonne Post", "Carlijn Reinders",
  "Petra Hoolwerff", "Klaske Veenstra", "Trijntje Smit", "Welmoed Brouwer",
];

/** Groepen zoals in het ontwerp: uitloper +1, kopgroep op 6,4 s, peloton, achterblijvers op 11 s. */
const GROEPEN = [
  { n: 1, ronden: 53, tijd: 20_000, meter: 120, stap: 0 },
  { n: 7, ronden: 52, tijd: 100_000, meter: 300, stap: 5 },
  { n: 21, ronden: 52, tijd: 106_400, meter: 215, stap: 4 },
  { n: 10, ronden: 52, tijd: 117_400, meter: 60, stap: 4 },
];

function ontwerpRijders(): LiveRider[] {
  const uit: LiveRider[] = [];
  let i = 0;
  for (const g of GROEPEN) {
    for (let k = 0; k < g.n; k += 1) {
      const beennummer = String(i + 1).padStart(2, "0");
      uit.push({
        beennummer,
        shownummer: beennummer,
        relatienummer: null,
        naam: NAMEN[i % NAMEN.length],
        sponsor: null,
        aantalRonden: g.ronden,
        aantalRondenKop: null,
        meter: (g.meter - k * g.stap + 400) % 400,
        tijdSort: g.tijd + k * 300,
        tijd: null,
        lap: null,
        sectie: null,
        fastest: null,
        groep: null,
        punten: null,
        finished: false,
      });
      i += 1;
    }
  }
  return uit;
}

const STAAT: LiveRaceState = {
  totaalRonden: 80,
  rondeLengte: 400,
  rondenTeGaan: 28,
  aantalRijders: 39,
  aantalActief: 39,
  maxRonden: 52,
  pelotonRonden: 52,
  raceTime: "1:31:12",
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

const RIJDERS = ontwerpRijders();
const MIJN_NAMEN = ["Lotte Bosma", "Iris Kooistra", "Esmee Wijnia", "Noor Visser"];
const MIJN_RIJDERS = [
  ...MIJN_NAMEN.map((naam) => ({ id: `demo-${RIJDERS.find((r) => r.naam === naam)!.beennummer}`, naam })),
  // Staat niet in de uitslag van de bron: "Niet gestart".
  { id: "demo-terpstra", naam: "Jildou Terpstra" },
];
const MIJN_IDS = new Set(MIJN_RIJDERS.map((r) => r.id));

function ontwerpBaan(syncedAt: string): LiveTrack {
  return {
    trackId: "Thialf",
    label: "Vrouwen",
    categorie: "dames",
    state: STAAT,
    riders: RIJDERS,
    groups: buildGroups(RIJDERS),
    premies: [],
    riderIdByBeennummer: new Map(RIJDERS.map((r) => [r.beennummer, `demo-${r.beennummer}`])),
    syncedAt,
  };
}

function ontwerpRace(syncedAt: string, extraBaan?: LiveTrack): LiveRace {
  const baan = ontwerpBaan(syncedAt);
  return {
    stageId: "demo-cup-3",
    stageNumber: 3,
    stageName: null,
    ijsType: "kunstijs",
    tracks: extraBaan ? [baan, extraBaan] : [baan],
    syncedAt,
  };
}

/** Verse "bijgewerkt"-tijd, zoals de echte feed die elke twintig seconden ververst. */
function useNu(ms: number): number {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNu(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return nu;
}

/** Lopende simulatie, dezelfde als ?livesim=1 in de app. */
function useSimulatie(): LiveRace {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1200);
    return () => window.clearInterval(id);
  }, []);
  return simuleerRace(tick, { mijnBeennummers: SIM_MIJN_BEENNUMMERS });
}

const GEDEELD = {
  mineRiderIds: MIJN_IDS,
  jokerRiderIds: new Set<string>(),
  pointsSchema: SCHEMA,
  jokerMultiplier: 2,
  mijnRijders: MIJN_RIJDERS,
  categorie: "vrouwen",
  wedstrijdType: "cup",
  ploegNaam: "De Klapschaatsers",
};

function Frame({ label, breedte, children }: { label: string; breedte: "mobiel" | "desktop"; children: ReactNode }) {
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</figcaption>
      <div
        className={
          breedte === "mobiel"
            ? "w-[390px] rounded-xl border border-dashed border-border bg-background px-3 py-4"
            : "w-[1200px] rounded-xl border border-dashed border-border bg-background px-5 py-7"
        }
      >
        {children}
      </div>
    </figure>
  );
}

function Staat({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="m-0 font-inter text-sm font-bold">{titel}</h3>
      <div className="flex flex-wrap items-start gap-8 overflow-x-auto pb-2">{children}</div>
    </div>
  );
}

export default function Scherm4Demo() {
  const nu = useNu(20_000);
  const vers = new Date(nu).toISOString();
  const oud = new Date(nu - 9 * 60_000).toISOString();
  const sim = useSimulatie();
  const live = ontwerpRace(vers);

  return (
    <div className="space-y-12">
      <Staat titel="Live · zoals in het ontwerp (Cup 3, Vrouwen)">
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab race={live} {...GEDEELD} />
        </Frame>
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab race={live} {...GEDEELD} />
        </Frame>
      </Staat>

      <Staat titel="Live · simulatie loopt (schijfjes rijden door, stempel Simulatie)">
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab
            race={sim}
            simulatie
            mineRiderIds={simulatieMijnRiderIds(SIM_MIJN_BEENNUMMERS)}
            jokerRiderIds={new Set()}
            pointsSchema={SCHEMA}
            jokerMultiplier={2}
            categorie="mannen"
          />
        </Frame>
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab
            race={sim}
            simulatie
            mineRiderIds={simulatieMijnRiderIds(SIM_MIJN_BEENNUMMERS)}
            jokerRiderIds={new Set()}
            pointsSchema={SCHEMA}
            jokerMultiplier={2}
            categorie="mannen"
            ploegNaam="IJzeren Hein"
          />
        </Frame>
      </Staat>

      <Staat titel="Onderbroken · de feed is al negen minuten stil">
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab race={ontwerpRace(oud)} {...GEDEELD} />
        </Frame>
      </Staat>

      <Staat titel="Twee banen tegelijk (oudere game zonder categorie) · onbekende wedstrijdsoort">
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab
            race={ontwerpRace(vers, { ...sim.tracks[0], trackId: "Thialf-heren", label: "Mannen", syncedAt: vers })}
            {...GEDEELD}
            categorie={null}
            wedstrijdType={undefined}
          />
        </Frame>
      </Staat>

      <Staat titel="Geen wedstrijd live">
        <Frame label="mobiel 390" breedte="mobiel">
          <LiveTab race={null} {...GEDEELD} />
        </Frame>
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab race={null} {...GEDEELD} />
        </Frame>
      </Staat>
    </div>
  );
}
