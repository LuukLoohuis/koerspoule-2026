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
import { Skull } from "./icons";
import {
  categoryTone,
  type RiderCategory,
  type SheetRider,
  uniqueCategoriesInOrder,
} from "./tokens";

type Props = {
  riders: SheetRider[];
  loading?: boolean;
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
};

const HERO_CATEGORIES: RiderCategory[] = ["ALIEN", "GC"];

export default function TeamSheet({ riders, loading = false, selectedRiderId, onRiderClick }: Props) {
  const { activeByCat, dnfRiders, otherActiveCats, total } = useMemo(() => {
    const active: SheetRider[] = [];
    const dnf: SheetRider[] = [];
    for (const r of riders) (r.status === "DNF" ? dnf : active).push(r);
    const byCat = new Map<RiderCategory, SheetRider[]>();
    for (const r of active) {
      const list = byCat.get(r.category) ?? [];
      list.push(r);
      byCat.set(r.category, list);
    }
    const present = uniqueCategoriesInOrder(active);
    const others = present.filter((c) => !HERO_CATEGORIES.includes(c));
    return { activeByCat: byCat, dnfRiders: dnf, otherActiveCats: others, total: riders.length };
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
  const legendCats = uniqueCategoriesInOrder([...riders.filter((r) => r.status !== "DNF"), ...dnfRiders]);

  return (
    <div className="relative space-y-4 md:space-y-5">
      {/* ── Subtiele achtergrond line-art (achter alles, low contrast) ── */}
      <BackgroundDecor />

      {/* 1. Titel-rij */}
      <div className="flex items-center gap-3 relative">
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
        <h2
          className="vintage-stamp shrink-0"
          style={{ color: "var(--ink-sepia)", fontSize: "11.5px", letterSpacing: "0.32em" }}
        >
          Hiërarchie van het peloton
          <span className="ml-2 font-mono tabular-nums" style={{ color: "var(--ink-faded)", letterSpacing: "0.1em" }}>
            ({total})
          </span>
        </h2>
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
      </div>

      {/* 2. HERO — Top Klassement */}
      {heroRiders.length > 0 && (
        <section
          className="vintage-paper rounded-2xl p-4 md:p-6 relative overflow-hidden"
          style={{
            border: "1.5px solid var(--ink-sepia)",
            boxShadow:
              "0 2px 0 rgba(58,42,26,0.18), 0 8px 24px -12px rgba(58,42,26,0.35), 0 0 0 4px rgba(232,185,35,0.10) inset",
          }}
          aria-label="Top klassement"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative">
            {/* Linkerblok: kroon + gestapelde titel */}
            <div className="flex items-center md:items-start gap-3 md:flex-col md:gap-2 shrink-0 md:w-[180px]">
              <Crown
                className="shrink-0"
                size={42}
                strokeWidth={2.2}
                style={{ color: "var(--medal-gold)" }}
              />
              <div>
                <div
                  className="font-mono"
                  style={{
                    color: "var(--ink-faded)",
                    fontSize: "10px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                  }}
                >
                  Le classement
                </div>
                <div
                  className="leading-none mt-0.5"
                  style={{
                    fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                    fontWeight: 800,
                    color: "var(--ink-sepia)",
                    fontSize: "26px",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  Top
                </div>
                <div
                  className="leading-none mt-0.5"
                  style={{
                    fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                    fontWeight: 800,
                    color: "var(--ink-sepia)",
                    fontSize: "26px",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  Klassement
                </div>
                <div className="mt-2 h-[2px] w-12" style={{ background: "var(--medal-gold)" }} />
              </div>
            </div>

            {/* Rechterblok: leider-cyclists, grote tiles */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4">
              {heroRiders.map((r) => (
                <RiderTile
                  key={r.id}
                  rider={r}
                  size="hero"
                  selected={selectedRiderId === r.id}
                  onClick={onRiderClick}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. CATEGORY grid */}
      {otherActiveCats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 relative">
          {otherActiveCats.map((c) => (
            <CategoryPanel
              key={c}
              category={c}
              riders={activeByCat.get(c) ?? []}
              selectedRiderId={selectedRiderId ?? null}
              onRiderClick={onRiderClick}
            />
          ))}
        </div>
      )}

      {/* 4. UITGEVALLEN */}
      {dnfRiders.length > 0 && (
        <section
          className="vintage-paper rounded-xl p-3 md:p-4 relative"
          style={{ border: "1px dashed var(--ink-sepia)" }}
          aria-label="Uitgevallen"
        >
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px dashed rgba(58,42,26,0.35)" }}>
            <Skull size={20} strokeWidth={2.2} style={{ color: "var(--ink-faded)" }} />
            <h3
              className="vintage-stamp"
              style={{ color: "var(--ink-faded)", fontSize: "11px", letterSpacing: "0.28em" }}
            >
              Uitgevallen
            </h3>
            <div className="flex-1 h-px" style={{ background: "rgba(58,42,26,0.18)" }} />
            <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-faded)" }}>
              {dnfRiders.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
            {dnfRiders.map((r) => (
              <RiderTile
                key={r.id}
                rider={r}
                size="default"
                selected={selectedRiderId === r.id}
                onClick={onRiderClick}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. LEGENDA */}
      {legendCats.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 relative"
          style={{ borderTop: "1px solid rgba(58,42,26,0.15)" }}
          aria-label="Legenda"
        >
          {legendCats.map((c) => {
            const t = categoryTone(c);
            return (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="block w-3 h-3 rounded-full"
                  style={{ background: t.jersey, border: "1px solid var(--ink-sepia)" }}
                />
                <span
                  className="vintage-stamp"
                  style={{ color: "var(--ink-faded)", fontSize: "9.5px", letterSpacing: "0.22em" }}
                >
                  {t.label}
                </span>
              </span>
            );
          })}
          {/* Uitgevallen-grijs uitleg */}
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block w-3 h-3 rounded-full"
              style={{ background: "#A8A39A", border: "1px solid var(--ink-sepia)" }}
            />
            <span
              className="vintage-stamp"
              style={{ color: "var(--ink-faded)", fontSize: "9.5px", letterSpacing: "0.22em" }}
            >
              Uitgevallen
            </span>
          </span>
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
