/**
 * Testbank-demo voor scherm 14 (zie src/dev-meermarathon.tsx): de weging.
 * Elke wedstrijd heeft een factor; de Grand Prix telt hier dubbel. Het beheer
 * stelt hem in, en overal waar punten per wedstrijd of per rijder staan, telt
 * hij mee. Nepdata, geen database: zonder activeGameId schrijft het beheer niets.
 */
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StagesTab, { type Stage } from "@/components/admin/StagesTab";
import WedstrijdBalk from "@/components/meermarathon/WedstrijdBalk";
import WedstrijdKalender from "@/components/meermarathon/WedstrijdKalender";
import Voorbeschouwing from "@/components/karavaan/Voorbeschouwing";
import { KALENDER_ONDERTITEL } from "@/components/meermarathon/UitslagenMeermarathonWeergave";
import type { KalenderRij } from "@/lib/meermarathonKalender";
import LiveTab from "@/components/meermarathon/LiveTab";
import RiderStageBreakdown from "@/components/teamsheet/RiderStageBreakdown";
import { WedstrijdLabelsProvider, type WedstrijdLabel } from "@/contexts/WedstrijdLabelsContext";
import { riderStagePointsQuery, type RiderStagePointsRow } from "@/hooks/useRiderStagePoints";
import { bouwWedstrijdBalk } from "@/lib/meermarathonBalk";
import { meermarathonStageLabel, wedstrijdTypeVan } from "@/lib/gameTypes";
import { wegingVan } from "@/lib/wegingsfactor";
import { Frame, GEDEELD, ontwerpRace } from "@/dev/mm/Scherm4Demo";

type Plan = [nr: number, date: string, type: string, ijs: "kunstijs" | "natuurijs", gereden: boolean, weging: number];

const PLAN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs", true, 1],
  [2, "2026-11-07", "cup", "kunstijs", true, 1],
  [3, "2027-01-09", "grandprix", "natuurijs", true, 2],
  [4, "2027-01-16", "cup", "kunstijs", false, 1],
  [5, "2027-01-23", "grandprix", "natuurijs", false, 2],
  [6, "2027-02-06", "nk", "kunstijs", false, 1.5],
];

const WEDSTRIJDEN: Stage[] = PLAN.map(([nr, date, type, ijs, gereden, weging]) => ({
  id: `demo-w-${nr}`,
  game_id: "",
  stage_number: nr,
  name: null,
  date,
  status: gereden ? "finished" : "draft",
  is_gc: false,
  ijs_type: ijs,
  wedstrijd_type: type,
  aantal_rondes: ijs === "kunstijs" ? 80 : null,
  wegingsfactor: weging,
  results_status: gereden ? "approved" : "draft",
}));

// Jouw ploeg scoorde 42 en 30 op de cups en 120 op de Grand Prix (60 × 2).
const PUNTEN = new Map([
  ["demo-w-1", 42],
  ["demo-w-2", 30],
  ["demo-w-3", 120],
]);

const BALK = bouwWedstrijdBalk(
  WEDSTRIJDEN.map((s) => ({ ...s, date: s.date ?? null, is_gc: false, results_status: s.results_status ?? null })),
  PUNTEN,
  { heeftPloeg: true },
);

const LABELS = new Map<number, WedstrijdLabel>(
  WEDSTRIJDEN.map((s) => [
    s.stage_number,
    { label: meermarathonStageLabel({ ...s, name: null }), soort: wedstrijdTypeVan(s), weging: wegingVan(s) },
  ]),
);

// Race-dossier van één rijder, zoals rider_stage_points het levert: base_points
// is het schema, total_points is al gewogen.
const DOSSIER: RiderStagePointsRow[] = [
  { stage_id: "demo-w-1", stage_number: 1, stage_name: null, stage_type: null, finish_position: 4, base_points: 26, multiplier: 1, total_points: 26 },
  { stage_id: "demo-w-2", stage_number: 2, stage_name: null, stage_type: null, finish_position: null, base_points: 0, multiplier: 1, total_points: 0 },
  { stage_id: "demo-w-3", stage_number: 3, stage_name: null, stage_type: null, finish_position: 1, base_points: 50, multiplier: 1, total_points: 100 },
];

/** Krant › Voorbeschouwing op de komende Grand Prix: eigen cache, geen database. */
const krantClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
krantClient.setQueryData(["voorbeschouwing-enabled", "demo-mm"], true);
krantClient.setQueryData(["voorbeschouwing-stage", "demo-mm"], {
  id: "demo-w-5",
  stage_number: 5,
  name: null,
  date: "2027-01-23",
  stage_type: null,
  distance_km: 100,
  results_status: "draft",
  wedstrijd_type: "grandprix",
  ijs_type: "natuurijs",
  wegingsfactor: 2,
  profile_image_url: null,
});

/** Eigen cache met het dossier erin: de testbank heeft geen database. */
const dossierClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
dossierClient.setQueryData(riderStagePointsQuery("demo-mm", "demo-lotte", "demo-entry").queryKey, DOSSIER);

const niets = () => {};

// Kalender zoals onder Mijn Peloton › Uitslagen: de Grand Prix' tellen dubbel,
// het NK anderhalf keer -- al te zien voordat ze gereden zijn.
const KALENDER: KalenderRij[] = [
  { sleutel: "1", date: "2026-10-31", label: "Cup 1", soort: "cup", detail: "Kunstijs · 80 / 125 ronden", punten: 42, volgende: false, weging: 1 },
  { sleutel: "2", date: "2026-11-07", label: "Cup 2", soort: "cup", detail: "Kunstijs · 80 / 125 ronden", punten: 30, volgende: false, weging: 1 },
  { sleutel: "3", date: "2027-01-09", label: "Grand Prix 3", soort: "grandprix", detail: "Natuurijs · 60 / 100 km", punten: 120, volgende: false, weging: 2 },
  { sleutel: "4", date: "2027-01-16", label: "Cup 4", soort: "cup", detail: "Kunstijs · 80 / 125 ronden", punten: null, volgende: true, weging: 1 },
  { sleutel: "5", date: "2027-01-23", label: "Grand Prix 5", soort: "grandprix", detail: "Natuurijs · 60 / 100 km", punten: null, volgende: false, weging: 2 },
  { sleutel: "6", date: "2027-02-06", label: "NK", soort: "nk", detail: "Kunstijs · 100 / 150 ronden", punten: null, volgende: false, weging: 1.5 },
];

function Blok({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="m-0 font-inter text-base font-bold">{titel}</h3>
      {children}
    </section>
  );
}

export default function Scherm14Demo() {
  const live = { ...ontwerpRace(new Date().toISOString()), stageId: "demo-w-3", stageNumber: 3, ijsType: "natuurijs" };
  return (
    <div className="space-y-10">
      <Blok titel="Beheer › Wedstrijden · weging per wedstrijd (Grand Prix ×2, NK ×1,5)">
        <div className="max-w-full overflow-x-auto">
          <div className="w-[1160px] rounded-lg border border-dashed border-border bg-background px-5 py-6">
            <StagesTab activeGameId="" stages={WEDSTRIJDEN} reload={niets} gameType="meermarathon" />
          </div>
        </div>
      </Blok>

      <Blok titel="Mijn Peloton › Uitslagen › Kalender · bij elke wedstrijd die zwaarder telt, al vóór de start">
        <div className="flex flex-wrap items-start gap-8">
          <Frame label="mobiel 390" breedte="mobiel">
            <WedstrijdKalender rijen={KALENDER} ondertitel={KALENDER_ONDERTITEL} />
          </Frame>
        </div>
      </Blok>

      <Blok titel="Krant › Voorbeschouwing · de komende Grand Prix telt dubbel">
        <div className="w-[390px] rounded-xl border border-dashed border-border bg-background px-3 py-4">
          <QueryClientProvider client={krantClient}>
            <Voorbeschouwing gameId="demo-mm" gameType="meermarathon" jaar={2026} />
          </QueryClientProvider>
        </div>
      </Blok>

      <Blok titel="Uitslagen · merkje op elk balkje dat zwaarder telt; de gekozen wedstrijd zegt het voluit">
        <div className="flex flex-wrap items-start gap-8">
          <Frame label="mobiel 390" breedte="mobiel">
            <WedstrijdBalk wedstrijden={BALK.wedstrijden} totaal={BALK.totaal} gekozenId="demo-w-3" onKies={niets} />
          </Frame>
          <Frame label="desktop 1280" breedte="desktop">
            <WedstrijdBalk wedstrijden={BALK.wedstrijden} totaal={BALK.totaal} gekozenId="demo-w-3" onKies={niets} />
          </Frame>
        </div>
      </Blok>

      <Blok titel="Volgwagen › Mijn ploeg · race-dossier onder een rijder: 1e in de Grand Prix = 50 × 2">
        <div className="w-[390px] rounded-xl border border-dashed border-border bg-background px-3 py-4">
          <QueryClientProvider client={dossierClient}>
            <WedstrijdLabelsProvider labels={LABELS}>
              <RiderStageBreakdown
                open
                riderId="demo-lotte"
                riderName="Lotte Bosma"
                category="GC"
                gameId="demo-mm"
                entryId="demo-entry"
              />
            </WedstrijdLabelsProvider>
          </QueryClientProvider>
        </div>
      </Blok>

      <Blok titel="Volgwagen › Live · Grand Prix 3 telt dubbel: voorlopige punten ×2, de schaal zegt waarom">
        <div className="flex flex-wrap items-start gap-8">
          <Frame label="mobiel 390" breedte="mobiel">
            <LiveTab race={live} {...GEDEELD} wedstrijdType="grandprix" weging={2} />
          </Frame>
        </div>
      </Blok>
    </div>
  );
}
