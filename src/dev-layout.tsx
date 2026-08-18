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
import OnboardingCard, { ONBOARDING_KEY, onboardingWeggeklikt } from "@/components/OnboardingCard";
import { SteunBanner } from "@/components/SteunKopgroep";
import PercentileVerdict from "@/components/horscat/PercentileVerdict";
import Rondleiding, { rondleidingHerstarten, useUitgelichteNav } from "@/components/Rondleiding";
import { StatusBlokView } from "@/components/StatusBlok";
import ZwevendeActie from "@/components/ZwevendeActie";
import PloegSkeleton from "@/components/skeletons/PloegSkeleton";
import aapFietser from "@/assets/horscat/aap-fietser-transparant.png";
import "@/i18n";
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
  // Bootst na: de pagina denkt dat er een zijkolom is, maar alle kaarten
  // geven zelf null terug (eerder weggeklikt).
  const [leegKind, setLeegKind] = useState(false);
  const [herstelTeller, setHerstelTeller] = useState(0);
  const [onbWeg, setOnbWeg] = useState(() => onboardingWeggeklikt());
  const [tour, setTour] = useState(false);
  const uitgelicht = useUitgelichteNav();
  const haalTerug = () => {
    try { localStorage.removeItem(ONBOARDING_KEY); } catch { /* negeer */ }
    setOnbWeg(false);
    setHerstelTeller((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Rondleiding open={tour} onClose={() => setTour(false)} heeftStreekTab />
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="font-display text-2xl font-black">Layout-testbank</h1>
          <button
            onClick={() => setRail((v) => !v)}
            className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold"
          >
            zijkolom: {rail ? "aan" : "uit"}
          </button>
          <button
            onClick={() => setLeegKind((v) => !v)}
            className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold"
          >
            kaarten weggeklikt: {leegKind ? "ja" : "nee"}
          </button>
          <button
            onClick={() => { rondleidingHerstarten(); setTour(true); }}
            className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold"
          >
            rondleiding starten
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">uitgelicht: {uitgelicht ?? "-"}</span>
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
              "mt-4 flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-5"
            }
          >
            {rail && (
              <aside className="order-1 flex flex-col gap-3 empty:hidden md:order-2 md:w-[268px]">
                {!leegKind && !onbWeg && <>
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
                <OnboardingCard
                  key={herstelTeller}
                  onDismissed={() => setOnbWeg(true)}
                  hasTeam={false}
                  inSubpoule
                  liveTracking={false}
                  statsBekeken={false}
                  krantBekeken={false}
                  onTeam={() => {}}
                  onSubpoule={() => {}}
                  onResults={() => {}}
                  onStats={() => {}}
                  onKrant={() => {}}
                />
                <div data-steun>
                  <SteunBanner revKey="testbank" />
                </div>
                </>}
              </aside>
            )}
            <div className="order-2 min-w-0 md:order-1">
              {onbWeg && (
                <button data-herstel onClick={haalTerug} className="mb-3 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-foreground/[0.05]">
                  ↺ Toon hulpkaarten weer
                </button>
              )}
              <RetroTabs variant="segment" tabs={SUB} active={sub} onChange={setSub} aria-label="sub2" className="mb-3 inline-flex" />
              <div className="ornate-frame retro-border bg-card p-8 text-center text-sm text-muted-foreground">
                inhoud — let op de breedte van de subbalk hierboven
              </div>
            </div>
          </div>
        </Blok>
        <Blok titel="Statusblok (mobiel) — met en zonder subpoule">
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { naam: "met subpoule", subpoule: { rank: 3, total: 14, delta: 1, name: "De Kopgroep" } },
              { naam: "zonder subpoule", subpoule: null },
            ].map((v) => (
              <div key={v.naam}>
                <div className="mb-1 font-mono text-[10px] text-muted-foreground">{v.naam} (375px)</div>
                <div style={{ width: 375 }} className="rounded border border-dashed border-foreground/20 p-2">
                  <StatusBlokView
                    overall={{ rank: 5, total: 212, delta: 2 }}
                    subpoule={v.subpoule}
                    totaalPunten={486}
                    laatsteEtappe={{ stageNumber: 12, rank: 8, points: 34 }}
                    onOpenKlassement={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            NB: md:hidden — smal maken om te zien, of het venster onder 768px brengen.
          </p>
        </Blok>

        <Blok titel="Ploeg-skeleton">
          <div style={{ width: 375 }}><PloegSkeleton /></div>
        </Blok>

        <Blok titel="Zwevende actieknop (linksonder, md:hidden)">
          <ZwevendeActie label="Wijzig ploeg" icon={Pencil} onClick={() => {}} />
          <p className="font-mono text-[10px] text-muted-foreground">Kijk linksonder in beeld.</p>
        </Blok>

        <Blok titel="Monkey IQ-hero — puilt het getal buiten de kaart?">
          <div className="space-y-4">
            {[860, 700, 560, 420].map((w) => (
              <div key={w}>
                <div className="mb-1 font-mono text-[10px] text-muted-foreground">kolombreedte {w}px</div>
                <div style={{ width: w }} data-meet={w}>
                  <PercentileVerdict percentile={88} userPoints={545} monkeyAvg={432} illustrationSrc={aapFietser} />
                </div>
              </div>
            ))}
          </div>
        </Blok>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
