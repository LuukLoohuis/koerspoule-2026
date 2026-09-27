/**
 * Testbank-demo voor scherm 6 (zie src/dev-meermarathon.tsx): de Meermarathon
 * als één game met twee pelotons. De pelotonbalk, en hoe hij samen met de
 * uitslagen op het scherm staat. Waar je meerijdt, kies je in de ploegbouwer
 * (scherm 2). Nepdata, geen database.
 */
import { useState, type ReactNode } from "react";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import UitslagenMeermarathonWeergave, {
  type KlassementStand,
  type UitslagenSegment,
} from "@/components/meermarathon/UitslagenMeermarathonWeergave";
import WedstrijdBalk from "@/components/meermarathon/WedstrijdBalk";
import { bouwWedstrijdBalk, type BalkBron } from "@/lib/meermarathonBalk";
import type { KalenderRij } from "@/lib/meermarathonKalender";
import type { MmStandRij } from "@/lib/meermarathonKlassement";
import { cn } from "@/lib/utils";

const SEIZOEN = "’26-’27";

// ── Pelotonbalk ───────────────────────────────────────────────────────────

const V: Pick<PelotonItem, "id" | "label" | "categorie"> = { id: "v", label: "Vrouwen", categorie: "vrouwen" };
const M: Pick<PelotonItem, "id" | "label" | "categorie"> = { id: "m", label: "Mannen", categorie: "mannen" };

const STATEN: { titel: string; items: PelotonItem[]; start?: string }[] = [
  {
    titel: "Je doet mee bij allebei",
    items: [
      { ...V, soort: "meedoen", regel: "12e van 1.204" },
      { ...M, soort: "meedoen", regel: "48e van 986" },
    ],
  },
  {
    titel: "Alleen bij de vrouwen: de mannen nodigen uit",
    items: [
      { ...V, soort: "meedoen", regel: "12e van 1.204" },
      { ...M, soort: "uitnodiging", regel: "Doe ook mee" },
    ],
  },
  {
    titel: "Mannenploeg nog niet af",
    items: [
      { ...V, soort: "meedoen", regel: "Ingeschreven" },
      { ...M, soort: "let-op", regel: "Ploeg 3/5" },
    ],
    start: "m",
  },
  {
    titel: "Wedstrijdavond: er wordt gereden",
    items: [
      { ...V, soort: "meedoen", regel: "12e van 1.204", moment: "live" },
      { ...M, soort: "meedoen", regel: "48e van 986", moment: "live" },
    ],
  },
  {
    titel: "Wedstrijddag, nog niet begonnen",
    items: [
      { ...V, soort: "meedoen", regel: "12e van 1.204", moment: "vandaag" },
      { ...M, soort: "let-op", regel: "Ploeg 3/5", moment: "vandaag" },
    ],
  },
  {
    titel: "Je stand laadt nog",
    items: [
      { ...V, soort: "meekijken", regel: null },
      { ...M, soort: "meekijken", regel: null },
    ],
  },
  {
    titel: "Nog nergens ingeschreven",
    items: [
      { ...V, soort: "uitnodiging", regel: "Doe mee" },
      { ...M, soort: "uitnodiging", regel: "Doe mee" },
    ],
  },
  {
    titel: "Inschrijving gesloten, alleen meekijken bij de mannen",
    items: [
      { ...V, soort: "meedoen", regel: "12e van 1.204" },
      { ...M, soort: "meekijken", regel: "Meekijken" },
    ],
  },
];

function Kader({ label, breed = false, children }: { label: string; breed?: boolean; children: ReactNode }) {
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="text-xs font-semibold text-muted-foreground">{label}</figcaption>
      <div className="max-w-full overflow-x-auto">
        <div
          className={cn(
            "shrink-0 rounded-lg border border-dashed border-border bg-background",
            breed ? "w-[1160px] px-5 py-6" : "w-[390px] px-3 py-4",
          )}
        >
          {children}
        </div>
      </div>
    </figure>
  );
}

function BalkVoorbeeld({ items, start = "v", breed }: { items: PelotonItem[]; start?: string; breed?: boolean }) {
  const [gekozen, setGekozen] = useState(start);
  return (
    <Pelotonbalk
      seizoen={SEIZOEN}
      items={items}
      selectedId={gekozen}
      onSelect={setGekozen}
      className={breed ? "mx-auto max-w-2xl" : undefined}
    />
  );
}

// ── Samen op het scherm ───────────────────────────────────────────────────

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

const WEDSTRIJDEN: BalkBron[] = PLAN.map(([nr, date, type, ijs]) => ({
  id: `w${nr}`,
  stage_number: nr,
  name: null,
  date,
  is_gc: false,
  results_status: nr <= 3 ? "approved" : null,
  ijs_type: ijs,
  wedstrijd_type: type,
}));

const KALENDER: KalenderRij[] = PLAN.map(([nr, date, type, ijs]) => ({
  sleutel: String(nr),
  date,
  label: type === "onk" ? "ONK" : type === "nk" ? "NK" : `${type === "cup" ? "Cup" : "Grand Prix"} ${nr}`,
  soort: type as KalenderRij["soort"],
  detail: ijs === "kunstijs" ? "Kunstijs" : date ? "Natuurijs" : "Natuurijs · als het vriest",
  punten: null,
  volgende: nr === 4,
}));

const PLOEGEN = ["Ronde om Loosdrecht", "IJzersterk", "Kou op de Kop", "Team Bevroren Sloot", "Natuurijs Nelleke", "Klunen naar de Finish", "Het Snelle Schaatsje"];

function stand(aantal: number, eigenPlek: number, eigenNaam: string, top: number): MmStandRij[] {
  return Array.from({ length: aantal }, (_, i) => ({
    entry_id: `e${i}`,
    user_id: i + 1 === eigenPlek ? "ik" : `u${i}`,
    team_name: i + 1 === eigenPlek ? eigenNaam : PLOEGEN[i] ?? `IJsploeg ${i + 1}`,
    display_name: i + 1 === eigenPlek ? "Luuk" : `Deelnemer ${i + 1}`,
    rank: i + 1,
    delta: i + 1 === eigenPlek ? 4 : 0,
    total: Math.max(0, top - i * 3),
    stage_points: Math.max(0, 61 - (i % 9) * 5),
  }));
}

const PELOTON = {
  v: {
    label: "Vrouwen",
    punten: new Map([["w1", 54], ["w2", 38], ["w3", 61]]),
    stand: stand(1204, 12, "IJzeren Hein", 186),
  },
  m: {
    label: "Mannen",
    punten: new Map([["w1", 22], ["w2", 47], ["w3", 30]]),
    stand: stand(986, 48, "De Klapschaatsers", 243),
  },
} as const;

function SamenVoorbeeld({ breed }: { breed?: boolean }) {
  const [peloton, setPeloton] = useState<"v" | "m">("v");
  const [segment, setSegment] = useState<UitslagenSegment>("wedstrijd");
  const [wedstrijd, setWedstrijd] = useState<string | null>("w3");
  const p = PELOTON[peloton];
  const balk = bouwWedstrijdBalk(WEDSTRIJDEN, p.punten, { heeftPloeg: true });
  const klassement: KlassementStand = { soort: "stand", wedstrijdLabel: "Cup 3", rijen: p.stand, metBeweging: true };
  const kalender = KALENDER.map((r) => ({ ...r, punten: p.punten.get(`w${r.sleutel}`) ?? null }));

  return (
    <div className="space-y-4">
      <Pelotonbalk
        seizoen={SEIZOEN}
        items={[
          { ...V, soort: "meedoen", regel: "12e van 1.204" },
          { ...M, soort: "meedoen", regel: "48e van 986" },
        ]}
        selectedId={peloton}
        onSelect={(id) => setPeloton(id as "v" | "m")}
        className={breed ? "mx-auto max-w-2xl" : undefined}
      />
      <UitslagenMeermarathonWeergave
        categorieLabel={p.label}
        stand={klassement}
        eigenUserId="ik"
        kalender={kalender}
        segment={segment}
        onSegment={setSegment}
        perWedstrijd={
          <WedstrijdBalk
            wedstrijden={balk.wedstrijden}
            totaal={balk.totaal}
            gekozenId={wedstrijd}
            onKies={setWedstrijd}
            onKiesTotaal={() => setSegment("klassement")}
            ondertitel={`Meermarathon ${p.label} 2026-2027`}
          />
        }
      />
    </div>
  );
}

// ── Het scherm ────────────────────────────────────────────────────────────

function Tussenkop({ children, uitleg }: { children: ReactNode; uitleg?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="m-0 font-inter text-base font-bold">{children}</h3>
      {uitleg && <p className="m-0 max-w-3xl text-sm text-muted-foreground">{uitleg}</p>}
    </div>
  );
}

export default function Scherm6Demo() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Tussenkop uitleg="Eén kader met de naam van de game, en daaronder de twee pelotons met jouw stand in woorden.">
          A · De pelotonbalk
        </Tussenkop>
        <div className="flex flex-wrap items-start gap-6">
          <Kader label="Mobiel">
            <BalkVoorbeeld items={STATEN[1].items} />
          </Kader>
        </div>
        <Kader label="Desktop" breed>
          <BalkVoorbeeld items={STATEN[0].items} breed />
        </Kader>
      </section>

      <section className="space-y-4">
        <Tussenkop uitleg="Wat er onder Vrouwen en Mannen staat, hangt af van wat jij daar hebt.">B · De pelotonbalk in elke situatie</Tussenkop>
        <div className="flex flex-wrap items-start gap-6">
          {STATEN.map((s) => (
            <Kader key={s.titel} label={s.titel}>
              <BalkVoorbeeld items={s.items} start={s.start} />
            </Kader>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Tussenkop uitleg="Pelotonbalk boven de Uitslagen. Wissel van peloton: je blijft op hetzelfde tabblad staan, alleen de cijfers wisselen.">
          C · Samen op het scherm
        </Tussenkop>
        <div className="flex flex-wrap items-start gap-6">
          <Kader label="Mobiel">
            <SamenVoorbeeld />
          </Kader>
        </div>
        <Kader label="Desktop" breed>
          <SamenVoorbeeld breed />
        </Kader>
      </section>
    </div>
  );
}
