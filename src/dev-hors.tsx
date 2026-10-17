/**
 * Testbank voor Hors Catégorie › Pelotonkeuzes: het echte tabblad met de
 * echte hooks op nepdata. Laat het voorspellingenblok zien bij de
 * Meermarathon (Cup en Grand Prix) en, om naast te leggen, bij een wielergame
 * (eindwinnaar en truien). Niet in de router, niet in de build.
 *
 * Draaien: npx vite --config vite.nepdata.config.ts --port 3200
 *   → /dev-hors.html?wereld=mm|tour&leeg=1&modus=nacht
 */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { SelectedGameProvider } from "@/context/SelectedGameContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemaProvider } from "@/contexts/ThemaContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import HorsCategorieTab from "@/components/HorsCategorieTab";
import { supabaseConfig } from "@/lib/supabase";
import { laadWereld } from "@/dev/nepdata/supabase";
import { NEP_GEBRUIKER_ID } from "@/dev/nepdata/useAuth";
import { alleenMannen, tour } from "@/dev/nepdata/werelden";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const params = new URLSearchParams(window.location.search);
const wereldNaam = params.get("wereld") === "tour" ? "tour" : "mm";
const leeg = params.get("leeg") === "1";
const DEELNEMERS = 42;

const stem = (classification: string, rider_id: string, pick_count: number, position = 1) => ({
  classification,
  position,
  rider_id,
  pick_count,
  total_entries: DEELNEMERS,
});
const keuze = (category_id: string, rider_id: string, pick_count: number) => ({ category_id, rider_id, pick_count, total_entries: DEELNEMERS });

function mmWereld() {
  const w = alleenMannen(NEP_GEBRUIKER_ID);
  w.rpcAntwoorden = {
    "game_pick_stats:mm-m": [keuze("m-cat1", "sjoerd", 28), keuze("m-cat1", "bart", 9), keuze("m-cat2", "gerben", 20), keuze("m-cat2", "ruud", 15)],
    "game_prediction_stats:mm-m": leeg
      ? []
      : [
          stem("cup", "sjoerd", 19),
          stem("cup", "bart", 11),
          stem("cup", "jorrit", 8),
          stem("cup", "klaas", 3),
          stem("grandprix", "klaas", 26),
          stem("grandprix", "pieter", 9),
          stem("grandprix", "sjoerd", 5),
          stem("grandprix", "tjeerd", 2),
        ],
  };
  return w;
}

function tourWereld() {
  const w = tour(NEP_GEBRUIKER_ID);
  w.games = w.games.map((g) => ({ ...g, status: "live" }));
  w.rpcAntwoorden = {
    "game_pick_stats:tdf": [keuze("t-cat1", "pog", 30), keuze("t-cat1", "vin", 10), keuze("t-cat2", "mer", 18)],
    "game_prediction_stats:tdf": leeg
      ? []
      : [
          stem("gc", "pog", 33, 1),
          stem("gc", "vin", 7, 1),
          stem("gc", "vin", 25, 2),
          stem("gc", "evp", 20, 3),
          stem("points", "phi", 22),
          stem("points", "mer", 12),
          stem("kom", "pog", 15),
          stem("kom", "vin", 9),
          stem("youth", "evp", 30),
          stem("youth", "jor", 10),
        ],
  };
  return w;
}

laadWereld(wereldNaam === "tour" ? tourWereld() : mmWereld(), NEP_GEBRUIKER_ID);

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
      <strong>Hors Catégorie-testbank</strong>
      <span className="text-neutral-500">nepdata</span>
      <select className={knop} value={wereldNaam} onChange={(e) => zet("wereld", e.target.value)}>
        <option value="mm">Meermarathon (mannen, live)</option>
        <option value="tour">Tour de France (live)</option>
      </select>
      <button className={knop} onClick={() => zet("leeg", leeg ? null : "1")}>
        {leeg ? "zonder voorspellingen" : "met voorspellingen"}
      </button>
      <button className={knop} onClick={() => zet("modus", params.get("modus") === "nacht" ? null : "nacht")}>
        {params.get("modus") === "nacht" ? "nacht" : "licht"}
      </button>
    </div>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } });

function Testbank() {
  if (supabaseConfig.url !== "nepdata://testbank") {
    return (
      <p className="p-6 font-sans">
        Start deze testbank met <code>npx vite --config vite.nepdata.config.ts</code>; anders draait hij op de echte
        database.
      </p>
    );
  }
  const gameId = wereldNaam === "tour" ? "tdf" : "mm-m";
  return (
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter initialEntries={["/hors-categorie"]}>
            <Bediening />
            <SelectedGameProvider>
              <AuthProvider>
                <ThemaProvider>
                  <main className="container mx-auto max-w-5xl px-3 py-4">
                    <HorsCategorieTab initialTab="pelotonkeuzes" gameId={gameId} gameStatus="live" />
                  </main>
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
