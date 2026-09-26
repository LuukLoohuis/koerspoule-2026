/**
 * Visuele testbank voor Krant C en Ploeg C (docs/design/krant-ploeg-c). Niet
 * in de router, niet in de build. Rendert de presentatiecomponenten met
 * nepdata uit het ontwerp, in een telefoonbreed kader en per koersthema,
 * zodat de opmaak te beoordelen is zonder database of inlog.
 *
 * Draaien: npx vite  →  /dev-krant-ploeg.html  (?scherm=krant|ploeg, ?thema=roze|geel|rood)
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import KrantCWeergave from "@/components/krant/KrantCWeergave";
import PloegCWeergave from "@/components/ploeg/PloegCWeergave";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { KaravaanEtappe, KaravaanRanking } from "@/hooks/useKaravaanFeed";
import type { PloegRenner, PloegRit } from "@/hooks/usePloegRanglijst";
import type { StageRow } from "@/hooks/useResults";
import { THEMAS, hexToHsl, readableForeground, type ThemaKey } from "@/lib/themas";
import { tourviewUrl } from "@/lib/tourview";
import "@/i18n";
import "./index.css";

// ── Ploeg C ─────────────────────────────────────────────────────────────────

const RITTEN: PloegRit[] = Array.from({ length: 14 }, (_, i) => ({ id: `s${i + 1}`, nummer: i + 1, naam: null }));

function renner(
  id: string,
  naam: string,
  categorie: string,
  ploeg: string,
  totaal: number,
  dag: number,
  extra: Partial<PloegRenner> = {},
): PloegRenner {
  // Rit 14 = de dagpunten, rit 1 = de rest; zo kloppen dag en totaal met het ontwerp.
  const mult = extra.multiplier ?? 1;
  return {
    id,
    naam,
    categorie,
    ploeg,
    truiUrl: null,
    opgave: false,
    joker: false,
    multiplier: mult,
    etappes: RITTEN.map((r) => ({
      stage_number: r.nummer,
      total_points: r.nummer === 14 ? dag : r.nummer === 1 ? totaal - dag : 0,
    })),
    ...extra,
  };
}

const RENNERS: PloegRenner[] = [
  renner("r1", "Jonas Vingegaard", "Klassement", "Visma–Lease a Bike", 214, 14),
  renner("r2", "Jonathan Milan", "Sprinters", "Lidl-Trek", 198, 0),
  renner("r3", "Giulio Ciccone", "Klimmers", "Lidl-Trek", 176, 20, { joker: true, multiplier: 2 }),
  renner("r4", "Isaac del Toro", "Jongeren", "UAE Team Emirates", 153, 10),
  renner("r5", "Antonio Tiberi", "Klassement", "Bahrain Victorious", 138, 4),
  renner("r6", "Mads Pedersen", "Aanvallers", "Lidl-Trek", 121, 0),
  renner("r7", "Tom Pidcock", "Aanvallers", "Q36.5", 92, 0),
  renner("r8", "Kaden Groves", "Sprinters", "Alpecin–Deceuninck", 87, 0),
  renner("r9", "Egan Bernal", "Klimmers", "Ineos Grenadiers", 64, 0),
  renner("r10", "Juan Ayuso", "Joker", "UAE Team Emirates", 41, 0, { opgave: true, joker: true, multiplier: 2 }),
];

const PLOEGPUNTEN = RITTEN.map((r) => ({ stage_id: r.id, points: r.nummer === 14 ? 48 : r.nummer === 1 ? 1236 : 0 }));

function PloegDemo() {
  const [naam, setNaam] = useState<string | null>("De Waaierwerkers");
  return (
    <PloegCWeergave
      ploegnaam={naam}
      onNaamOpslaan={async (n) => {
        setNaam(n);
        return true;
      }}
      renners={RENNERS}
      ritten={RITTEN}
      ploegPunten={PLOEGPUNTEN}
      officieelTotaal={1284}
    />
  );
}

// ── Krant C ─────────────────────────────────────────────────────────────────

function stand(aantal: number, mijnRang: number, mijnDelta: number): KaravaanRanking[] {
  return Array.from({ length: aantal }, (_, i) => ({
    entry_id: `e${i + 1}`,
    rank: i + 1,
    team_name: i + 1 === mijnRang ? "De Waaierwerkers" : `Ploeg ${i + 1}`,
    display_name: null,
    points: 2000 - i,
    delta_rank: i + 1 === mijnRang ? mijnDelta : 0,
    is_me: i + 1 === mijnRang,
  }));
}

const ETAPPE: KaravaanEtappe = {
  stage_id: "s14",
  stage_number: 14,
  stage_name: "Treviso › Pila",
  approved_at: "2026-05-23T17:30:00Z",
  michel_tekst: "Dat is geen aanval meer, dat is een uitnodiging tot wanhoop voor de rest van het peloton.",
  jose_tekst: "Ge moet dat zien: hij rijdt daar niet hard, hij rijdt daar gewoon niet traag.",
  krant_kop: "Ciccone wint thuis, Vingegaard houdt het roze",
  ritwinnaar: "Giulio Ciccone",
  rituitslag: [
    { positie: 1, renner: "Giulio Ciccone", ploeg: "Lidl-Trek" },
    { positie: 2, renner: "Isaac del Toro", ploeg: "UAE Team Emirates" },
    { positie: 3, renner: "Jonas Vingegaard", ploeg: "Visma–Lease a Bike" },
    { positie: 4, renner: "Antonio Tiberi", ploeg: "Bahrain Victorious" },
  ],
  dagstand: [
    { rang: 1, naam: "Marieke", deelnemer: null, punten: 61, isMij: false },
    { rang: 2, naam: "Luuk", deelnemer: null, punten: 48, isMij: true },
    { rang: 3, naam: "Jeroen", deelnemer: null, punten: 45, isMij: false },
    { rang: 4, naam: "Kees", deelnemer: null, punten: 30, isMij: false },
  ],
  mijnDagpunten: 48,
  mijnDagrang: 2,
  mijnDagrangOverall: 118,
  dagDeelnemersOverall: 2318,
  subpouleStandings: stand(14, 3, 2),
  overallStandings: stand(2318, 412, 37),
  personalFlash: null,
};

const VERSLAG = {
  stage_id: "s14",
  tekst:
    "Ciccone sprong weg op de slotklim. Del Toro kwam op vier tellen, het roze bleef waar het was.\n\n" +
    "De Italiaan koos zijn moment op vijf kilometer van de streep, waar de weg het steilst is. Achter hem keek het peloton van de favorieten naar elkaar, en dat was precies wat hij nodig had.\n\n" +
    "In de poule was het de dag van **Marieke**, die met Ciccone én del Toro in de ploeg 61 punten pakte. **Luuk** volgt op dertien punten.",
  bron: null,
  bron_url: null,
  updated_at: null,
};

const MORGEN: StageRow = {
  id: "s15",
  game_id: "demo",
  stage_number: 15,
  name: "Val Camonica › Bormio",
  date: "2026-05-24",
  status: null,
  stage_type: "bergop",
  distance_km: 188,
  is_gc: false,
  results_status: "draft",
  profile_data: { climbMeters: 4250 },
};

const VOORBESCHOUWING =
  "De laatste bergrit voor de rustdag. Wie het roze wil aanvallen, moet het op de Mortirolo doen: daarna is het dalen en hopen.";

function KrantDemo({ leeg }: { leeg?: boolean }) {
  const [subpoule, setSubpoule] = useState("k");
  return (
    <KrantCWeergave
      laatste={leeg ? null : ETAPPE}
      kop={leeg ? null : "Ciccone wint thuis, Vingegaard houdt het roze"}
      verslag={leeg ? null : VERSLAG}
      subpoules={[{ id: "k", name: "Kantoor" }, { id: "f", name: "Familie" }]}
      selectedSubpouleId={subpoule}
      onSelectSubpoule={setSubpoule}
      geenSubpoule={false}
      scores={leeg ? { monkeyBeatPct: null, emiratesPct: null, directorScore: null } : { monkeyBeatPct: 78, emiratesPct: 64, directorScore: 7.4 }}
      heeftHorsCijfers={!leeg}
      morgen={MORGEN}
      voorbeschouwing={VOORBESCHOUWING}
      profielUrl={tourviewUrl("giro", 2026, 15)}
      commentaarLaden={false}
      onOpenHors={(tab) => console.info("[demo] hors", tab)}
      onOpenSubpoule={(id) => console.info("[demo] subpoule", id)}
      onOpenUitslagen={() => console.info("[demo] uitslagen")}
      onOpenDaguitslag={(n) => console.info("[demo] daguitslag", n)}
    />
  );
}

// ── Testbank ─────────────────────────────────────────────────────────────────

const SCHERMEN = [
  { key: "krant", titel: "Krant C", Demo: () => <KrantDemo /> },
  { key: "krant-leeg", titel: "Krant C · vóór de eerste uitslag", Demo: () => <KrantDemo leeg /> },
  { key: "ploeg", titel: "Ploeg C", Demo: PloegDemo },
];

/** Zet de thematokens zoals ThemaProvider dat doet, zonder database. */
function zetThema(key: ThemaKey) {
  const root = document.documentElement;
  const k = THEMAS[key].kleuren;
  const primair = hexToHsl(k.primair);
  root.style.setProperty("--primary", primair);
  root.style.setProperty("--primary-foreground", readableForeground(k.primair));
  root.style.setProperty("--ring", primair);
  root.style.setProperty("--vintage-gold", hexToHsl(k.accent));
  root.setAttribute("data-thema", key);
}

function Testbank() {
  const params = new URLSearchParams(window.location.search);
  const [thema, setThema] = useState<ThemaKey>((params.get("thema") as ThemaKey) || "roze");
  const alleen = params.get("scherm");

  useEffect(() => zetThema(thema), [thema]);

  return (
    <KoersThemaProvider themaKey={thema}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs">
          <strong>Krant C & Ploeg C</strong>
          <select className="rounded border bg-card px-2 py-1" value={thema} onChange={(e) => setThema(e.target.value as ThemaKey)}>
            <option value="roze">roze (Giro)</option>
            <option value="geel">geel (Tour)</option>
            <option value="rood">rood (Vuelta)</option>
          </select>
        </div>
        {/* Zelfde omhulsel als de echte pagina: content-font (Inter overal) en
            de containermarge van 20px, in een telefoonbreed kader. */}
        <main className="content-font mx-auto w-full max-w-[375px] space-y-14 px-5 pb-28 pt-4">
          {SCHERMEN.filter((s) => !alleen || s.key === alleen).map(({ key, titel, Demo }) => (
            <section key={key} id={`scherm-${key}`} className="space-y-4">
              <h2 className="editor-eyebrow">{titel}</h2>
              <Demo />
            </section>
          ))}
        </main>
        <BottomNav />
      </div>
    </KoersThemaProvider>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[(new URLSearchParams(window.location.search).get("scherm") ?? "krant") === "ploeg" ? "/mijn-peloton?tab=team" : "/karavaan"]}>
      <Testbank />
    </MemoryRouter>
  </QueryClientProvider>,
);
