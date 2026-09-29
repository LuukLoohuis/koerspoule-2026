/**
 * Testbank-demo voor scherm 12 (zie src/dev-meermarathon.tsx): de foto achter
 * de uitslagenbalk. Bij de vrouwen het vrouwenpeloton, bij de mannen het
 * mannenpeloton, met de naam van de fotograaf rechtsonder. Een game zonder
 * peloton (een oud seizoen) houdt de overzichtsfoto van de baan.
 * Nepdata, geen database.
 */
import { useState } from "react";
import WedstrijdBalk from "@/components/meermarathon/WedstrijdBalk";
import { bouwWedstrijdBalk, type BalkBron } from "@/lib/meermarathonBalk";
import type { MeermarathonCategorie } from "@/lib/gameTypes";
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
const GEREDEN = 3;

const SEIZOEN: BalkBron[] = PLAN.map(([nr, date, type, ijs]) => ({
  id: `w${nr}`,
  stage_number: nr,
  name: null,
  date,
  is_gc: false,
  results_status: nr <= GEREDEN ? "approved" : null,
  ijs_type: ijs,
  wedstrijd_type: type,
}));

const PUNTEN = new Map([54, 38, 61].map((p, i) => [`w${i + 1}`, p]));

function Voorbeeld({
  titel,
  peloton,
  ondertitel,
  breed = false,
}: {
  titel: string;
  peloton: MeermarathonCategorie | null;
  ondertitel: string;
  breed?: boolean;
}) {
  const [gekozen, setGekozen] = useState<string | null>(`w${GEREDEN}`);
  const { wedstrijden, totaal } = bouwWedstrijdBalk(SEIZOEN, PUNTEN, { heeftPloeg: true });
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
            kiesbaar={(w) => w.gereden}
            titel="Tussenstand selecteren"
            ondertitel={ondertitel}
            peloton={peloton}
          />
        </div>
      </div>
    </figure>
  );
}

export default function Scherm12Demo() {
  return (
    <div className="space-y-10">
      <Voorbeeld titel="Desktop · Vrouwen" peloton="vrouwen" ondertitel="Meermarathon Vrouwen 2026-2027" breed />
      <Voorbeeld titel="Desktop · Mannen" peloton="mannen" ondertitel="Meermarathon Mannen 2026-2027" breed />
      <div className="flex flex-wrap items-start gap-6">
        <Voorbeeld titel="Mobiel · Vrouwen" peloton="vrouwen" ondertitel="Meermarathon Vrouwen 2026-2027" />
        <Voorbeeld titel="Mobiel · Mannen" peloton="mannen" ondertitel="Meermarathon Mannen 2026-2027" />
        <Voorbeeld titel="Mobiel · game zonder peloton (oud seizoen)" peloton={null} ondertitel="Meermarathon 2025-2026" />
      </div>
    </div>
  );
}
