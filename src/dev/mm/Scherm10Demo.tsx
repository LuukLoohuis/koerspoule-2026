/**
 * Testbank-demo voor scherm 10 (zie src/dev-meermarathon.tsx): de echte
 * Uitslagen-pagina (ResultsView) van een Meermarathon-peloton. De data staat
 * vooraf in de cache van de testbank; zonder inlog blijven de queries uit, dus
 * er gaat niets naar de database. Je kijkt mee zonder eigen ploeg.
 *
 * Te zien: de tussenstand-balk boven het klassement, de beker voor de
 * poulewinnaar en bij de schaatsers alleen de oranje leiderstrui en de witte
 * trui.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ResultsView from "@/components/ResultsView";
import type { EntryStanding, GameStandingRow, StageResultRow, StageRow } from "@/hooks/useResults";

const GAME = "demo-mm-mannen";
const NAAM = "Meermarathon Mannen 2026-2027";

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

const STAGES: StageRow[] = PLAN.map(([nr, date, type, ijs, naam]) => ({
  id: `w${nr}`,
  game_id: GAME,
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

const ENTRIES: EntryStanding[] = PLOEGEN.map(([ploeg, speler, totaal], i) => ({
  id: `e${i}`,
  user_id: `u${i}`,
  team_name: ploeg,
  display_name: speler,
  total_points: totaal,
}));

const STAND: GameStandingRow[] = PLOEGEN.map(([ploeg, speler, totaal, laatste], i) => ({
  entry_id: `e${i}`,
  user_id: `u${i}`,
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

/** Verzonnen schaatsers; alleen het algemeen klassement en de witte trui. */
const SCHAATSERS = ["Jan Hoeksma", "Sven Dijkstra", "Bart Veenstra", "Ruben Kramer", "Thijs Bosma", "Luuk Wester"];
const UITSLAG: StageResultRow[] = SCHAATSERS.map((naam, i) => ({
  id: `r${i}`,
  stage_id: `w${GEREDEN}`,
  rider_id: `s${i}`,
  rider_name: naam,
  start_number: 10 + i,
  finish_position: i + 1,
  gc_position: i + 1,
  mountain_position: null,
  points_position: null,
  youth_position: i % 2 === 1 ? (i + 1) / 2 : null,
  did_finish: true,
  riders: { id: `s${i}`, name: naam, start_number: 10 + i, team_id: null, teams: { name: i < 3 ? "IJsploeg Noord" : "Schaatsteam Zuid" } },
}));

function zetInCache(qc: ReturnType<typeof useQueryClient>) {
  qc.setQueryData(["all-games"], [
    { id: GAME, name: NAAM, year: 2026, status: "live", game_type: "meermarathon", categorie: "mannen", theme: null },
  ]);
  qc.setQueryData(["stages", GAME], STAGES);
  qc.setQueryData(["entries-standings", GAME], ENTRIES);
  for (let n = 1; n <= GEREDEN; n++) qc.setQueryData(["game-standings", GAME, n, false], STAND);
  qc.setQueryData(["stage-results", `w${GEREDEN}`], UITSLAG);
  qc.setQueryData(["points-schema", GAME], []);
  qc.setQueryData(["last-approved-stage", GAME], { id: `w${GEREDEN}`, stage_number: GEREDEN, name: null, approved_at: "2026-11-14T21:00:00Z" });
}

export default function Scherm10Demo() {
  const qc = useQueryClient();
  // Vóór de eerste render: de view leest de cache meteen.
  useState(() => zetInCache(qc));
  return (
    <div className="space-y-10">
      <figure className="m-0 space-y-2">
        <figcaption className="text-xs font-semibold text-muted-foreground">
          Uitslagen › Klassement na Cup 3 (meekijken, zonder eigen ploeg)
        </figcaption>
        {/* ResultsView schakelt op de vensterbreedte, niet op dit kader: smal
            venster (telefoon-emulatie) = de telefoonversie. */}
        <div className="w-full max-w-[1160px] rounded-lg border border-dashed border-border bg-background px-3 py-4 md:px-5 md:py-6">
          <ResultsView showHeader gameId={GAME} gameName={NAAM} initialView="klassement" />
        </div>
      </figure>
    </div>
  );
}
