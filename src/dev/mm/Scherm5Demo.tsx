/**
 * Testbank-demo voor scherm 5 (zie src/dev-meermarathon.tsx): Uitslagen met
 * Klassement · Kalender · Per wedstrijd. Nepdata, geen database.
 *
 * De weergave schakelt op zijn eigen breedte (container queries), dus een
 * 390px-kader toont de telefoonversie ook in een breed venster.
 */
import { useState } from "react";
import UitslagenMeermarathonWeergave, {
  type KlassementStand,
  type UitslagenSegment,
} from "@/components/meermarathon/UitslagenMeermarathonWeergave";
import { cn } from "@/lib/utils";
import type { KalenderRij } from "@/lib/meermarathonKalender";
import type { MmStandRij } from "@/lib/meermarathonKlassement";

const IK = "ik";

// ── Nepklassement: 1.204 ploegen, jij op 12 (zoals 05a/05b) ────────────────

const BOVENAAN: [string, string, number, number][] = [
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
  ["Sneeuwschuivers", "Bram", 149, 35],
  ["De Klapschaatsers", "Lotte", 146, 38],
  ["Koek-en-Zopie", "Sanne", 144, 29],
];

function maakStand(aantal: number, eigenPlek: number | null, delta = 4): MmStandRij[] {
  const rijen = Array.from({ length: aantal }, (_, i): Omit<MmStandRij, "rank"> => {
    const vast = BOVENAAN[i];
    const total = vast ? vast[2] : Math.max(0, Math.round(143 * (1 - (i - BOVENAAN.length) / aantal)));
    return {
      entry_id: `e${i}`,
      user_id: eigenPlek === i + 1 ? IK : `u${i}`,
      team_name: vast ? vast[0] : `IJsploeg ${i + 1}`,
      display_name: vast ? vast[1] : `Deelnemer ${i + 1}`,
      delta: eigenPlek === i + 1 ? delta : 0,
      total,
      stage_points: vast ? vast[3] : total % 40,
    };
  });
  // Zoals de RPC: gelijke punten delen hun plek.
  return rijen.map((r) => ({ ...r, rank: 1 + rijen.filter((x) => x.total > r.total).length }));
}

const STAND_12: KlassementStand = { soort: "stand", wedstrijdLabel: "Cup 2", rijen: maakStand(1204, 12), metBeweging: true };
const STAND_BUITEN: KlassementStand = { soort: "stand", wedstrijdLabel: "Cup 2", rijen: maakStand(1204, null), metBeweging: true };
const STAND_LEIDER_NA_1: KlassementStand = {
  soort: "stand",
  wedstrijdLabel: "Cup 1",
  rijen: maakStand(318, 1, 0),
  metBeweging: false,
};
const STAND_ZAKKER: KlassementStand = { soort: "stand", wedstrijdLabel: "Cup 2", rijen: maakStand(40, 7, -3), metBeweging: true };

// ── Nepkalender (zonder baan: die staat niet in de database) ──────────────

const KALENDER_BASIS: Omit<KalenderRij, "punten" | "volgende">[] = [
  { sleutel: "1", date: "2026-10-31", label: "Cup 1", detail: "Kunstijs · 80 / 125 ronden" },
  { sleutel: "2", date: "2026-11-07", label: "Cup 2", detail: "Kunstijs · 80 / 125 ronden" },
  { sleutel: "3", date: "2026-11-14", label: "Cup 3", detail: "Kunstijs · 80 / 125 ronden" },
  { sleutel: "4", date: "2026-11-21", label: "Cup 4", detail: "Kunstijs · 80 / 125 ronden" },
  { sleutel: "5", date: "2026-12-05", label: "Cup 5", detail: "Kunstijs · 80 / 125 ronden" },
  { sleutel: "6", date: "2027-01-09", label: "Grand Prix 6", detail: "Natuurijs · 60 / 100 km" },
  { sleutel: "7", date: "2027-01-16", label: "Grand Prix 7", detail: "Natuurijs · 60 / 100 km" },
  { sleutel: "8", date: null, label: "ONK", detail: "Natuurijs · als het vriest" },
  { sleutel: "9", date: "2027-02-06", label: "NK", detail: "Kunstijs · 100 / 150 ronden" },
];

function kalender(punten: (number | null)[], volgende: number): KalenderRij[] {
  return KALENDER_BASIS.map((r, i) => ({ ...r, punten: punten[i] ?? null, volgende: i === volgende }));
}

const KALENDER_MET_PUNTEN = kalender([54, 38], 2);
const KALENDER_ZONDER_PUNTEN = kalender([], 2);
const KALENDER_VOOR_START = kalender([], 0);

// ── Kaders ────────────────────────────────────────────────────────────────

function PerWedstrijdPlaatshouder() {
  return (
    <div className="rounded-lg border-2 border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      Hier staat de bestaande uitslag per wedstrijd (ResultsView, geopend op de wedstrijden).
    </div>
  );
}

function Voorbeeld({
  titel,
  breed = false,
  smal = false,
  categorieLabel = "Vrouwen",
  stand,
  kalender: rijen,
  eigenUserId = IK,
  start = "klassement",
}: {
  titel: string;
  breed?: boolean;
  /** Desktop naast de zijkolom van Mijn Peloton: ±736px. */
  smal?: boolean;
  categorieLabel?: string | null;
  stand: KlassementStand;
  kalender: KalenderRij[] | null;
  eigenUserId?: string | null;
  start?: UitslagenSegment;
}) {
  const [segment, setSegment] = useState<UitslagenSegment>(start);
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="text-xs font-semibold text-muted-foreground">{titel}</figcaption>
      <div className="max-w-full overflow-x-auto">
        <div
          className={cn(
            "shrink-0 rounded-lg border border-dashed border-border bg-background",
            breed ? "w-[1160px] px-5 py-6" : smal ? "w-[736px] px-5 py-6" : "w-[390px] px-3 py-4",
          )}
        >
          <UitslagenMeermarathonWeergave
            categorieLabel={categorieLabel}
            stand={stand}
            eigenUserId={eigenUserId}
            kalender={rijen}
            segment={segment}
            onSegment={setSegment}
            perWedstrijd={<PerWedstrijdPlaatshouder />}
          />
        </div>
      </div>
    </figure>
  );
}

export default function Scherm5Demo() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start gap-6">
        <Voorbeeld titel="Mobiel · jij op 12 (05a)" stand={STAND_12} kalender={KALENDER_MET_PUNTEN} />
        <Voorbeeld
          titel="Mobiel · Mannen, jij aan de leiding na de eerste wedstrijd (geen ▲)"
          categorieLabel="Mannen"
          stand={STAND_LEIDER_NA_1}
          kalender={kalender([61], 1)}
        />
        <Voorbeeld titel="Mobiel · gezakt, jij vlak onder de top" stand={STAND_ZAKKER} kalender={KALENDER_MET_PUNTEN} />
        <Voorbeeld
          titel="Mobiel · doet niet mee: geen jouw-plek-kaart"
          stand={STAND_BUITEN}
          eigenUserId={null}
          kalender={KALENDER_ZONDER_PUNTEN}
        />
        <Voorbeeld
          titel="Mobiel · nog geen uitslag"
          stand={{ soort: "leeg", volgende: { label: "Cup 1", dag: "za 31 okt" } }}
          kalender={KALENDER_VOOR_START}
        />
        <Voorbeeld titel="Mobiel · laden" stand={{ soort: "laden" }} kalender={null} />
        <Voorbeeld titel="Mobiel · fout bij laden" stand={{ soort: "fout" }} kalender={KALENDER_MET_PUNTEN} />
        <Voorbeeld titel="Mobiel · segment Kalender" stand={STAND_12} kalender={KALENDER_MET_PUNTEN} start="kalender" />
        <Voorbeeld titel="Mobiel · segment Per wedstrijd" stand={STAND_12} kalender={KALENDER_MET_PUNTEN} start="wedstrijd" />
      </div>

      <Voorbeeld titel="Desktop · jij op 12 (05b)" breed stand={STAND_12} kalender={KALENDER_MET_PUNTEN} />
      <Voorbeeld
        titel="Desktop naast de zijkolom (±736px): kalender onder het klassement"
        smal
        stand={STAND_12}
        kalender={KALENDER_MET_PUNTEN}
      />
      <Voorbeeld
        titel="Desktop · nog geen uitslag"
        breed
        stand={{ soort: "leeg", volgende: { label: "Cup 1", dag: "za 31 okt" } }}
        kalender={KALENDER_VOOR_START}
      />
      <Voorbeeld titel="Desktop · segment Kalender" breed stand={STAND_12} kalender={KALENDER_MET_PUNTEN} start="kalender" />
    </div>
  );
}
