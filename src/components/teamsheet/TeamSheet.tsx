/**
 * <TeamSheet> — data-gedreven fantasy team-hiërarchie (retro koersmagazinestijl).
 *
 * Compositie:
 *   1. Titel-rij ("HIËRARCHIE VAN HET PELOTON · (n)")
 *   2. HERO panel — Top Klassement: kroon + gestapelde caps-titel links, ALIEN+GC
 *      als grote cyclists rechts (rijdend van links naar rechts).
 *   3. CATEGORY grid — SPRINT / KLIM / TIJDRIT / AANVAL / PUNCH / KLASSIEK /
 *      TALENT / OUD. Per panel: badge-icoon + caps-titel + telling, lijst-rijen
 *      (cyclist | naam | nummer-chip).
 *   4. UITGEVALLEN — schedel-icoon, grayscale renners, geen rood vlak.
 *   5. Legenda — kleur ↔ categorie (caps).
 *
 * Subtiele achtergrond line-art (wielen in hoeken, bergsilhouet onderaan) staat
 * achter de inhoud, ver onder de text-contrast.
 */

import { useMemo } from "react";
import { Crown } from "lucide-react";
import CategoryPanel from "./CategoryPanel";
import RiderTile from "./RiderTile";
import RiderStageBreakdown from "./RiderStageBreakdown";
import {
  type RiderCategory,
  type SheetRider,
  uniqueCategoriesInOrder,
} from "./tokens";

type Props = {
  riders: SheetRider[];
  loading?: boolean;
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
  /** Renner waarvan de per-etappe-punten dropdown openstaat (toggle). */
  expandedRiderId?: string | null;
  onToggleRider?: (id: string) => void;
  /** Nodig voor de punten-RPC in de dropdown. */
  gameId?: string;
  entryId?: string | null;
  /** Totaal behaalde punten per renner (rider_id → punten). */
  riderTotals?: Map<string, number>;
  /** True zodra de totalen geladen zijn — dan tonen renners zonder punten
   *  "0" i.p.v. "–". */
  riderTotalsReady?: boolean;
};

const HERO_CATEGORIES: RiderCategory[] = ["ALIEN", "GC"];

/** Resolve het te tonen totaal: undefined zolang niet geladen (toont "–"),
 *  anders het getal (0 als de renner niet in de map zit). */
function resolveTotal(
  ready: boolean | undefined,
  totals: Map<string, number> | undefined,
  riderId: string,
): number | undefined {
  if (!ready) return undefined;
  return totals?.get(riderId) ?? 0;
}

export default function TeamSheet({
  riders,
  loading = false,
  selectedRiderId,
  onRiderClick,
  expandedRiderId,
  onToggleRider,
  gameId,
  entryId,
  riderTotals,
  riderTotalsReady,
}: Props) {
  const { activeByCat, otherActiveCats, total } = useMemo(() => {
    // Alle renners per categorie. Binnen elk panel: actieve eerst, DNF onderaan
    // (RiderTile rendert DNF met doorgestreepte naam + rood kruis door het
    // silhouet — zo blijven de uitvallers benoemd zichtbaar).
    const byCat = new Map<RiderCategory, SheetRider[]>();
    for (const r of riders) {
      const list = byCat.get(r.category) ?? [];
      list.push(r);
      byCat.set(r.category, list);
    }
    for (const [k, list] of byCat) {
      list.sort((a, b) => {
        const da = a.status === "DNF" ? 1 : 0;
        const db = b.status === "DNF" ? 1 : 0;
        return da - db;
      });
      byCat.set(k, list);
    }
    const present = uniqueCategoriesInOrder(riders);
    const others = present.filter((c) => !HERO_CATEGORIES.includes(c));
    return { activeByCat: byCat, otherActiveCats: others, total: riders.length };
  }, [riders]);

  if (loading) return <TeamSheetSkeleton />;
  if (riders.length === 0) {
    return (
      <div
        className="vintage-paper rounded-lg p-6 text-center"
        style={{ border: "1px solid var(--ink-sepia)" }}
      >
        <p className="vintage-stamp text-[11px]" style={{ color: "var(--ink-faded)" }}>
          Nog geen renners gekozen.
        </p>
      </div>
    );
  }

  const heroRiders: SheetRider[] = HERO_CATEGORIES.flatMap((c) => activeByCat.get(c) ?? []);
  const expandedHeroRider = heroRiders.find((r) => r.id === expandedRiderId) ?? null;

  return (
    <div className="relative space-y-4 md:space-y-5">
      {/* ── Subtiele achtergrond line-art (achter alles, low contrast) ── */}
      <BackgroundDecor />

      {/* 1. Titel-rij — dubbele inktstrepen links/rechts, gespatieerde caps midden. */}
      <div className="flex items-center gap-3 relative px-1">
        <div className="flex-1">
          <div className="h-[1.5px]" style={{ background: "var(--ink-sepia)" }} />
          <div className="h-[1px] mt-0.5" style={{ background: "var(--ink-sepia)", opacity: 0.55 }} />
        </div>
        <h2
          className="shrink-0"
          style={{
            fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
            color: "var(--ink-sepia)",
            fontSize: "15px",
            letterSpacing: "0.44em",
            textTransform: "uppercase",
            fontWeight: 700,
            paddingInline: "8px",
          }}
        >
          Mijn Ploeg
          <span className="ml-2 font-mono tabular-nums" style={{ color: "var(--ink-faded)", letterSpacing: "0.1em", fontSize: "12px" }}>
            ({total})
          </span>
        </h2>
        <div className="flex-1">
          <div className="h-[1.5px]" style={{ background: "var(--ink-sepia)" }} />
          <div className="h-[1px] mt-0.5" style={{ background: "var(--ink-sepia)", opacity: 0.55 }} />
        </div>
      </div>

      {/* 2. HERO — desktop: gele banner. Mobiel: standaard CategoryPanels
         zodat ALIEN/GC visueel consistent zijn met de overige categorieën. */}
      {heroRiders.length > 0 && (
        <>
          {/* Mobiel — render ALIEN/GC als gewone CategoryPanels */}
          <div className="md:hidden space-y-3">
            {HERO_CATEGORIES.filter((c) => (activeByCat.get(c)?.length ?? 0) > 0).map((c) => (
              <CategoryPanel
                key={c}
                category={c}
                riders={activeByCat.get(c) ?? []}
                selectedRiderId={selectedRiderId ?? null}
                onRiderClick={onRiderClick}
                expandedRiderId={expandedRiderId ?? null}
                onToggleRider={onToggleRider}
                gameId={gameId}
                entryId={entryId}
                riderTotals={riderTotals}
                riderTotalsReady={riderTotalsReady}
              />
            ))}
          </div>

          {/* Desktop — gele hero-banner met kroon + leidersstrip */}
          <section
            className="hidden md:block rounded-2xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(90deg, var(--vintage-yellow-hot) 0%, var(--vintage-yellow) 18%, #F4ECD8 60%, #F4ECD8 100%)",
              border: "1.5px solid var(--ink-sepia)",
              boxShadow: "0 2px 0 rgba(58,42,26,0.18), 0 8px 24px -14px rgba(58,42,26,0.35)",
            }}
            aria-label="Top klassement"
          >
            <div className="flex items-stretch gap-4 px-5 py-3 relative min-h-[140px]">
              <div className="flex items-center gap-3 shrink-0">
                <Crown
                  size={48}
                  strokeWidth={2.2}
                  style={{ color: "var(--ink-sepia)", filter: "drop-shadow(1px 1px 0 rgba(255,255,255,0.5))" }}
                />
                <div className="leading-none">
                  <div
                    style={{
                      fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                      fontWeight: 900,
                      color: "var(--ink-sepia)",
                      fontSize: "clamp(22px, 4.5vw, 32px)",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      lineHeight: 1.05,
                    }}
                  >
                    JACHT OP GEEL
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-wrap items-end gap-x-2 gap-y-1 pb-1">
                {heroRiders.map((r, i) => {
                  const isOpen = expandedRiderId === r.id;
                  return (
                    <div key={r.id} className="shrink-0 w-[92px]">
                      <RiderTile
                        rider={r}
                        size="hero"
                        selected={selectedRiderId === r.id || isOpen}
                        onClick={onToggleRider ?? onRiderClick}
                        ariaExpanded={onToggleRider ? isOpen : undefined}
                        ariaControls={onToggleRider ? `rider-breakdown-${r.id}` : undefined}
                        totalPoints={resolveTotal(riderTotalsReady, riderTotals, r.id)}
                        cyclistOverride={i === 0 ? "GC" : "KLIM"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {onToggleRider && expandedHeroRider && (
              <div className="px-6 pb-4 -mt-1">
                <RiderStageBreakdown
                  open
                  riderId={expandedHeroRider.id}
                  riderName={expandedHeroRider.name}
                  category={expandedHeroRider.category}
                  gameId={gameId}
                  entryId={entryId}
                  panelId={`rider-breakdown-${expandedHeroRider.id}`}
                />
              </div>
            )}
          </section>
        </>
      )}



      {/* 3. CATEGORY grid — panels in 1 rij op desktop, max 5 kolommen */}
      {otherActiveCats.length > 0 && (
        <div
          className="grid gap-3 md:gap-4 relative"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          }}
        >
          {otherActiveCats.map((c) => (
            <CategoryPanel
              key={c}
              category={c}
              riders={activeByCat.get(c) ?? []}
              selectedRiderId={selectedRiderId ?? null}
              onRiderClick={onRiderClick}
              expandedRiderId={expandedRiderId ?? null}
              onToggleRider={onToggleRider}
              gameId={gameId}
              entryId={entryId}
              riderTotals={riderTotals}
              riderTotalsReady={riderTotalsReady}
            />
          ))}
        </div>
      )}


    </div>
  );
}

/** Achtergrond line-art: groot wieldecor in de hoeken + bergsilhouet onderaan.
 *  Absolute positioned, lage opacity zodat de tekst leesbaar blijft. */
function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: 0.08 }}>
      {/* Linksboven wiel */}
      <svg
        viewBox="0 0 200 200"
        className="absolute -top-10 -left-10"
        width="220"
        height="220"
      >
        <circle cx="100" cy="100" r="86" fill="none" stroke="var(--ink-sepia)" strokeWidth="1.5" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 16;
          const y1 = 100 + Math.sin(a) * 16;
          const x2 = 100 + Math.cos(a) * 84;
          const y2 = 100 + Math.sin(a) * 84;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-sepia)" strokeWidth="0.7" />;
        })}
        <circle cx="100" cy="100" r="10" fill="none" stroke="var(--ink-sepia)" strokeWidth="1" />
      </svg>
      {/* Rechtsonder wiel */}
      <svg
        viewBox="0 0 200 200"
        className="absolute -bottom-12 -right-12"
        width="260"
        height="260"
      >
        <circle cx="100" cy="100" r="86" fill="none" stroke="var(--ink-sepia)" strokeWidth="1.5" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 16;
          const y1 = 100 + Math.sin(a) * 16;
          const x2 = 100 + Math.cos(a) * 84;
          const y2 = 100 + Math.sin(a) * 84;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-sepia)" strokeWidth="0.7" />;
        })}
        <circle cx="100" cy="100" r="10" fill="none" stroke="var(--ink-sepia)" strokeWidth="1" />
      </svg>
      {/* Onderaan: bergsilhouet */}
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 right-0"
        width="100%"
        height="140"
      >
        <path
          d="M0 200 L0 150 L120 110 L200 130 L300 70 L380 120 L470 80 L560 140 L660 90 L760 130 L860 70 L960 120 L1080 100 L1200 150 L1200 200 Z"
          fill="var(--ink-sepia)"
        />
      </svg>
    </div>
  );
}

function TeamSheetSkeleton() {
  const PILL = (h: number, w: number) => (
    <div
      className="animate-pulse rounded"
      style={{ background: "rgba(58,42,26,0.10)", height: `${h}px`, width: `${w}px` }}
    />
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
        {PILL(12, 240)}
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
      </div>
      <div className="vintage-paper rounded-2xl p-5" style={{ border: "1.5px solid var(--ink-sepia)" }}>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-[180px] flex flex-col gap-2">
            {PILL(40, 40)}
            {PILL(20, 110)}
            {PILL(20, 140)}
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                {PILL(9, 32)}
                {PILL(13, 84)}
                {PILL(70, 110)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, p) => (
          <div key={p} className="vintage-paper rounded-xl p-3" style={{ border: "1px solid rgba(58,42,26,0.18)", borderLeftWidth: 6 }}>
            <div className="flex items-center gap-2 mb-3">
              {PILL(32, 32)}
              {PILL(14, 90)}
            </div>
            {Array.from({ length: 3 }).map((__, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                {PILL(42, 56)}
                {PILL(13, 100)}
                {PILL(18, 36)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
