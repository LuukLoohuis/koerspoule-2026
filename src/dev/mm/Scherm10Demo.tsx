/**
 * Testbank-demo voor scherm 10 (zie src/dev-meermarathon.tsx): de pagina
 * /uitslagen bij de Meermarathon. Bovenaan de koersbalk en de pelotonbalk
 * zoals in pages/Results.tsx, daaronder de echte ResultsView. De data van
 * beide pelotons staat vooraf in de cache van de testbank; zonder inlog
 * blijven de queries uit, dus er gaat niets naar de database. Je kijkt mee
 * zonder eigen ploeg.
 *
 * Te zien: de pelotonbalk onder de koersbalk, "Bijgewerkt t/m Cup 3", de
 * tussenstand-balk boven het klassement, de beker voor de poulewinnaar en bij
 * de schaatsers alleen de oranje leiderstrui en de witte trui.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import GameSwitcher from "@/components/GameSwitcher";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import ResultsView from "@/components/ResultsView";
import type { GameRow } from "@/hooks/useAllGames";
import type { EntryStanding, GameStandingRow, StageResultRow, StageRow } from "@/hooks/useResults";

const VROUWEN = "demo-mm-vrouwen";
const MANNEN = "demo-mm-mannen";

const GAMES: GameRow[] = [
  { id: "demo-tour", name: "Tour de France 2026", year: 2026, status: "finished", game_type: "tour" },
  { id: "demo-giro", name: "Giro d'Italia 2026", year: 2026, status: "finished", game_type: "giro" },
  { id: VROUWEN, name: "Meermarathon Vrouwen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "vrouwen" },
  { id: MANNEN, name: "Meermarathon Mannen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "mannen" },
];

const PELOTONS: PelotonItem[] = [
  { id: VROUWEN, label: "Vrouwen", categorie: "vrouwen", soort: "meedoen", regel: "12e van 1.204" },
  { id: MANNEN, label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "48e van 986" },
];

type Plan = [nr: number, date: string | null, type: string, ijs: "kunstijs" | "natuurijs", naam?: string];

const PLAN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs", "Amsterdam"],
  [2, "2026-11-07", "cup", "kunstijs"],
  [3, "2026-11-14", "cup", "kunstijs"],
  [4, "2026-11-21", "cup", "kunstijs"],
  [5, "2026-12-05", "cup", "kunstijs"],
  [6, "2027-01-09", "grandprix", "natuurijs"],
  [7, "2027-01-16", "grandprix", "natuurijs"],
  [8, null, "onk", "natuurijs"],
  [9, "2027-02-06", "nk", "kunstijs"],
];
const GEREDEN = 3;

function wedstrijden(game: string): StageRow[] {
  return PLAN.map(([nr, date, type, ijs, naam]) => ({
    id: `${game}-w${nr}`,
    game_id: game,
    stage_number: nr,
    name: naam ?? null,
    date,
    status: "published",
    stage_type: null,
    distance_km: null,
    is_gc: false,
    results_status: nr <= GEREDEN ? "approved" : null,
    ijs_type: ijs,
    wedstrijd_type: type,
    aantal_rondes: null,
  }));
}

const PLOEGEN: [string, string, number, number][] = [
  ["Ronde om Loosdrecht", "Marieke", 211, 61],
  ["IJzersterk", "Joost", 204, 44],
  ["Kou op de Kop", "Anke", 198, 57],
  ["Team Bevroren Sloot", "Pieter", 187, 39],
  ["Natuurijs Nelleke", "Nelleke", 181, 52],
  ["Klunen naar de Finish", "Wouter", 176, 41],
  ["Het Snelle Schaatsje", "Ilse", 170, 33],
  ["Rondjes Rijders", "Kees", 163, 47],
  ["Wind Mee", "Fenna", 158, 30],
  ["Slag op Slag", "Ruud", 152, 36],
];

/** De mannen krijgen dezelfde ploegen in omgekeerde volgorde: zo zie je de wissel. */
function ploegen(game: string): [string, string, number, number][] {
  if (game !== MANNEN) return PLOEGEN;
  const namen = [...PLOEGEN].reverse();
  return PLOEGEN.map(([, , totaal, laatste], i) => [namen[i][0], namen[i][1], totaal, laatste]);
}

function entries(game: string): EntryStanding[] {
  return ploegen(game).map(([ploeg, speler, totaal], i) => ({
    id: `${game}-e${i}`,
    user_id: `${game}-u${i}`,
    team_name: ploeg,
    display_name: speler,
    total_points: totaal,
  }));
}

function stand(game: string): GameStandingRow[] {
  return ploegen(game).map(([ploeg, speler, totaal, laatste], i) => ({
    entry_id: `${game}-e${i}`,
    user_id: `${game}-u${i}`,
    team_name: ploeg,
    display_name: speler,
    cum_points: totaal,
    pred_bonus: 0,
    total: totaal,
    rank: i + 1,
    prev_rank: i + 1,
    delta: i === 2 ? 2 : i === 4 ? -1 : 0,
    stage_points: laatste,
    stage_rank: null,
  }));
}

/** Verzonnen schaatsers; alleen het algemeen klassement en de witte trui. */
const SCHAATSERS: Record<string, string[]> = {
  [VROUWEN]: ["Anouk Hoekstra", "Merel Dijkstra", "Iris Veenstra", "Fleur Kramer", "Noor Bosma", "Lieke Wester"],
  [MANNEN]: ["Jan Hoeksma", "Sven Dijkstra", "Bart Veenstra", "Ruben Kramer", "Thijs Bosma", "Luuk Wester"],
};

function uitslag(game: string): StageResultRow[] {
  return SCHAATSERS[game].map((naam, i) => ({
    id: `${game}-r${i}`,
    stage_id: `${game}-w${GEREDEN}`,
    rider_id: `${game}-s${i}`,
    rider_name: naam,
    start_number: 10 + i,
    finish_position: i + 1,
    gc_position: i + 1,
    mountain_position: null,
    points_position: null,
    youth_position: i % 2 === 1 ? (i + 1) / 2 : null,
    did_finish: true,
    riders: { id: `${game}-s${i}`, name: naam, start_number: 10 + i, team_id: null, teams: { name: i < 3 ? "IJsploeg Noord" : "Schaatsteam Zuid" } },
  }));
}

function zetInCache(qc: ReturnType<typeof useQueryClient>) {
  qc.setQueryData(["all-games"], GAMES);
  for (const game of [VROUWEN, MANNEN]) {
    qc.setQueryData(["stages", game], wedstrijden(game));
    qc.setQueryData(["entries-standings", game], entries(game));
    for (let n = 1; n <= GEREDEN; n++) qc.setQueryData(["game-standings", game, n, false], stand(game));
    qc.setQueryData(["stage-results", `${game}-w${GEREDEN}`], uitslag(game));
    qc.setQueryData(["points-schema", game], []);
    qc.setQueryData(["last-approved-stage", game], {
      id: `${game}-w${GEREDEN}`,
      stage_number: GEREDEN,
      name: null,
      approved_at: "2026-11-14T21:00:00Z",
      ijs_type: "kunstijs",
      wedstrijd_type: "cup",
    });
  }
}

export default function Scherm10Demo() {
  const qc = useQueryClient();
  // Vóór de eerste render: de view leest de cache meteen.
  useState(() => zetInCache(qc));
  const [gekozen, setGekozen] = useState(MANNEN);
  const game = GAMES.find((g) => g.id === gekozen)!;
  return (
    <div className="space-y-10">
      <figure className="m-0 space-y-2">
        <figcaption className="text-xs font-semibold text-muted-foreground">
          /uitslagen · koersbalk, pelotonbalk en Klassement na Cup 3 (meekijken, zonder eigen ploeg)
        </figcaption>
        {/* ResultsView schakelt op de vensterbreedte, niet op dit kader: smal
            venster (telefoon-emulatie) = de telefoonversie. */}
        <div className="w-full max-w-[1160px] rounded-lg border border-dashed border-border bg-background px-3 py-4 md:px-5 md:py-6">
          {/* Zelfde opbouw en klassen als pages/Results.tsx. */}
          <GameSwitcher
            games={GAMES}
            selectedId={gekozen}
            onSelect={(id) => {
              if (id === VROUWEN || id === MANNEN) setGekozen(id);
            }}
            className="max-w-5xl mx-auto mb-4"
          />
          <div className="mb-2 md:mx-auto md:mb-4 md:max-w-2xl">
            <Pelotonbalk seizoen={"’26-’27"} items={PELOTONS} selectedId={gekozen} onSelect={setGekozen} />
          </div>
          <ResultsView showHeader gameId={game.id} gameName={game.name} initialView="klassement" />
        </div>
      </figure>
    </div>
  );
}
