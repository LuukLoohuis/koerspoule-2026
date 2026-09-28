/**
 * Testbank voor de ploegbouwer (/team-samenstellen): de echte pagina met de
 * echte hooks, op een nepdatabase in het geheugen. Kiezen, voorspellen,
 * indienen en wisselen tussen de pelotons werken; na herladen begint alles
 * opnieuw. Niet in de router, niet in de build.
 *
 * Draaien: npx vite --config vite.nepdata.config.ts --port 3200
 *   → /dev-ploegbouwer.html?wereld=mm&stand=bezig
 *
 *   wereld  mm (Meermarathon: vrouwen en mannen) | tour (om naast te leggen)
 *   stand   nieuw | bezig | ingediend  (je vrouwenploeg; bij de mannen nog niets)
 *   mannen  open_inschrijving | open   (open = sneak preview)
 *   game    mm-v | mm-m                (welk peloton open staat)
 *   vrouwen geen                       (alleen de mannen, live: zoals nu op koerspoule.nl)
 *   modus   nacht                      (winter bij nacht)
 */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { SelectedGameProvider } from "@/context/SelectedGameContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemaProvider } from "@/contexts/ThemaContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import TeamBuilder from "@/pages/TeamBuilder";
import { supabaseConfig } from "@/lib/supabase";
import { huidigeWereld, laadWereld } from "@/dev/nepdata/supabase";
import { NEP_GEBRUIKER_ID } from "@/dev/nepdata/useAuth";
import { alleenMannen, meermarathon, tour, type MmStand } from "@/dev/nepdata/werelden";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const params = new URLSearchParams(window.location.search);
const wereldNaam = params.get("wereld") === "tour" ? "tour" : "mm";
const stand = (["nieuw", "bezig", "ingediend"].includes(params.get("stand") ?? "") ? params.get("stand") : "bezig") as MmStand;
const mannen = params.get("mannen") === "open" ? "open" : "open_inschrijving";
const game = params.get("game");
const zonderVrouwen = params.get("vrouwen") === "geen";

laadWereld(
  wereldNaam === "tour"
    ? tour(NEP_GEBRUIKER_ID)
    : zonderVrouwen
      ? alleenMannen(NEP_GEBRUIKER_ID)
      : meermarathon(NEP_GEBRUIKER_ID, stand, mannen),
  NEP_GEBRUIKER_ID,
);
// In de console: nepWereld().entries laat zien wat er bewaard is.
Object.assign(window, { nepWereld: huidigeWereld });

try {
  // Alleen de testbank: een nieuwe sessie begint op de standaardgame, en de
  // cookiemelding hoort niet in beeld.
  sessionStorage.removeItem("koerspoule_selected_game");
  localStorage.setItem("koers-cookies-accepted-v2", "true");
  if (params.get("modus") === "nacht") localStorage.setItem("koerspoule:modus", "nacht");
  else localStorage.removeItem("koerspoule:modus");
} catch {
  /* opslag geblokkeerd: dan maar met melding */
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
      <strong>Ploegbouwer-testbank</strong>
      <span className="text-neutral-500">nepdata, niets wordt opgeslagen</span>
      <select className={knop} value={wereldNaam} onChange={(e) => zet("wereld", e.target.value)}>
        <option value="mm">Meermarathon</option>
        <option value="tour">Tour de France</option>
      </select>
      {wereldNaam === "mm" && (
        <>
          <select className={knop} value={zonderVrouwen ? "geen" : "wel"} onChange={(e) => zet("vrouwen", e.target.value === "geen" ? "geen" : null)}>
            <option value="wel">vrouwen en mannen</option>
            <option value="geen">alleen mannen, live (zoals nu)</option>
          </select>
          <select className={knop} value={stand} onChange={(e) => zet("stand", e.target.value)}>
            <option value="nieuw">vrouwen: nog niets</option>
            <option value="bezig">vrouwen: half af</option>
            <option value="ingediend">vrouwen: ingediend</option>
          </select>
          <select className={knop} value={mannen} onChange={(e) => zet("mannen", e.target.value === "open" ? "open" : null)}>
            <option value="open_inschrijving">mannen: inschrijving open</option>
            <option value="open">mannen: sneak preview</option>
          </select>
          <button className={knop} onClick={() => zet("modus", params.get("modus") === "nacht" ? null : "nacht")}>
            {params.get("modus") === "nacht" ? "nacht" : "licht"}
          </button>
        </>
      )}
      <button className={knop} onClick={() => window.location.reload()}>
        opnieuw
      </button>
    </div>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } });

function Testbank() {
  // Zonder de nepdata-config praat deze pagina met de echte database.
  if (supabaseConfig.url !== "nepdata://testbank") {
    return (
      <p className="p-6 font-sans">
        Start deze testbank met <code>npx vite --config vite.nepdata.config.ts</code>; anders draait hij op de echte
        database.
      </p>
    );
  }
  return (
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MemoryRouter initialEntries={[game ? `/team-samenstellen?game=${game}` : "/team-samenstellen"]}>
            <Bediening />
            <SelectedGameProvider>
              <AuthProvider>
                <ThemaProvider>
                  <Layout>
                    <TeamBuilder />
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
