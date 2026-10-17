/**
 * Visuele testbank voor de koerskeuze (niet in de router, niet in de build).
 * Rendert de ECHTE onderdelen met de games zoals ze nu op productie staan
 * (vier afgeronde wielerkoersen + de Meermarathon), zodat de opmaak te
 * beoordelen is zonder database of inlog:
 *  - geen koersbalk meer bij één lopende koers;
 *  - geen "Oude koersen" in de kop: die staan in het archief op /profiel;
 *  - de terugkijk-strook zodra een oude koers gekozen is;
 *  - de koersbalk alléén als er twee lopende koersen zijn (juli: Tour + Femmes).
 * De kop van de site is hier een nagebouwde schil (de echte hangt aan inlog).
 *
 * Draaien: npx vite  →  /dev-koersbalk.html  (?deel=telefoon|desktop, ?modus=nacht)
 */
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Instagram, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import GameSwitcher from "@/components/GameSwitcher";
import TerugkijkStrip from "@/components/TerugkijkStrip";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import type { GameRow } from "@/hooks/useAllGames";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const MM_V: GameRow = { id: "mm-v", name: "Meermarathon Vrouwen 2026-2027", year: 2026, status: "open_inschrijving", game_type: "meermarathon", categorie: "vrouwen" };
const MM_M: GameRow = { id: "mm-m", name: "Meermarathon Mannen 2026-2027", year: 2026, status: "open_inschrijving", game_type: "meermarathon", categorie: "mannen" };
const OUD: GameRow[] = [
  { id: "giro", name: "Giro d'Italia 2026", year: 2026, status: "finished", game_type: "giro" },
  { id: "tour", name: "Tour de France 2026", year: 2026, status: "finished", game_type: "tour" },
  { id: "femmes", name: "Tour de France Femmes 2026", year: 2026, status: "finished", game_type: "femmes" },
  { id: "vuelta", name: "Vuelta a España 2026", year: 2026, status: "finished", game_type: "vuelta" },
];
const NU: GameRow[] = [MM_V, MM_M, ...OUD];
/** Juli 2027: Tour en Tour Femmes lopen tegelijk, de rest is afgerond. */
const JULI: GameRow[] = [
  { id: "tour27", name: "Tour de France 2027", year: 2027, status: "live", game_type: "tour" },
  { id: "femmes27", name: "Tour de France Femmes 2027", year: 2027, status: "open_inschrijving", game_type: "femmes" },
  { id: "giro27", name: "Giro d'Italia 2027", year: 2027, status: "finished", game_type: "giro" },
  { ...MM_V, status: "finished" },
  ...OUD,
];
const PELOTONS: PelotonItem[] = [
  { id: "mm-v", label: "Vrouwen", categorie: "vrouwen", soort: "meedoen", regel: "12e van 1.204" },
  { id: "mm-m", label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "48e van 986" },
];
const LOGO = "/koerspoule-meermarathon.png";
const NAV = ["Home", "Stel je team samen", "Uitslagen", "Mijn Peloton", "Uitleg", "Koersreglement"];

function Blok({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{titel}</h2>
      {children}
    </section>
  );
}

/** Telefoonkader: op een smal venster gewoon de paginabreedte, op desktop 390px. */
function Telefoon({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 md:mx-0 md:w-[390px] md:rounded-[28px] md:border-[6px] md:border-foreground/80 bg-background md:overflow-hidden md:shadow-[6px_6px_0_hsl(var(--foreground)/0.25)]">
      {children}
    </div>
  );
}

/** Nagebouwde kop van de site op de telefoon (logo, taal, hamburger). */
function TelefoonKop({ menuOpen = false, menu }: { menuOpen?: boolean; menu?: ReactNode }) {
  return (
    <header className="bg-card border-b border-border/70">
      <div className="race-rule" />
      <div className="px-5 flex items-center justify-between h-14">
        <img src={LOGO} alt="Koerspoule logo" className="h-12 w-auto" />
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center h-9 rounded-lg border border-foreground/30 overflow-hidden">
            <span className="inline-flex items-center justify-center h-full w-9 border-r border-foreground/30">
              <Instagram className="h-[18px] w-[18px]" />
            </span>
            <span className="inline-flex items-center h-full px-2 font-mono text-[11px] font-semibold">NL · EN</span>
          </div>
          <span className="p-1.5 -mr-1">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</span>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-border/40 bg-background px-4 pb-4 pt-3 flex flex-wrap gap-2">
          {NAV.map((n) => (
            <span key={n} className={cn("nav-link-editorial", n === "Mijn Peloton" && "active")}>{n}</span>
          ))}
          {menu}
          <div className="w-full border-t border-border/40 pt-2 mt-1"><span className="nav-link-editorial">Nachtmodus</span></div>
          <div className="w-full border-t border-border/40 pt-2 mt-1 flex"><span className="nav-link-editorial">Uitloggen</span></div>
        </nav>
      )}
      <div className="bolletjes-rule" aria-hidden />
    </header>
  );
}

function Inhoud({ tekst }: { tekst: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {tekst}
    </div>
  );
}

/* ── Telefoonschermen ─────────────────────────────────────────────────── */

function TelefoonNu() {
  const [gekozen, setGekozen] = useState("mm-v");
  return (
    <Telefoon>
      <TelefoonKop />
      <div className="px-5 pb-5 pt-3">
        <GameSwitcher games={NU} selectedId={gekozen} onSelect={setGekozen} className="mb-4" />
        <Pelotonbalk seizoen={"’26-’27"} items={PELOTONS} selectedId={gekozen} onSelect={setGekozen} />
        <div className="mt-3"><Inhoud tekst="Krant · Volgwagen · Subpoules …" /></div>
      </div>
    </Telefoon>
  );
}

function TelefoonTerugkijken() {
  const [gekozen, setGekozen] = useState("giro");
  return (
    <Telefoon>
      <TelefoonKop />
      <div className="px-5 pb-5 pt-3">
        <GameSwitcher games={NU} selectedId={gekozen} onSelect={setGekozen} className="mb-3" />
        <Inhoud tekst={gekozen === "giro" ? "Giro 2026 · Krant · Volgwagen · Uitslagen …" : "Meermarathon · Krant · Volgwagen …"} />
      </div>
    </Telefoon>
  );
}

function TelefoonJuli() {
  const [gekozen, setGekozen] = useState("tour27");
  return (
    <Telefoon>
      <TelefoonKop />
      <div className="px-5 pb-5 pt-3">
        <GameSwitcher games={JULI} selectedId={gekozen} onSelect={setGekozen} className="mb-3" />
        <Inhoud tekst="Krant · Volgwagen · Subpoules …" />
      </div>
    </Telefoon>
  );
}

/* ── Desktop ──────────────────────────────────────────────────────────── */

function DesktopKop() {
  return (
    <header className="bg-card border-b border-border/70 rounded-t-lg overflow-visible">
      <div className="race-rule" />
      <div className="px-5 flex items-center justify-between h-14">
        <img src={LOGO} alt="Koerspoule logo" className="h-12 w-auto" />
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center h-9 rounded-lg border border-foreground/30 overflow-hidden">
            <span className="inline-flex items-center justify-center h-full w-9 border-r border-foreground/30"><Instagram className="h-[18px] w-[18px]" /></span>
            <span className="inline-flex items-center h-full px-2 font-mono text-[11px] font-semibold">NL · EN</span>
          </div>
          <span className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded">Uitloggen</span>
        </div>
      </div>
      <div className="border-t border-border/40 bg-background/40 px-5">
        <nav className="flex items-center gap-1.5">
          {NAV.map((n) => (
            <span key={n} className={cn("nav-link-editorial", n === "Mijn Peloton" && "active")}>{n}</span>
          ))}
        </nav>
      </div>
      <div className="bolletjes-rule" aria-hidden />
    </header>
  );
}

function Desktop() {
  const [gekozen, setGekozen] = useState("mm-v");
  return (
    <div className="rounded-lg border border-border/70 bg-background shadow-[4px_4px_0_hsl(var(--foreground)/0.15)]">
      <DesktopKop />
      <div className="px-5 py-6">
        <GameSwitcher games={NU} selectedId={gekozen} onSelect={setGekozen} className="max-w-5xl mx-auto mb-4" />
        <div className="max-w-5xl mx-auto">
          <Inhoud tekst={gekozen === "mm-v" ? "Mijn Peloton · Meermarathon ’26-’27" : `Mijn Peloton · ${gekozen} (terugkijken)`} />
        </div>
      </div>
    </div>
  );
}

function DesktopStrip() {
  const [gekozen, setGekozen] = useState("tour");
  const game = OUD.find((g) => g.id === gekozen) ?? OUD[1];
  return <TerugkijkStrip game={game} terugNaar={MM_V} onSelect={setGekozen} className="max-w-5xl mx-auto" />;
}

function Testbank() {
  const params = new URLSearchParams(window.location.search);
  const [modus, setModus] = useState(params.get("modus") === "nacht" ? "nacht" : "licht");
  const deel = params.get("deel");

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-thema", "winter");
    if (modus === "nacht") root.setAttribute("data-modus", "nacht");
    else root.removeAttribute("data-modus");
  }, [modus]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 overflow-x-hidden">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-widest">koerskeuze-testbank</span>
          <select className="rounded border bg-card px-2 py-1" value={modus} onChange={(e) => setModus(e.target.value)}>
            <option value="licht">licht</option>
            <option value="nacht">nacht</option>
          </select>
        </div>

        {deel !== "desktop" && (
          <>
            <Blok titel="1 · Telefoon — Mijn Peloton, lopende koers: geen balk meer"><TelefoonNu /></Blok>
            <Blok titel="3 · Telefoon — oude koers gekozen: dossiermap met de weg terug"><TelefoonTerugkijken /></Blok>
            <Blok titel="4 · Telefoon — juli: twee lopende koersen, dan wél de balk"><TelefoonJuli /></Blok>
          </>
        )}
        {deel !== "telefoon" && (
          <>
            <Blok titel="5 · Desktop — navigatiestrook zonder Oude koersen"><Desktop /></Blok>
            <Blok titel="6 · Desktop — terugkijk-strook"><DesktopStrip /></Blok>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Testbank />);
