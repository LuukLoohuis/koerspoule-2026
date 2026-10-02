/**
 * Testbank-demo voor scherm 15 (zie src/dev-meermarathon.tsx): het
 * koersreglement bij de Meermarathon. Geen jokers, geen podium of truien,
 * wel de pronostiek en de weging per wedstrijd. Nepdata, geen database.
 */
import type { ReactNode } from "react";
import RegelsWeergave from "@/components/RegelsWeergave";
import type { CategoryWithRiders } from "@/hooks/useCategories";
import { wegingPerSoort } from "@/lib/wegingsfactor";

const SCHEMA = [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((points, i) => ({
  position: i + 1,
  points,
}));

// Kalender met de weging zoals de beheerder hem zou instellen: Grand Prix' en
// het ONK dubbel, de rest gewoon.
const WEDSTRIJDEN = [
  ...[1, 2, 3, 4, 5].map((nr) => ({ stage_number: nr, wedstrijd_type: "cup", ijs_type: "kunstijs", wegingsfactor: 1 })),
  { stage_number: 6, wedstrijd_type: "grandprix", ijs_type: "natuurijs", wegingsfactor: 2 },
  { stage_number: 7, wedstrijd_type: "grandprix", ijs_type: "natuurijs", wegingsfactor: 2 },
  { stage_number: 8, wedstrijd_type: "onk", ijs_type: "natuurijs", wegingsfactor: 2 },
  { stage_number: 9, wedstrijd_type: "nk", ijs_type: "kunstijs", wegingsfactor: 1 },
];

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
    wegingGroepen: wegingPerSoort(WEDSTRIJDEN),
    pronostiekPunten: 50,
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
