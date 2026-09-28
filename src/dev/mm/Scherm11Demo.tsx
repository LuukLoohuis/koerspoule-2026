/**
 * Testbank-demo voor scherm 11 (zie src/dev-meermarathon.tsx): wisselen
 * tussen vrouwen, mannen en het totaal.
 *
 * Boven: /uitslagen met de pelotonbalk en de derde knop Totaal. Vrouwen en
 * Mannen tonen de echte ResultsView (data vooraf in de cache, zoals scherm
 * 10); Totaal toont het totaalklassement, opgeteld met dezelfde functie als
 * de echte pagina. Je bent hier Sanne, met een ploeg in allebei.
 *
 * Onder: de pelotonbalk als er maar één peloton bestaat, zoals nu op
 * koerspoule.nl (alleen de mannen).
 */
import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import GameSwitcher from "@/components/GameSwitcher";
import ResultsView from "@/components/ResultsView";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import { TotaalklassementWeergave } from "@/components/meermarathon/Totaalklassement";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { GameRow } from "@/hooks/useAllGames";
import type { TotaalPeloton } from "@/hooks/useMeermarathonTotaal";
import type { EntryStanding, GameStandingRow, StageResultRow, StageRow } from "@/hooks/useResults";
import { bouwTotaalklassement, totaalRegel } from "@/lib/meermarathonTotaal";
import { rangtekst } from "@/lib/meermarathonSeizoen";

const VROUWEN = "demo11-mm-vrouwen";
const MANNEN = "demo11-mm-mannen";
const MIJ = "u-sanne";

const GAMES: GameRow[] = [
  { id: "demo-tour", name: "Tour de France 2026", year: 2026, status: "finished", game_type: "tour" },
  { id: "demo-giro", name: "Giro d'Italia 2026", year: 2026, status: "finished", game_type: "giro" },
  { id: VROUWEN, name: "Meermarathon Vrouwen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "vrouwen" },
  { id: MANNEN, name: "Meermarathon Mannen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "mannen" },
];

type Plan = [nr: number, date: string, type: string, ijs: "kunstijs" | "natuurijs"];

const PLAN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs"],
  [2, "2026-11-07", "cup", "kunstijs"],
  [3, "2026-11-14", "cup", "kunstijs"],
  [4, "2026-11-21", "cup", "kunstijs"],
  [5, "2027-01-09", "grandprix", "natuurijs"],
  [6, "2027-02-06", "nk", "kunstijs"],
];
const GEREDEN = 3;

function wedstrijden(game: string): StageRow[] {
  return PLAN.map(([nr, date, type, ijs]) => ({
    id: `${game}-w${nr}`,
    game_id: game,
    stage_number: nr,
    name: null,
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

/** Stand na Cup 3. Een deel van de spelers doet bij allebei mee, een deel bij één. */
const STAND: Record<string, [user: string, naam: string, punten: number][]> = {
  [VROUWEN]: [
    ["u-marieke", "Marieke", 211],
    ["u-joost", "Joost", 204],
    ["u-anke", "Anke", 198],
    [MIJ, "Sanne", 187],
    ["u-nelleke", "Nelleke", 181],
    ["u-wouter", "Wouter", 176],
    ["u-ilse", "Ilse", 170],
    ["u-kees", "Kees", 163],
    ["u-fenna", "Fenna", 158],
    ["u-ruud", "Ruud", 152],
    ["u-tjitske", "Tjitske", 149],
    ["u-lotte", "Lotte", 141],
  ],
  [MANNEN]: [
    ["u-hidde", "Hidde", 223],
    ["u-kees", "Kees", 216],
    [MIJ, "Sanne", 201],
    ["u-bram", "Bram", 199],
    ["u-joost", "Joost", 188],
    ["u-gerrit", "Gerrit", 180],
    ["u-marieke", "Marieke", 171],
    ["u-pieter", "Pieter", 166],
    ["u-ruud", "Ruud", 160],
    ["u-wouter", "Wouter", 151],
    ["u-anke", "Anke", 144],
  ],
};

function entries(game: string): EntryStanding[] {
  return STAND[game].map(([user, naam, punten]) => ({
    id: `${game}-${user}`,
    user_id: user,
    team_name: null,
    display_name: naam,
    total_points: punten,
  }));
}

function stand(game: string): GameStandingRow[] {
  return STAND[game].map(([user, naam, punten], i) => ({
    entry_id: `${game}-${user}`,
    user_id: user,
    team_name: null,
    display_name: naam,
    cum_points: punten,
    pred_bonus: 0,
    total: punten,
    rank: i + 1,
    prev_rank: i + 1,
    delta: 0,
    stage_points: Math.round(punten / GEREDEN),
    stage_rank: null,
  }));
}

const SCHAATSERS: Record<string, string[]> = {
  [VROUWEN]: ["Anouk Visser", "Femke Hoekstra", "Iris Postma", "Nynke Wiersma", "Roos van Dijk", "Tess Kuipers"],
  [MANNEN]: ["Sjoerd de Vries", "Bart Hoekstra", "Gerben Postma", "Wouter Kramer", "Hessel Visser", "Daan Veenstra"],
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

const PELOTONS: TotaalPeloton[] = [
  { categorie: "vrouwen", gameId: VROUWEN, stand: "Cup 3", inschrijfbaar: false },
  { categorie: "mannen", gameId: MANNEN, stand: "Cup 3", inschrijfbaar: false },
];

function Kader({ uitleg, children }: { uitleg: string; children: ReactNode }) {
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="text-xs font-semibold text-muted-foreground">{uitleg}</figcaption>
      {/* ResultsView schakelt op de vensterbreedte, niet op dit kader: smal
          venster (telefoon-emulatie) = de telefoonversie. */}
      <div className="w-full max-w-[1160px] rounded-lg border border-dashed border-border bg-background px-3 py-4 md:px-5 md:py-6">
        {children}
      </div>
    </figure>
  );
}

export default function Scherm11Demo() {
  const qc = useQueryClient();
  // Vóór de eerste render: de view leest de cache meteen.
  useState(() => zetInCache(qc));
  const [gekozen, setGekozen] = useState<string>("totaal");

  const rijen = useMemo(
    () =>
      bouwTotaalklassement([
        { categorie: "vrouwen", rijen: STAND[VROUWEN].map(([user_id, display_name, punten]) => ({ user_id, display_name, team_name: null, punten })) },
        { categorie: "mannen", rijen: STAND[MANNEN].map(([user_id, display_name, punten]) => ({ user_id, display_name, team_name: null, punten })) },
      ]),
    [],
  );
  const mij = rijen.find((r) => r.user_id === MIJ)!;
  const items: PelotonItem[] = [
    { id: VROUWEN, label: "Vrouwen", categorie: "vrouwen", soort: "meedoen", regel: `${rangtekst(mij.vrouwen!.rank)} van ${STAND[VROUWEN].length}` },
    { id: MANNEN, label: "Mannen", categorie: "mannen", soort: "meedoen", regel: `${rangtekst(mij.mannen!.rank)} van ${STAND[MANNEN].length}` },
  ];
  const peloton = gekozen === "totaal" ? null : GAMES.find((g) => g.id === gekozen)!;

  return (
    <div className="space-y-10">
      <Kader uitleg="/uitslagen · Vrouwen, Mannen en Totaal (klik om te wisselen) · je bent Sanne, met een ploeg in allebei">
        {/* Zelfde opbouw en klassen als pages/Results.tsx. */}
        <GameSwitcher
          games={GAMES}
          selectedId={peloton?.id ?? MANNEN}
          onSelect={(id) => {
            if (id === VROUWEN || id === MANNEN) setGekozen(id);
          }}
          className="max-w-5xl mx-auto mb-4"
        />
        <div className="mb-2 md:mx-auto md:mb-4 md:max-w-2xl">
          <Pelotonbalk
            seizoen={"’26-’27"}
            items={items}
            selectedId={peloton?.id ?? MANNEN}
            onSelect={setGekozen}
            totaal={{ regel: totaalRegel(rijen, MIJ), gekozen: peloton == null, onSelect: () => setGekozen("totaal") }}
          />
        </div>
        {peloton ? (
          <ResultsView showHeader gameId={peloton.id} gameName={peloton.name} initialView="klassement" />
        ) : (
          <KoersThemaProvider themaKey="winter">
            <TotaalklassementWeergave seizoen="2026-2027" rijen={rijen} pelotons={PELOTONS} mijnUserId={MIJ} />
          </KoersThemaProvider>
        )}
      </Kader>

      <Kader uitleg="Stel je team samen · zoals nu op koerspoule.nl: alleen de mannen bestaan, dus de vrouwen staan er als 'Nog niet open'">
        <div className="md:mx-auto md:max-w-2xl">
          <Pelotonbalk
            seizoen={"’26-’27"}
            items={[
              { id: "volgt-vrouwen", label: "Vrouwen", categorie: "vrouwen", soort: "volgt", regel: "Nog niet open" },
              { id: MANNEN, label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "Ingeschreven" },
            ]}
            selectedId={MANNEN}
            onSelect={() => undefined}
          />
        </div>
      </Kader>

      <Kader uitleg="Stel je team samen · zodra de vrouwen in Beheer zijn aangemaakt (zonder Totaal: een ploeg bouw je per peloton)">
        <div className="md:mx-auto md:max-w-2xl">
          <Pelotonbalk
            seizoen={"’26-’27"}
            items={[
              { id: VROUWEN, label: "Vrouwen", categorie: "vrouwen", soort: "uitnodiging", regel: "Doe ook mee" },
              { id: MANNEN, label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "Ingeschreven" },
            ]}
            selectedId={MANNEN}
            onSelect={() => undefined}
          />
        </div>
      </Kader>
    </div>
  );
}
