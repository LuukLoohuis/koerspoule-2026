/** Testbank-demo voor scherm 1 (zie src/dev-meermarathon.tsx). Nepdata, geen database. */
import type { ReactNode } from "react";
import { MijnMeermarathonLaden, MijnMeermarathonOverzicht } from "@/components/meermarathon/MijnMeermarathonOverzicht";
import { bouwGameStatus, type MeermarathonGameStatus, type MmEntry, type MmKlassement, type MmWedstrijd } from "@/lib/meermarathonSeizoen";

// Vaste klok: dinsdag 10 november 2026, drie dagen voor de deadline.
const NU = new Date(2026, 10, 10, 12, 0);
const VANDAAG = "2026-11-10";
const DEADLINE = new Date(2026, 10, 13, 23, 59).toISOString();

type Plan = [nr: number, date: string | null, type: string, ijs: "kunstijs" | "natuurijs", vrouwen: number | null, mannen: number | null];

// Kalender zoals in het ontwerp; afstand in ronden (kunstijs) of km (natuurijs).
// Banen laten we weg: die kent de database niet.
const PLAN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs", 80, 125],
  [2, "2026-11-07", "cup", "kunstijs", 80, 125],
  [3, "2026-11-14", "cup", "kunstijs", 80, 125],
  [4, "2026-11-21", "cup", "kunstijs", 80, 125],
  [5, "2026-12-05", "cup", "kunstijs", 80, 125],
  [6, "2027-01-09", "grandprix", "natuurijs", 60, 100],
  [7, "2027-01-16", "grandprix", "natuurijs", 60, 100],
  [8, null, "onk", "natuurijs", null, null],
  [9, "2027-02-06", "nk", "kunstijs", 100, 150],
];

function wedstrijden(gameId: string, categorie: "vrouwen" | "mannen", uitslagen: number): MmWedstrijd[] {
  return PLAN.map(([nr, date, type, ijs, vrouwen, mannen]) => {
    const afstand = categorie === "vrouwen" ? vrouwen : mannen;
    return {
      id: `${gameId}-${nr}`,
      game_id: gameId,
      stage_number: nr,
      name: null,
      date,
      status: null,
      is_gc: false,
      results_status: nr <= uitslagen ? "approved" : null,
      ijs_type: ijs,
      wedstrijd_type: type,
      aantal_rondes: ijs === "kunstijs" ? afstand : null,
      distance_km: ijs === "natuurijs" ? afstand : null,
    };
  });
}

function game(
  categorie: "vrouwen" | "mannen",
  opties: {
    entry?: MmEntry | null;
    klassement?: MmKlassement | null;
    status?: string;
    uitslagen?: number;
    punten?: [number, number][];
    deadline?: string | null;
  } = {},
): MeermarathonGameStatus {
  const id = categorie === "vrouwen" ? "demo-v" : "demo-m";
  return bouwGameStatus({
    game: {
      id,
      name: `Meermarathon ${categorie}`,
      year: 2026,
      status: opties.status ?? "open_inschrijving",
      game_type: "meermarathon",
      categorie,
      registration_closes_at: opties.deadline === undefined ? DEADLINE : opties.deadline,
    },
    entry: opties.entry ?? null,
    vereist: 5,
    wedstrijden: wedstrijden(id, categorie, opties.uitslagen ?? 2),
    klassement: opties.klassement ?? null,
    puntenPerWedstrijd: new Map((opties.punten ?? []).map(([nr, p]) => [`${id}-${nr}`, p])),
    vandaag: VANDAAG,
  });
}

const ingeschreven: MmEntry = { id: "e-v", status: "submitted", teamName: "IJzeren Hein", picks: 5 };
const halveploeg: MmEntry = { id: "e-m", status: "draft", teamName: null, picks: 3 };

const vrouwenIn = game("vrouwen", {
  entry: ingeschreven,
  klassement: { rank: 12, totaal: 1204, delta: 4, punten: 92 },
  punten: [[1, 54], [2, 38]],
});
const mannenHalf = game("mannen", { entry: halveploeg });
const vrouwenOpen = game("vrouwen");
const mannenOpen = game("mannen");

const STATEN: { titel: string; statussen: MeermarathonGameStatus[]; desktop?: boolean }[] = [
  { titel: "Beide games (01a / 01d)", statussen: [vrouwenIn, mannenHalf], desktop: true },
  { titel: "Eén game (01b / 01e)", statussen: [vrouwenIn, mannenOpen], desktop: true },
  { titel: "Geen game (01c / 01f)", statussen: [vrouwenOpen, mannenOpen], desktop: true },
  {
    titel: "Vóór de eerste uitslag · ploeg vol maar niet bevestigd",
    statussen: [
      game("vrouwen", { entry: ingeschreven, uitslagen: 0 }),
      game("mannen", { entry: { ...halveploeg, picks: 5 }, uitslagen: 0 }),
    ],
  },
  {
    titel: "Inschrijving gesloten · halve ploeg telt niet mee",
    statussen: [
      game("vrouwen", { entry: halveploeg, status: "live", klassement: null }),
      game("mannen", { status: "live" }),
    ],
  },
  {
    titel: "Inschrijving gesloten · nergens ingeschreven",
    statussen: [game("vrouwen", { status: "locked" }), game("mannen", { status: "finished" })],
  },
];

function Frame({ label, breedte, children }: { label: string; breedte: "mobiel" | "desktop"; children: ReactNode }) {
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</figcaption>
      <div
        className={
          breedte === "mobiel"
            ? "w-[390px] rounded-xl border border-dashed border-border bg-background px-5 pt-5"
            : "w-[1200px] rounded-xl border border-dashed border-border bg-background px-5 pt-7"
        }
      >
        {children}
      </div>
    </figure>
  );
}

const acties = {
  onNaarVolgwagen: (id: string) => console.info("[demo] naar Volgwagen", id),
  onRondkijken: (id: string) => console.info("[demo] rondkijken", id),
};

export default function Scherm1Demo() {
  return (
    <div className="space-y-12">
      {STATEN.map(({ titel, statussen, desktop }) => (
        <div key={titel} className="space-y-3">
          <h3 className="m-0 font-inter text-sm font-bold">{titel}</h3>
          <div className="flex flex-wrap items-start gap-8 overflow-x-auto pb-2">
            <Frame label="mobiel 390" breedte="mobiel">
              <MijnMeermarathonOverzicht statussen={statussen} gekozenGameId="demo-v" nu={NU} {...acties} />
            </Frame>
            {desktop && (
              <Frame label="desktop 1280" breedte="desktop">
                <MijnMeermarathonOverzicht statussen={statussen} gekozenGameId="demo-v" nu={NU} {...acties} />
              </Frame>
            )}
          </div>
        </div>
      ))}
      <div className="space-y-3">
        <h3 className="m-0 font-inter text-sm font-bold">Laden</h3>
        <div className="flex flex-wrap items-start gap-8 overflow-x-auto pb-2">
          <Frame label="mobiel 390" breedte="mobiel">
            <MijnMeermarathonLaden />
          </Frame>
          <Frame label="desktop 1280" breedte="desktop">
            <MijnMeermarathonLaden />
          </Frame>
        </div>
      </div>
    </div>
  );
}
