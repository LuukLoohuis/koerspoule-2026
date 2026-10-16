/**
 * Testbank voor /profiel: de echte site-schil (Layout) met de echte pagina
 * (pages/Profiel) en hun echte hooks, op een nepdatabase in het geheugen.
 * Erelijst (user_palmares_summary), profiel en per afgeronde koers de ritten,
 * je punten, je ploeg en de hele eindstand staan in die nepdatabase; het
 * dossier wordt dus echt opgehaald en opgebouwd (useArchiefDossier). Niet in
 * de router, niet in de build.
 *
 * Draaien: npx vite --config vite.nepdata.config.ts --port 3200
 *   → /dev-profiel.html?tab=oude-spellen&koers=tour26
 *
 *   wereld  mm (winter, zoals nu) | tour (zomer)
 *   tab     palmares | oude-spellen
 *   koers   giro26 | tour26 | femmes26 | vuelta26   (dossier meteen open)
 *   leeg    1                                       (nieuwe deelnemer, nog niets gereden)
 *   modus   nacht
 */
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { SelectedGameProvider, useSelectedGame } from "@/context/SelectedGameContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemaProvider } from "@/contexts/ThemaContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Profiel from "@/pages/Profiel";
import type { PalmaresGame, PalmaresSubpoule } from "@/hooks/usePalmares";
import type { GameStandingRow } from "@/hooks/useResults";
import { supabaseConfig } from "@/lib/supabase";
import { laadWereld, type NepEntry } from "@/dev/nepdata/supabase";
import { NEP_GEBRUIKER_ID } from "@/dev/nepdata/useAuth";
import { meermarathon, tour } from "@/dev/nepdata/werelden";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const params = new URLSearchParams(window.location.search);
const wereldNaam = params.get("wereld") === "tour" ? "tour" : "mm";
const leeg = params.get("leeg") === "1";

// ── Verzonnen loopbaan ──────────────────────────────────────────────────────

const OUD = [
  { id: "giro26", name: "Giro d'Italia 2026", game_type: "giro" },
  { id: "tour26", name: "Tour de France 2026", game_type: "tour" },
  { id: "femmes26", name: "Tour de France Femmes 2026", game_type: "femmes" },
  { id: "vuelta26", name: "Vuelta a España 2026", game_type: "vuelta" },
];

function koers(id: string, rang: number, van: number, punten: number, ritten: number, dagzeges: number[], podia: number, status = "finished"): PalmaresGame {
  const g = OUD.find((o) => o.id === id) ?? { id, name: "Meermarathon 2026-2027", game_type: "meermarathon" };
  return {
    game_id: g.id,
    game_name: g.name,
    game_type: g.game_type,
    year: 2026,
    status,
    entry_id: `entry-${id}`,
    approved_points: punten,
    my_rank: rang,
    total_participants: van,
    stage_wins: dagzeges.length,
    stage_podiums: podia,
    stages_count: ritten,
    dagzeges: dagzeges.map((n) => ({ stage_id: `${id}-r${n}`, stage_number: n, stage_name: null, date: null, points: 170 + n })),
  };
}

const PALMARES: PalmaresGame[] = leeg
  ? []
  : [
      koers("giro26", 214, 1873, 2412, 21, [], 2),
      koers("tour26", 12, 4312, 3105, 21, [7, 16], 5),
      koers("femmes26", 38, 912, 1288, 9, [4], 2),
      koers("vuelta26", 96, 2140, 2690, 21, [], 1),
      koers("mm-v", 41, 1204, 312, 3, [], 0, "live"),
    ];

const SUBPOULES: PalmaresSubpoule[] = leeg
  ? []
  : [
      { subpoule_id: "sp1", subpoule_name: "De Kopgroep", game_id: "tour26", game_name: "Tour de France 2026", game_type: "tour", my_rank: 1, total_members: 14, is_winner: true, stage_wins: 3, stage_podiums: 7 },
      { subpoule_id: "sp2", subpoule_name: "Kantoor Utrecht", game_id: "tour26", game_name: "Tour de France 2026", game_type: "tour", my_rank: 3, total_members: 22, is_winner: false, stage_wins: 1, stage_podiums: 4 },
      { subpoule_id: "sp3", subpoule_name: "Familie", game_id: "giro26", game_name: "Giro d'Italia 2026", game_type: "giro", my_rank: 2, total_members: 6, is_winner: false, stage_wins: 4, stage_podiums: 9 },
      { subpoule_id: "sp4", subpoule_name: "Vuelta-vrienden", game_id: "vuelta26", game_name: "Vuelta a España 2026", game_type: "vuelta", my_rank: 5, total_members: 9, is_winner: false, stage_wins: 0, stage_podiums: 2 },
    ];

const PLOEGNAMEN = [
  "Kopgroep Kees", "De Bidonbrigade", "Rouleurs van Rijn", "Ploeg Poedersuiker", "Team Tegenwind", "De Echelonnen",
  "Zwaantjes Zwaluw", "Afzien & Genieten", "Lantaarnrood", "Waaier op Zee", "Bergop Boys", "Herman's Helden",
];
const VOORNAMEN = ["Marieke", "Joost", "Annelies", "Pieter", "Femke", "Daan", "Ilse", "Ruben", "Sanne", "Bram", "Noor", "Thijs"];
const ACHTERNAMEN = ["Bakker", "Visser", "Smit", "Meijer", "Mulder", "de Boer", "Bos", "Vos"];

const RENNERS: Record<string, Array<[naam: string, ploeg: string]>> = {
  giro26: [["Primož Roglič", "Red Bull-Bora"], ["Juan Ayuso", "UAE Team Emirates"], ["Antonio Tiberi", "Bahrain Victorious"], ["Giulio Ciccone", "Lidl-Trek"], ["Olav Kooij", "Visma | Lease a Bike"], ["Kaden Groves", "Alpecin-Deceuninck"], ["Mads Pedersen", "Lidl-Trek"], ["Isaac del Toro", "UAE Team Emirates"], ["Richard Carapaz", "EF Education"], ["Derek Gee", "Israel-Premier Tech"], ["Thymen Arensman", "Ineos Grenadiers"], ["Mikel Landa", "Soudal Quick-Step"]],
  tour26: [["Tadej Pogačar", "UAE Team Emirates"], ["Jonas Vingegaard", "Visma | Lease a Bike"], ["Remco Evenepoel", "Red Bull-Bora"], ["Mathieu van der Poel", "Alpecin-Deceuninck"], ["Jasper Philipsen", "Alpecin-Deceuninck"], ["Wout van Aert", "Visma | Lease a Bike"], ["Tim Merlier", "Soudal Quick-Step"], ["Biniam Girmay", "Intermarché-Wanty"], ["João Almeida", "UAE Team Emirates"], ["Matteo Jorgenson", "Visma | Lease a Bike"], ["Lenny Martinez", "Bahrain Victorious"], ["Ben Healy", "EF Education"]],
  femmes26: [["Demi Vollering", "FDJ-Suez"], ["Pauline Ferrand-Prévot", "Visma | Lease a Bike"], ["Katarzyna Niewiadoma", "Canyon//SRAM"], ["Lorena Wiebes", "SD Worx-Protime"], ["Marianne Vos", "Visma | Lease a Bike"], ["Puck Pieterse", "Fenix-Deceuninck"], ["Évita Muzic", "FDJ-Suez"], ["Kimberley Le Court", "AG Insurance-Soudal"]],
  vuelta26: [["Jonas Vingegaard", "Visma | Lease a Bike"], ["João Almeida", "UAE Team Emirates"], ["Tom Pidcock", "Q36.5"], ["Jai Hindley", "Red Bull-Bora"], ["Mads Pedersen", "Lidl-Trek"], ["Jasper Philipsen", "Alpecin-Deceuninck"], ["Giulio Pellizzari", "Red Bull-Bora"], ["Matthew Riccitello", "Israel-Premier Tech"], ["Egan Bernal", "Ineos Grenadiers"], ["Felix Gall", "Decathlon AG2R"], ["Santiago Buitrago", "Bahrain Victorious"], ["Wout Poels", "XDS Astana"]],
};

/** Vast zaadje per koers: de nepdata is elke keer hetzelfde. */
function dobbel(zaad: number) {
  let s = zaad;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Alles wat de database van één afgeronde koers weet, als tabellen en rpc-antwoorden. */
function archiefVan(k: PalmaresGame) {
  const kans = dobbel(k.game_id.length * 97 + k.my_rank);
  const g = k.game_id;
  const stages = [
    ...Array.from({ length: k.stages_count }, (_, i) => ({ id: `${g}-r${i + 1}`, game_id: g, stage_number: i + 1, name: null, is_gc: false, results_status: "approved" })),
    { id: `${g}-gc`, game_id: g, stage_number: 99, name: "Eindklassement", is_gc: true, results_status: "approved" },
  ];
  const stagePoints = stages
    .filter((s) => !s.is_gc)
    .map((s) => {
      const zege = k.dagzeges.some((d) => d.stage_number === s.stage_number);
      return { entry_id: k.entry_id, stage_id: s.id, points: zege ? 168 + Math.round(kans() * 40) : Math.round(40 + kans() * 110) };
    });
  const ritRangen = stagePoints.map((p) => ({
    stage_id: p.stage_id,
    my_rank: k.dagzeges.some((d) => d.stage_id === p.stage_id) ? 1 : Math.max(2, Math.round((1 - p.points / 170) * k.total_participants * 0.6)),
  }));

  const renners = (RENNERS[g] ?? []).map(([name, team], i) => ({ id: `${g}-${i}`, name, team, team_id: null, start_number: i + 1, is_dnf: i === 9, is_youth_eligible: false, firstcycling_id: null }));
  const entry: NepEntry = {
    id: k.entry_id,
    user_id: NEP_GEBRUIKER_ID,
    game_id: g,
    status: "submitted",
    team_name: "De Waaierwerkers",
    entry_picks: renners.map((r) => ({ category_id: "c", rider_id: r.id })),
    entry_jokers: renners.filter((_, i) => i === 0 || i === 4).map((r) => ({ rider_id: r.id })),
    entry_predictions: [],
  };
  const rennerTotalen = renners.map((r, i) => ({ rider_id: r.id, total_points: Math.round((k.approved_points / 6) * Math.pow(0.78, i) * (0.8 + kans() * 0.4)) }));

  // De hele eindstand, met jou op je plek uit de erelijst.
  const stand: GameStandingRow[] = Array.from({ length: k.total_participants }, (_, i) => {
    const rang = i + 1;
    const ik = rang === k.my_rank;
    const totaal = ik ? k.approved_points : Math.max(0, Math.round(k.approved_points + (k.my_rank - rang) * 3 + (rang <= 3 ? (4 - rang) * 25 : 0)));
    return {
      entry_id: ik ? k.entry_id : `${g}-e${rang}`,
      user_id: ik ? NEP_GEBRUIKER_ID : `${g}-u${rang}`,
      team_name: ik ? "De Waaierwerkers" : `${PLOEGNAMEN[rang % PLOEGNAMEN.length]}${rang > PLOEGNAMEN.length ? ` ${Math.ceil(rang / PLOEGNAMEN.length)}` : ""}`,
      display_name: ik ? "Sanne de Wit" : `${VOORNAMEN[(rang * 7) % VOORNAMEN.length]} ${ACHTERNAMEN[rang % ACHTERNAMEN.length]}`,
      cum_points: totaal - 40,
      pred_bonus: 40,
      total: totaal,
      rank: rang,
      prev_rank: rang,
      delta: 0,
      stage_points: 0,
      stage_rank: null,
    };
  });

  return {
    stages,
    stagePoints,
    renners,
    entry,
    rpc: {
      [`my_stage_ranks:${g}`]: ritRangen,
      [`rider_entry_totals:${g}`]: rennerTotalen,
      [`game_standings:${g}`]: stand,
    },
  };
}

const archief = PALMARES.filter((k) => k.status === "finished").map(archiefVan);
const basis = wereldNaam === "tour" ? tour(NEP_GEBRUIKER_ID) : meermarathon(NEP_GEBRUIKER_ID, "ingediend");
laadWereld(
  {
    ...basis,
    games: [
      ...basis.games,
      ...OUD.map((g) => ({ ...g, year: 2026, status: "finished", theme: null, categorie: null, created_at: "2026-04-01T12:00:00Z" })),
    ],
    riders: [...basis.riders, ...archief.flatMap((a) => a.renners)],
    entries: [...basis.entries, ...archief.map((a) => a.entry)],
    tabellen: {
      profiles: [{ id: NEP_GEBRUIKER_ID, display_name: "Sanne de Wit", created_at: "2026-04-18T10:00:00Z" }],
      stages: archief.flatMap((a) => a.stages),
      stage_points: archief.flatMap((a) => a.stagePoints),
    },
    rpcAntwoorden: {
      "user_palmares_summary:": { games: PALMARES, subpoules: SUBPOULES },
      ...Object.assign({}, ...archief.map((a) => a.rpc)),
    },
  },
  NEP_GEBRUIKER_ID,
);

// ── Testbank ────────────────────────────────────────────────────────────────

try {
  sessionStorage.removeItem("koerspoule_selected_game");
  localStorage.setItem("koers-cookies-accepted-v2", "true");
  if (params.get("modus") === "nacht") localStorage.setItem("koerspoule:modus", "nacht");
  else localStorage.removeItem("koerspoule:modus");
} catch {
  /* opslag geblokkeerd */
}

function zet(sleutel: string, waarde: string | null) {
  const p = new URLSearchParams(window.location.search);
  if (waarde == null) p.delete(sleutel);
  else p.set(sleutel, waarde);
  window.location.search = p.toString();
}

function Bediening() {
  const knop = "rounded border border-neutral-400 bg-white px-2 py-1 text-neutral-900";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-300 bg-neutral-100 px-3 py-2 font-sans text-xs text-neutral-900">
      <strong>Profiel-testbank</strong>
      <span className="text-neutral-500">nepdata</span>
      <select className={knop} value={wereldNaam} onChange={(e) => zet("wereld", e.target.value === "tour" ? "tour" : null)}>
        <option value="mm">winter (nu)</option>
        <option value="tour">zomer (Tour)</option>
      </select>
      <button className={knop} onClick={() => zet("leeg", leeg ? null : "1")}>
        {leeg ? "nieuwe deelnemer" : "met loopbaan"}
      </button>
      <button className={knop} onClick={() => zet("modus", params.get("modus") === "nacht" ? null : "nacht")}>
        {params.get("modus") === "nacht" ? "nacht" : "licht"}
      </button>
    </div>
  );
}

/** Mijn Peloton staat niet in de testbank; dit laat zien welke koers er open zou gaan. */
function MijnPelotonStandIn() {
  const { selectedGame } = useSelectedGame();
  return (
    <p className="container mx-auto px-5 py-10 font-serif italic">
      Hier opent Mijn Peloton met <strong>{selectedGame?.name ?? "—"}</strong> (met de terugkijk-strook).
    </p>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const startParams = new URLSearchParams([...params].filter(([k]) => k === "tab" || k === "koers")).toString();
const start = startParams ? `/profiel?${startParams}` : "/profiel";

function Testbank() {
  if (supabaseConfig.url !== "nepdata://testbank") {
    return <p className="p-6 font-sans">Start deze testbank met <code>npx vite --config vite.nepdata.config.ts</code>.</p>;
  }
  return (
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MemoryRouter initialEntries={[start]}>
            <Bediening />
            <SelectedGameProvider>
              <AuthProvider>
                <ThemaProvider>
                  <Layout>
                    <Routes>
                      <Route path="/profiel" element={<Profiel />} />
                      <Route path="/mijn-peloton" element={<MijnPelotonStandIn />} />
                      <Route path="*" element={<p className="container mx-auto px-5 py-10 font-serif italic">Andere pagina — in de testbank staat alleen /profiel.</p>} />
                    </Routes>
                  </Layout>
                </ThemaProvider>
              </AuthProvider>
            </SelectedGameProvider>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Testbank />);
