/**
 * Testbank-demo voor scherm 15 (zie src/dev-meermarathon.tsx): het
 * koersreglement bij de Meermarathon. Geen jokers, geen podium of truien,
 * wel de pronostiek en de weging per wedstrijd. Nepdata, geen database.
 */
import type { ReactNode } from "react";
import RegelsWeergave from "@/components/RegelsWeergave";
import type { CategoryWithRiders } from "@/hooks/useCategories";
import { wegingPerFactor } from "@/lib/wegingsfactor";

const SCHEMA = [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((points, i) => ({
  position: i + 1,
  points,
}));

// De kalender zoals hij op 2026-10-02 bij de mannen op productie stond, met de
// weging uit Beheer (×0,5 voor Vierdaagse dag 1 t/m ×2 voor ONK en Weissensee).
const KALENDER: [nr: number, naam: string, soort: string, weging: number][] = [
  [1, "Cup 1 Amsterdam", "cup", 1], [2, "Cup 2 Utrecht", "cup", 1], [3, "Cup 3 Heerenveen", "cup", 1],
  [4, "Cup 4 Heerenveen", "cup", 1], [5, "Cup 5 Haarlem", "cup", 1], [6, "Cup 6 Hoorn", "cup", 1],
  [7, "Cup 7 Den Haag", "cup", 1], [8, "Vierdaagse dag 1 Hoorn", "cup", 0.5], [9, "Vierdaagse dag 2 Alkmaar", "cup", 0.75],
  [10, "Vierdaagse dag 3 Amsterdam", "cup", 1], [11, "Vierdaagse dag 4 Haarlem", "cup", 1.5], [12, "Cup 8 Breda", "cup", 1],
  [13, "Nederlands Kampioenschap", "nk", 1.5], [14, "Cup 9 Tilburg", "cup", 1], [15, "Cup 10 Eindhoven", "cup", 1],
  [16, "Grand Prix 1", "grandprix", 1], [17, "Open Nederlands Kampioenschap", "onk", 2], [18, "Grand Prix 2", "grandprix", 1.5],
  [19, "Grand Prix 3 Alternatieve Elfstedentocht Weissensee", "grandprix", 2], [20, "Cup 11 Alkmaar", "cup", 1],
  [21, "Cup 12 Groningen", "cup", 1], [22, "Cup Finale Leeuwarden", "cup", 1], [23, "Grand Prix 4", "grandprix", 1.5],
  [24, "Grand Prix 5", "grandprix", 1.5], [25, "Grand Prix Finale", "grandprix", 2],
];
const WEDSTRIJDEN = KALENDER.map(([stage_number, name, wedstrijd_type, wegingsfactor]) => ({ stage_number, name, wedstrijd_type, wegingsfactor }));

const NAMEN: [string, string[]][] = [
  ["Gratis punten", ["Lotte Bosma", "Iris Kooistra"]],
  ["Sprinters 1", ["Femke Dijkstra", "Anouk Postma", "Marit Hoekstra"]],
  ["Sprinters 2", ["Sanne de Vries", "Ilse Zijlstra", "Jet Wiersma"]],
  ["Natuurijs 1", ["Roos Kuipers", "Fenna Sikkema", "Tessa Adema"]],
  ["Natuurijs 2", ["Maaike Nauta", "Rixt Mulder", "Wendy Boonstra"]],
  ["Beukers", ["Evi Hylkema", "Lieke Bakker", "Noor Visser"]],
];

const CATEGORIEEN = NAMEN.map(([name, rijders], i) => ({
  id: `c${i}`,
  name,
  short_name: null,
  sort_order: i + 1,
  max_picks: 1,
  game_id: "demo-mm",
  category_riders: rijders.map((naam, j) => ({
    rider_id: `r${i}-${j}`,
    riders: { id: `r${i}-${j}`, name: naam, start_number: null, team_id: null, firstcycling_id: null },
  })),
})) as unknown as CategoryWithRiders[];

function Blok({ titel, breedte, children }: { titel: string; breedte: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="m-0 font-inter text-base font-bold">{titel}</h3>
      <div className="rounded-xl border border-dashed border-border bg-background" style={{ width: breedte }}>
        {children}
      </div>
    </section>
  );
}

export default function Scherm15Demo() {
  const props = {
    meermarathon: true,
    gameNaam: "Meermarathon 2026-2027",
    categories: CATEGORIEEN,
    categoriesLoading: false,
    stagePoints: SCHEMA,
    schemaLoading: false,
    wegingGroepen: wegingPerFactor(WEDSTRIJDEN),
    pronostiekPunten: 50,
    seizoen: "26/27",
  };
  return (
    <div className="space-y-10">
      <Blok titel="Koersreglement · Meermarathon, desktop" breedte={1000}>
        <RegelsWeergave {...props} />
      </Blok>
      <Blok titel="Koersreglement · Meermarathon, telefoon 390" breedte={390}>
        <RegelsWeergave {...props} />
      </Blok>
    </div>
  );
}
