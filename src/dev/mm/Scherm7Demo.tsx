/**
 * Testbank-demo voor scherm 7 (zie src/dev-meermarathon.tsx): de uitslagenbalk
 * met de vier wedstrijdsoorten. Nepdata, geen database.
 */
import { useState } from "react";
import WedstrijdBalk from "@/components/meermarathon/WedstrijdBalk";
import { bouwWedstrijdBalk, type BalkBron } from "@/lib/meermarathonBalk";
import { cn } from "@/lib/utils";

type Plan = [nr: number, date: string | null, type: string, ijs: "kunstijs" | "natuurijs"];

const PLAN: Plan[] = [
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

function seizoen(gereden: number): BalkBron[] {
  return PLAN.map(([nr, date, type, ijs]) => ({
    id: `w${nr}`,
    stage_number: nr,
    name: null,
    date,
    is_gc: false,
    results_status: nr <= gereden ? "approved" : null,
    ijs_type: ijs,
    wedstrijd_type: type,
  }));
}

const punten = (rij: number[]) => new Map(rij.map((p, i) => [`w${i + 1}`, p]));

function Voorbeeld({
  titel,
  breed = false,
  gereden,
  scores,
  heeftPloeg = true,
  start,
  ondertitel = "Meermarathon Vrouwen 2026-2027",
}: {
  titel: string;
  breed?: boolean;
  gereden: number;
  scores: number[];
  heeftPloeg?: boolean;
  start: string;
  ondertitel?: string;
}) {
  const [gekozen, setGekozen] = useState<string | null>(start);
  const { wedstrijden, totaal } = bouwWedstrijdBalk(seizoen(gereden), punten(scores), { heeftPloeg });
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
            ondertitel={ondertitel}
          />
        </div>
      </div>
    </figure>
  );
}

export default function Scherm7Demo() {
  return (
    <div className="space-y-10">
      <Voorbeeld titel="Desktop · halverwege het seizoen, Cup 3 gekozen" breed gereden={3} scores={[54, 38, 61]} start="w3" />
      <div className="flex flex-wrap items-start gap-6">
        <Voorbeeld titel="Mobiel · halverwege het seizoen" gereden={3} scores={[54, 38, 61]} start="w3" />
        <Voorbeeld titel="Mobiel · seizoen klaar, NK gekozen" gereden={9} scores={[54, 38, 61, 0, 47, 72, 33, 58, 90]} start="w9" />
        <Voorbeeld
          titel="Mobiel · Mannen, geen ploeg: alleen meekijken"
          gereden={3}
          scores={[]}
          heeftPloeg={false}
          start="w3"
          ondertitel="Meermarathon Mannen 2026-2027"
        />
        <Voorbeeld titel="Mobiel · voor de eerste wedstrijd" gereden={0} scores={[]} start="w1" />
      </div>
      <Voorbeeld titel="Desktop · seizoen klaar" breed gereden={9} scores={[54, 38, 61, 0, 47, 72, 33, 58, 90]} start="w8" />
    </div>
  );
}
