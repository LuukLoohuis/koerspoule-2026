/**
 * Testbank-demo voor scherm 9 (zie src/dev-meermarathon.tsx): de Krant, de
 * Ploeg en de Pronostiek zoals de wielergames ze hebben (Krant C, Ploeg C),
 * nu in schaatswoorden en per peloton. Nepdata, geen database.
 */
import { useState, type ReactNode } from "react";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import { RetroTabs } from "@/components/RetroTabs";
import KrantCWeergave from "@/components/krant/KrantCWeergave";
import PloegCWeergave from "@/components/ploeg/PloegCWeergave";
import PronostiekWeergave, { type Voorspelling } from "@/components/ploeg/PronostiekWeergave";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { KaravaanEtappe, KaravaanRanking } from "@/hooks/useKaravaanFeed";
import type { PloegRenner, PloegRit } from "@/hooks/usePloegRanglijst";
import type { StageRow } from "@/hooks/useResults";
import type { KlassementUitslag } from "@/hooks/useKlassementUitslag";
import { meermarathonStageAfkorting, meermarathonStageLabel, wedstrijdTypeVan } from "@/lib/gameTypes";
import { wedstrijdEigenNaam } from "@/lib/krantC";

// ── Pelotonbalk ───────────────────────────────────────────────────────────

const BALK: PelotonItem[] = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen", soort: "meedoen", regel: "12e van 1.204" },
  { id: "m", label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "48e van 986" },
];

function DemoBalk() {
  const [gekozen, setGekozen] = useState("v");
  return (
    <div className="pb-3">
      <Pelotonbalk seizoen={"’26-’27"} items={BALK} selectedId={gekozen} onSelect={setGekozen} />
    </div>
  );
}

// ── Wedstrijden ───────────────────────────────────────────────────────────

type Wedstrijd = { nummer: number; soort: "cup" | "grandprix"; naam: string | null };

// "Etappe 4" is hoe het oude beheer een naamloze wedstrijd opsloeg; die hoort
// als "Cup 4" op het scherm te komen, niet als naam erachter.
const WEDSTRIJDEN: Wedstrijd[] = [
  { nummer: 1, soort: "cup", naam: null },
  { nummer: 2, soort: "cup", naam: null },
  { nummer: 3, soort: "grandprix", naam: "Noordlaren" },
  { nummer: 4, soort: "cup", naam: "Etappe 4" },
  { nummer: 5, soort: "grandprix", naam: "Veenhoop" },
];

const stageVan = (w: Wedstrijd) => ({ stage_number: w.nummer, name: w.naam, wedstrijd_type: w.soort, ijs_type: null });

const RITTEN: PloegRit[] = WEDSTRIJDEN.map((w) => ({
  id: `s${w.nummer}`,
  nummer: w.nummer,
  naam: wedstrijdEigenNaam(stageVan(w)),
  label: meermarathonStageLabel({ ...stageVan(w), name: null }),
  kort: meermarathonStageAfkorting(stageVan(w)),
  soort: wedstrijdTypeVan(stageVan(w)),
}));

// ── Ploeg ─────────────────────────────────────────────────────────────────

/** Punten per wedstrijd 1 t/m 5, met de plaats in de uitslag. */
function rijder(
  id: string,
  naam: string,
  categorie: string,
  ploeg: string,
  punten: Array<[punten: number, plaats: number | null]>,
  extra: Partial<PloegRenner> = {},
): PloegRenner {
  return {
    id,
    naam,
    categorie,
    ploeg,
    truiUrl: null,
    opgave: false,
    joker: false,
    multiplier: extra.multiplier ?? 1,
    etappes: punten.map(([p, plaats], i) => ({
      stage_number: i + 1,
      total_points: p,
      stage_name: null,
      stage_type: null,
      finish_position: plaats,
      multiplier: extra.multiplier ?? 1,
    })),
    ...extra,
  };
}

const RIJDERS: PloegRenner[] = [
  rijder("r1", "Lotte Bosma", "Toppers", "Team Noordelijk IJs", [[18, 3], [0, null], [22, 2], [0, null], [26, 1]]),
  rijder("r2", "Iris Kooistra", "Sprinters", "Ploeg Friesland", [[26, 1], [14, 5], [0, null], [18, 3], [0, null]]),
  rijder("r3", "Jildou Terpstra", "Natuurijs", "Schaatsteam West", [[0, null], [0, null], [26, 1], [0, null], [20, 2]]),
  rijder("r4", "Esmee Wijnia", "Vechters", "Schaatsteam West", [[10, 7], [22, 2], [0, null], [0, null], [0, null]]),
  rijder("r5", "Noor Visser", "Talent", "Team Noordelijk IJs", [[0, null], [8, 8], [0, null], [14, 5], [0, null]]),
  // Geen jokers: de Meermarathon kent ze niet.
];

const PLOEGPUNTEN = RITTEN.map((r) => ({
  stage_id: r.id,
  points: RIJDERS.reduce((som, x) => som + (x.etappes.find((e) => e.stage_number === r.nummer)?.total_points ?? 0), 0),
}));

function PloegDemo() {
  const [naam, setNaam] = useState<string | null>("De Klapschaatsers");
  return (
    <PloegCWeergave
      meermarathon
      ploegnaam={naam}
      onNaamOpslaan={async (n) => {
        setNaam(n);
        return true;
      }}
      renners={RIJDERS}
      ritten={RITTEN}
      ploegPunten={PLOEGPUNTEN}
      officieelTotaal={PLOEGPUNTEN.reduce((som, p) => som + p.points, 0)}
    />
  );
}

// ── Pronostiek ────────────────────────────────────────────────────────────

const RIJDERS_OP_ID = Object.fromEntries(RIJDERS.map((r) => [r.id, { name: r.naam, team: r.ploeg }]));

function PronostiekDemo({
  voorspellingen,
  bouwer = true,
  uitslag = null,
}: {
  voorspellingen: Voorspelling[];
  bouwer?: boolean;
  uitslag?: KlassementUitslag | null;
}) {
  return (
    <PronostiekWeergave
      meermarathon
      gameName="Meermarathon Vrouwen"
      predictions={voorspellingen}
      ridersById={RIJDERS_OP_ID}
      dnfZichtbaar={false}
      bouwerPad={bouwer ? "/team-samenstellen" : null}
      uitslag={uitslag}
    />
  );
}

// Na het seizoen: Kooistra won de Cup (goed voorspeld), Bosma de Grand Prix.
const UITSLAG: KlassementUitslag = { winnaars: { cup: "r2", grandprix: "r1" }, punten: { cup: 50 } };

const TWEE: Voorspelling[] = [
  { classification: "cup", position: 1, rider_id: "r2" },
  { classification: "grandprix", position: 1, rider_id: "r3" },
];

// ── Krant ─────────────────────────────────────────────────────────────────

function stand(aantal: number, mijnRang: number, mijnDelta: number): KaravaanRanking[] {
  return Array.from({ length: aantal }, (_, i) => ({
    entry_id: `e${i + 1}`,
    rank: i + 1,
    team_name: i + 1 === mijnRang ? "De Klapschaatsers" : `Ploeg ${i + 1}`,
    display_name: null,
    points: 900 - i,
    delta_rank: i + 1 === mijnRang ? mijnDelta : 0,
    is_me: i + 1 === mijnRang,
  }));
}

const WEDSTRIJD: KaravaanEtappe = {
  stage_id: "s5",
  stage_number: 5,
  stage_name: "Veenhoop",
  wedstrijd_type: "grandprix",
  ijs_type: "natuurijs",
  approved_at: "2027-01-09T16:30:00Z",
  michel_tekst:
    "Wat een koers op de Veenhoop! Bosma gaat in de laatste ronde over de kop en niemand kan nog volgen. In de subpoule is het de avond van De Klapschaatsers: Bosma en Terpstra samen goed voor zesenveertig punten.",
  jose_tekst:
    "Op natuurijs moet ge durven. Wie Terpstra in de ploeg heeft, heeft naar het ijs gekeken en niet naar de namen.",
  krant_kop: "Bosma soleert naar de zege op de Veenhoop",
  ritwinnaar: "Lotte Bosma",
  rituitslag: [
    { positie: 1, renner: "Lotte Bosma", ploeg: "Team Noordelijk IJs" },
    { positie: 2, renner: "Jildou Terpstra", ploeg: "Schaatsteam West" },
    { positie: 3, renner: "Merel Brouwer", ploeg: "Ploeg Friesland" },
  ],
  dagstand: [
    { rang: 1, naam: "De Klapschaatsers", deelnemer: null, punten: 70, isMij: true },
    { rang: 2, naam: "IJsvogels", deelnemer: null, punten: 52, isMij: false },
    { rang: 3, naam: "Schaverdijk", deelnemer: null, punten: 41, isMij: false },
  ],
  mijnDagpunten: 70,
  mijnDagrang: 1,
  mijnDagrangOverall: 23,
  dagDeelnemersOverall: 1204,
  subpouleStandings: stand(9, 2, 1),
  overallStandings: stand(1204, 12, 6),
  personalFlash: null,
};

const VERSLAG = {
  stage_id: "s5",
  tekst:
    "Lotte Bosma won de Grand Prix op de Veenhoop met een aanval in de laatste ronde. Terpstra werd tweede.\n\n" +
    "Het ijs was hard en snel; de kopgroep van twaalf viel pas in de slotronden uiteen.\n\n" +
    "In de poule was het de avond van **De Klapschaatsers**, met zeventig punten de beste van de dag.",
  bron: null,
  bron_url: null,
  updated_at: null,
};

const MORGEN: StageRow = {
  id: "s6",
  game_id: "demo",
  stage_number: 6,
  name: null,
  date: "2027-01-16",
  status: null,
  stage_type: null,
  distance_km: null,
  is_gc: false,
  results_status: "draft",
  wedstrijd_type: "cup",
  ijs_type: "kunstijs",
};

function KrantDemo({ leeg }: { leeg?: boolean }) {
  const [subpoule, setSubpoule] = useState("k");
  return (
    <KrantCWeergave
      meermarathon
      laatste={leeg ? null : WEDSTRIJD}
      kop={leeg ? null : "Bosma soleert naar de zege op de Veenhoop"}
      verslag={leeg ? null : VERSLAG}
      subpoules={[{ id: "k", name: "Kantoor" }, { id: "f", name: "Familie" }]}
      selectedSubpouleId={subpoule}
      onSelectSubpoule={setSubpoule}
      geenSubpoule={false}
      scores={leeg ? { monkeyBeatPct: null, emiratesPct: null, directorScore: null } : { monkeyBeatPct: 71, emiratesPct: 58, directorScore: 7.1 }}
      heeftHorsCijfers={!leeg}
      morgen={MORGEN}
      voorbeschouwing="De zesde wedstrijd is weer op kunstijs: tachtig ronden in Thialf, en daar rijden de sprinters voor de zege."
      profielUrl={null}
      commentaarLaden={false}
      onOpenHors={(tab) => console.info("[demo] hors", tab)}
      onOpenSubpoule={(id) => console.info("[demo] subpoule", id)}
      onOpenUitslagen={() => console.info("[demo] uitslagen")}
      onOpenDaguitslag={(n) => console.info("[demo] daguitslag", n)}
    />
  );
}

/** De Volgwagen zoals MijnPeloton hem op een telefoon opbouwt: vier segmenten. */
function VolgwagenDemo() {
  const [sub, setSub] = useState("ploeg");
  const tabs = [
    { key: "ploeg", label: "Mijn ploeg" },
    { key: "live", label: "Live" },
    { key: "prono", label: "Pronostiek" },
    { key: "palmares", label: "Palmares" },
  ];
  return (
    <div>
      <RetroTabs variant="segment" gelijkeBreedte className="mb-3 h-10" aria-label="Volgwagen" active={sub} onChange={setSub} tabs={tabs} />
      {sub === "ploeg" && <PloegDemo />}
      {sub === "prono" && <PronostiekDemo voorspellingen={TWEE} />}
      {(sub === "live" || sub === "palmares") && (
        <div className="retro-border bg-card p-6 text-center font-display text-xl font-bold">{sub} (ongewijzigd)</div>
      )}
    </div>
  );
}

// ── Kaders ────────────────────────────────────────────────────────────────

function Bijschrift({ children }: { children: ReactNode }) {
  return <figcaption className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</figcaption>;
}

/** 375px breed zoals een telefoon, met de marge van de pagina. */
function Mobiel({ titel, hoogte = 900, children }: { titel: string; hoogte?: number; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <Bijschrift>{titel}</Bijschrift>
      <div
        className="content-font w-[375px] overflow-y-auto overflow-x-hidden rounded-[14px] border border-border bg-background px-5 pt-2"
        style={{ height: hoogte }}
      >
        {children}
      </div>
    </figure>
  );
}

function Breed({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <Bijschrift>{titel}</Bijschrift>
      <div className="content-font w-[720px] rounded-[14px] border border-border bg-background p-5">{children}</div>
    </figure>
  );
}

export default function Scherm9Demo() {
  return (
    <KoersThemaProvider themaKey="winter">
      <div className="flex flex-wrap items-start gap-6">
        <Mobiel titel="9a · Krant (mobiel): IJsjournaal per peloton">
          <DemoBalk />
          <KrantDemo />
        </Mobiel>
        <Mobiel titel="9b · Volgwagen › Mijn ploeg (mobiel)">
          <DemoBalk />
          <VolgwagenDemo />
        </Mobiel>
        <Mobiel titel="9c · Volgwagen › Pronostiek" hoogte={620}>
          <DemoBalk />
          <PronostiekDemo voorspellingen={TWEE} />
        </Mobiel>
        <Mobiel titel="9d · Pronostiek, nog niets voorspeld" hoogte={420}>
          <DemoBalk />
          <PronostiekDemo voorspellingen={[]} />
        </Mobiel>
        <Mobiel titel="9e · Krant vóór de eerste uitslag" hoogte={620}>
          <DemoBalk />
          <KrantDemo leeg />
        </Mobiel>
        <Mobiel titel="9g · Pronostiek na het seizoen: één goed (+50)" hoogte={560}>
          <DemoBalk />
          <PronostiekDemo voorspellingen={TWEE} uitslag={UITSLAG} bouwer={false} />
        </Mobiel>
        <Breed titel="9f · Pronostiek op de webversie (hetzelfde paneel)">
          <PronostiekDemo voorspellingen={TWEE} />
        </Breed>
      </div>
    </KoersThemaProvider>
  );
}
