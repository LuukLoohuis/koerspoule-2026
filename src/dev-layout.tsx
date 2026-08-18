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
import HorsSkeleton from "@/components/skeletons/HorsSkeleton";
import SponsorStrip from "@/components/SponsorStrip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobielTabBalk } from "@/components/MobielTabBalk";
import SwipeHintBar from "@/components/SwipeHintBar";
import TruiBadge from "@/components/retro/TruiBadge";
import Podium from "@/components/Podium";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
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

const HORS_SUB = [
  { key: "dartpijl", label: "Dartpijl", Icon: Target },
  { key: "pelotonkeuzes", label: "Pelotonkeuzes", Icon: Users },
  { key: "wielerdirecteur", label: "De Wielerdirecteur", Icon: Newspaper },
  { key: "superteam", label: "The Emirates", Icon: Trophy },
  { key: "benchmark", label: "Benchmark", Icon: Mountain },
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

// De echte SponsorStrip haalt zijn data via react-query; hier zetten we die
// vooraf in de cache, zodat het component zelf getoond wordt en niet een kopie.
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
qc.setQueryData(["sponsors", "visible"], [
  { id: "1", naam: "Wij Geven Licht", logo_url: "/koerspoule-meermarathon.png", label: null, weergavenaam: null, link_url: "https://example.com", zichtbaar: true, sort_order: 1, created_at: "" },
  { id: "2", naam: "De Digitale Basis", logo_url: "/favicon-meermarathon.svg", label: null, weergavenaam: null, link_url: "https://example.com", zichtbaar: true, sort_order: 2, created_at: "" },
  { id: "3", naam: "Oele Sport", logo_url: null, label: "Partner", weergavenaam: "OELE", link_url: null, zichtbaar: true, sort_order: 3, created_at: "" },
  { id: "4", naam: "Schaatsshop", logo_url: null, label: null, weergavenaam: "SCHAATSSHOP", link_url: "https://example.com", zichtbaar: true, sort_order: 4, created_at: "" },
]);

function Harness() {
  const [hoofd, setHoofd] = useState<string>("team");
  const [sub, setSub] = useState<string>("ploeg");
  const [horsSub, setHorsSub] = useState<string>("dartpijl");
  const [rail, setRail] = useState(true);
  // Bootst na: de pagina denkt dat er een zijkolom is, maar alle kaarten
  // geven zelf null terug (eerder weggeklikt).
  const [leegKind, setLeegKind] = useState(false);
  const [herstelTeller, setHerstelTeller] = useState(0);
  const [onbWeg, setOnbWeg] = useState(() => onboardingWeggeklikt());
  const [tour, setTour] = useState(false);
  const [heeftSub, setHeeftSub] = useState(true);
  const uitgelicht = useUitgelichteNav();
  const haalTerug = () => {
    try { localStorage.removeItem(ONBOARDING_KEY); } catch { /* negeer */ }
    setOnbWeg(false);
    setHerstelTeller((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Rondleiding
        open={tour}
        onClose={() => setTour(false)}
        heeftStreekTab
        heeftLiveTab
        heeftSubpoule={heeftSub}
        onNavigeer={(sectie, sub) => {
          (window as unknown as { __nav?: string[] }).__nav ??= [];
          (window as unknown as { __nav: string[] }).__nav.push(sub ? `${sectie}/${sub}` : sectie);
        }}
      />
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
          <button
            onClick={() => setHeeftSub((v) => !v)}
            className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold"
          >
            in subpoule: {heeftSub ? "ja" : "nee"}
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">uitgelicht: {uitgelicht ?? "-"}</span>
        </div>

        <Blok titel="Hoofdnavigatie — variant dossard">
          <RetroTabs tabs={HOOFD} active={hoofd} onChange={setHoofd} aria-label="hoofd" />
        </Blok>

        <Blok titel="Sub-navigatie — variant segment">
          <RetroTabs variant="segment" tabs={SUB} active={sub} onChange={setSub} aria-label="sub" />
          <div className="mt-4"><RetroTabs variant="segment" tabs={HORS_SUB} active={horsSub} onChange={setHorsSub} aria-label="sub-hors" /></div>
        </Blok>

        <Blok titel="Samen, in de kolomindeling zoals op Mijn Peloton">
          <RetroTabs tabs={HOOFD} active={hoofd} onChange={setHoofd} aria-label="hoofd2" uitgelichteKey={uitgelicht} />
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
                  onRondleiding={() => { rondleidingHerstarten(); setTour(true); }}
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

        <Blok titel="Truien — legt een scherm zijn eigen game-thema op?">
          <div className="flex items-end gap-8">
            <div data-trui="sitethema" className="text-center">
              <TruiBadge type="algemeen" formaat="groot" />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">zonder provider (sitethema)</div>
            </div>
            {(["geel", "rood", "roze"] as const).map((k) => (
              <div key={k} data-trui={k} className="text-center">
                <KoersThemaProvider themaKey={k}>
                  <TruiBadge type="algemeen" formaat="groot" />
                </KoersThemaProvider>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">opgelegd: {k}</div>
              </div>
            ))}
          </div>
        </Blok>

        <Blok titel="Podium — volgt de beker het opgelegde koersthema?">
          <div className="flex gap-6">
            {(["geel", "rood", "roze"] as const).map((k) => (
              <div key={k} style={{ width: 260 }} data-podium={k}>
                <div className="mb-1 font-mono text-[10px] text-muted-foreground">opgelegd: {k}</div>
                <KoersThemaProvider themaKey={k}>
                  <Podium entries={[
                    { rank: 1, name: "tombulter", points: 2668 },
                    { rank: 2, name: "Kelderman Best", points: 2656 },
                    { rank: 3, name: "EddyT", points: 2633 },
                  ]} />
                </KoersThemaProvider>
              </div>
            ))}
          </div>
        </Blok>

        <Blok titel="Mobiele subbalk — chromehoogte boven de inhoud">
          <div className="flex gap-8">
            {[
              { naam: "Volgwagen (3)", tabs: SUB },
              { naam: "Hors Cat\u00e9gorie (5)", tabs: HORS_SUB },
            ].map((v) => (
              <div key={v.naam} style={{ width: 351 }} data-mobiel={v.naam}>
                <div className="mb-1 font-mono text-[10px] text-muted-foreground">{v.naam} — 351px breed</div>
                <div className="rounded border border-dashed border-foreground/20 p-3">
                  <div data-chrome>
                    <MobielTabBalk
                      tabs={v.tabs.map((t) => ({ key: t.key, label: t.label, icon: t.Icon }))}
                      active={v.tabs[0].key}
                      onChange={() => {}}
                    />
                    <SwipeHintBar visible onClose={() => {}} className="mb-2" />
                  </div>
                  <div className="retro-border bg-card p-4 text-center text-xs text-muted-foreground">inhoud begint hier</div>
                </div>
              </div>
            ))}
          </div>
        </Blok>

        <Blok titel="Sponsorstrook — reclamebord">
          <div data-strook className="-mx-8">
            <QueryClientProvider client={qc}>
              <SponsorStrip />
            </QueryClientProvider>
          </div>
        </Blok>

        <Blok titel="Ploeg-skeleton">
          <div style={{ width: 375 }}><PloegSkeleton /></div>
        </Blok>

        <Blok titel="Hors Cat\u00e9gorie-skeleton">
          <div data-horsskel style={{ maxWidth: 820 }}><HorsSkeleton /></div>
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
