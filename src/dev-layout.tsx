/**
 * Tijdelijke visuele testbank (niet in de router, niet in de build van de app).
 * Rendert de ECHTE tabbalken en zijkolom-onderdelen met nepdata, zodat de
 * opmaak te beoordelen is zonder database of inlog.
 *
 * Draaien:  npx vite --config vite.config.ts   →  /dev-layout.html
 */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Newspaper, Car, Users, Trophy, Mountain, Target, Pencil } from "lucide-react";
import { RetroTabs } from "@/components/RetroTabs";
import "./index.css";

const HOOFD = [
  { key: "karavaan", label: "Marca", Icon: Newspaper },
  { key: "team", label: "Volgwagen", Icon: Car },
  { key: "subpoules", label: "Subpoules", Icon: Users },
  { key: "uitslagen", label: "Uitslagen", Icon: Trophy },
  { key: "hors", label: "Hors Catégorie", Icon: Mountain },
] as const;

const SUB = [
  { key: "ploeg", label: "Mijn Ploeg", Icon: Users },
  { key: "prono", label: "Pronostiek", Icon: Target },
  { key: "palmares", label: "Palmares", Icon: Trophy },
] as const;

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{titel}</h2>
      {children}
    </section>
  );
}

function Harness() {
  const [hoofd, setHoofd] = useState<string>("team");
  const [sub, setSub] = useState<string>("ploeg");
  const [rail, setRail] = useState(true);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="font-display text-2xl font-black">Layout-testbank</h1>
          <button
            onClick={() => setRail((v) => !v)}
            className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold"
          >
            zijkolom: {rail ? "aan" : "uit"}
          </button>
        </div>

        <Blok titel="Hoofdnavigatie — variant dossard">
          <RetroTabs tabs={HOOFD} active={hoofd} onChange={setHoofd} aria-label="hoofd" />
        </Blok>

        <Blok titel="Sub-navigatie — variant segment">
          <RetroTabs variant="segment" tabs={SUB} active={sub} onChange={setSub} aria-label="sub" />
        </Blok>

        <Blok titel="Samen, in de kolomindeling zoals op Mijn Peloton">
          <RetroTabs tabs={HOOFD} active={hoofd} onChange={setHoofd} aria-label="hoofd2" />
          <div
            className={
              "mt-4 flex flex-col " +
              (rail ? "md:grid md:grid-cols-[minmax(0,1fr)_268px] md:items-start md:gap-5" : "")
            }
          >
            {rail && (
              <aside className="order-1 flex flex-col gap-3 md:order-2">
                <form className="retro-border flex flex-col gap-2 bg-card px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Pencil className="h-3 w-3 shrink-0" /> Ploegnaam
                  </span>
                  <input
                    placeholder="Stel je ploegnaam in…"
                    className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 font-display font-bold outline-none"
                  />
                  <button className="retro-border-primary w-full rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                    Opslaan
                  </button>
                </form>
                <div className="ornate-frame retro-border bg-card p-4">
                  <div className="overline-stamp mb-1">— Welkom in het peloton —</div>
                  <p className="font-display text-lg font-bold">Zo ben je in 3 stappen weg</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    (echte OnboardingCard is breder opgezet — dit blok laat zien hoeveel ruimte er is)
                  </p>
                </div>
              </aside>
            )}
            <div className="order-2 min-w-0 md:order-1">
              <RetroTabs variant="segment" tabs={SUB} active={sub} onChange={setSub} aria-label="sub2" className="mb-3 inline-flex" />
              <div className="ornate-frame retro-border bg-card p-8 text-center text-sm text-muted-foreground">
                inhoud — let op de breedte van de subbalk hierboven
              </div>
            </div>
          </div>
        </Blok>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
