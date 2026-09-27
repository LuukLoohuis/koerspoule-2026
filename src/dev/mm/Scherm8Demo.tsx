/**
 * Testbank-demo voor scherm 8 (zie src/dev-meermarathon.tsx): de
 * wedstrijdenlijst in het beheer. Bij de Meermarathon geen kilometers en geen
 * terrein, wel de categorie; de wielerkoers eronder blijft zoals hij was.
 *
 * Zonder activeGameId schrijft het beheer niets weg: alles hier is nep.
 */
import StagesTab, { type Stage } from "@/components/admin/StagesTab";

type Plan = [nr: number, date: string | null, type: string, ijs: "kunstijs" | "natuurijs" | null, ronden: number | null];

const PLAN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs", 80],
  [2, "2026-11-07", "cup", "kunstijs", 80],
  [3, "2026-11-14", "cup", null, null],
  [6, "2027-01-09", "grandprix", "natuurijs", null],
  [8, null, "onk", "natuurijs", null],
  [9, "2027-02-06", "nk", "kunstijs", 100],
];

const WEDSTRIJDEN: Stage[] = PLAN.map(([nr, date, type, ijs, ronden]) => ({
  id: `demo-mm-${nr}`,
  game_id: "",
  stage_number: nr,
  // Cup 2 heeft nog de oude standaardnaam: die telt niet als eigen naam.
  name: nr === 2 ? "Etappe 2" : nr === 6 ? "Alternatieve Elfstedentocht" : null,
  date,
  status: nr <= 2 ? "finished" : "draft",
  stage_type: "vlak",
  distance_km: null,
  is_gc: false,
  ijs_type: ijs,
  wedstrijd_type: type,
  aantal_rondes: ronden,
}));

const RITTEN: Stage[] = [
  { id: "demo-t-1", game_id: "", stage_number: 1, name: "Lille → Lille", date: "2026-07-04", status: "finished", stage_type: "vlak", distance_km: 185, is_gc: false },
  { id: "demo-t-2", game_id: "", stage_number: 2, name: "Lauwin-Planque → Boulogne", date: "2026-07-05", status: "draft", stage_type: "heuvelachtig", distance_km: 209, is_gc: false },
  { id: "demo-t-3", game_id: "", stage_number: 3, name: "Caen → Caen", date: "2026-07-08", status: "draft", stage_type: "tijdrit", distance_km: 33, is_gc: false },
];

const niets = () => {};

export default function Scherm8Demo() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h3 className="m-0 font-inter text-base font-bold">Meermarathon · geen km, geen vlak of bergop, wel de categorie</h3>
        <div className="max-w-full overflow-x-auto">
          <div className="w-[1160px] rounded-lg border border-dashed border-border bg-background px-5 py-6">
            <StagesTab activeGameId="" stages={WEDSTRIJDEN} reload={niets} gameType="meermarathon" />
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="m-0 font-inter text-base font-bold">Ter vergelijking · een wielerkoers blijft zoals hij was</h3>
        <div className="max-w-full overflow-x-auto">
          <div className="w-[1160px] rounded-lg border border-dashed border-border bg-background px-5 py-6">
            <StagesTab activeGameId="" stages={RITTEN} reload={niets} gameType="tdf" />
          </div>
        </div>
      </section>
    </div>
  );
}
