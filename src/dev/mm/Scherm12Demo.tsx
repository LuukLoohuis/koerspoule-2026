/**
 * Testbank-demo voor scherm 12 (zie src/dev-meermarathon.tsx): de foto achter
 * de uitslagenbalk, het peloton in de mist, met de naam van de fotograaf
 * rechtsonder. Voor licht en nacht: de knop bovenin de testbank.
 * Nepdata, geen database.
 */
import { useState } from "react";
import WedstrijdBalk from "@/components/meermarathon/WedstrijdBalk";
import { bouwWedstrijdBalk, type BalkBron } from "@/lib/meermarathonBalk";
import { cn } from "@/lib/utils";

type Plan = [nr: number, date: string | null, type: string, ijs: "kunstijs" | "natuurijs", naam?: string];

const SEIZOEN: Plan[] = [
  [1, "2026-10-31", "cup", "kunstijs"],
  [2, "2026-11-07", "cup", "kunstijs"],
  [3, "2026-11-14", "cup", "kunstijs"],
  [4, "2026-11-21", "cup", "kunstijs"],
  [5, "2026-12-05", "cup", "kunstijs"],
  [6, "2027-01-09", "grandprix", "natuurijs"],
  [7, "2027-01-16", "grandprix", "natuurijs"],
  [8, null, "onk", "natuurijs"],
  [9, "2027-02-06", "nk", "kunstijs"],
];

/** Zoals nu op de site: twee wedstrijden op de kalender, nog niets gereden. */
const BEGIN: Plan[] = [
  [1, null, "cup", "kunstijs", "Amsterdam"],
  [2, null, "grandprix", "natuurijs"],
];

function bronnen(plan: Plan[], gereden: number): BalkBron[] {
  return plan.map(([nr, date, type, ijs, naam]) => ({
    id: `w${nr}`,
    stage_number: nr,
    name: naam ?? null,
    date,
    is_gc: false,
    results_status: nr <= gereden ? "approved" : null,
    ijs_type: ijs,
    wedstrijd_type: type,
  }));
}

function Voorbeeld({
  titel,
  plan = SEIZOEN,
  gereden = 3,
  scores = [54, 38, 61],
  ondertitel = "Meermarathon Mannen 2026-2027",
  breed = false,
}: {
  titel: string;
  plan?: Plan[];
  gereden?: number;
  scores?: number[];
  ondertitel?: string;
  breed?: boolean;
}) {
  const [gekozen, setGekozen] = useState<string | null>(`w${Math.max(1, gereden)}`);
  const punten = new Map(scores.map((p, i) => [`w${i + 1}`, p]));
  const { wedstrijden, totaal } = bouwWedstrijdBalk(bronnen(plan, gereden), punten, { heeftPloeg: true });
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="text-xs font-semibold text-muted-foreground">{titel}</figcaption>
      <div className="max-w-full overflow-x-auto">
        <div
          className={cn(
            "shrink-0 rounded-lg border border-dashed border-border bg-background",
            breed ? "w-[1160px] px-5 py-6" : "w-[390px] px-3 py-4",
          )}
        >
          <WedstrijdBalk
            wedstrijden={wedstrijden}
            totaal={totaal}
            gekozenId={gekozen}
            onKies={setGekozen}
            titel="Tussenstand selecteren"
            ondertitel={ondertitel}
          />
        </div>
      </div>
    </figure>
  );
}

export default function Scherm12Demo() {
  return (
    <div className="space-y-10">
      <Voorbeeld titel="Desktop · zoals nu op de site: twee wedstrijden, nog niets gereden" plan={BEGIN} gereden={0} scores={[]} breed />
      <Voorbeeld titel="Desktop · halverwege het seizoen, Cup 3 gekozen" breed />
      <div className="flex flex-wrap items-start gap-6">
        <Voorbeeld titel="Mobiel · halverwege het seizoen" ondertitel="Meermarathon Vrouwen 2026-2027" />
        <Voorbeeld titel="Mobiel · nog niets gereden" plan={BEGIN} gereden={0} scores={[]} />
      </div>
    </div>
  );
}
