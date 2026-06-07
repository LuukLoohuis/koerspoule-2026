/**
 * <TeamSheet> — data-gedreven fantasy team-hierarchie in retro-koersmagazinestijl.
 *
 * Compositie:
 *   1. Titel-rij ("HIËRARCHIE VAN HET PELOTON · (n)")
 *   2. HERO panel — TOP KLASSEMENT (ALIEN + GC), grotere RiderTiles
 *   3. CATEGORY grid — SPRINT, KLIM, TIJDRIT, AANVAL/PUNCH/KLASSIEK, TALENT, OUD
 *   4. UITGEVALLEN panel — DNF-renners, grijs + ✕, doorgestreept
 *   5. Legenda — kleur ↔ categorie (caps)
 *
 * Geen hardcoded renners — alles komt uit de `riders` prop. Lege staat en
 * skeleton-state worden hier afgehandeld.
 */

import { useMemo } from "react";
import { Crown, Skull } from "lucide-react";
import CategoryPanel from "./CategoryPanel";
import RiderTile from "./RiderTile";
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

/** Categorieën die in het HERO-blok horen (kopman + GC). */
const HERO_CATEGORIES: RiderCategory[] = ["ALIEN", "GC"];

export default function TeamSheet({ riders, loading = false, selectedRiderId, onRiderClick }: Props) {
  /** Splits actieve renners per categorie + verzamel DNF apart. */
  const { activeByCat, dnfRiders, otherActiveCats, total } = useMemo(() => {
    const active: SheetRider[] = [];
    const dnf: SheetRider[] = [];
    for (const r of riders) {
      if (r.status === "DNF") dnf.push(r);
      else active.push(r);
    }
    const byCat = new Map<RiderCategory, SheetRider[]>();
    for (const r of active) {
      const list = byCat.get(r.category) ?? [];
      list.push(r);
      byCat.set(r.category, list);
    }
    const presentCats = uniqueCategoriesInOrder(active);
    const others = presentCats.filter((c) => !HERO_CATEGORIES.includes(c));
    return {
      activeByCat: byCat,
      dnfRiders: dnf,
      otherActiveCats: others,
      total: riders.length,
    };
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
  const legendCats = uniqueCategoriesInOrder([
    ...riders.filter((r) => r.status !== "DNF"),
    ...dnfRiders,
  ]);

  return (
    <div className="space-y-4 md:space-y-5">
      {/* 1. Titel-rij */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
        <h2
          className="vintage-stamp shrink-0"
          style={{ color: "var(--ink-sepia)", fontSize: "11px", letterSpacing: "0.32em" }}
        >
          Hiërarchie van het peloton
          <span className="ml-2 font-mono tabular-nums" style={{ color: "var(--ink-faded)", letterSpacing: "0.1em" }}>
            ({total})
          </span>
        </h2>
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
      </div>

      {/* 2. HERO — Top klassement (ALIEN + GC) */}
      {heroRiders.length > 0 && (
        <section
          className="vintage-paper rounded-xl p-4 md:p-5 relative"
          style={{
            border: "1.5px solid var(--ink-sepia)",
            boxShadow: "0 1px 0 rgba(58,42,26,0.18), 0 0 0 4px rgba(232,185,35,0.10) inset",
          }}
          aria-label="Top klassement"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 shrink-0" style={{ color: "var(--medal-gold)" }} />
            <h3
              className="vintage-stamp"
              style={{ color: "var(--ink-sepia)", fontSize: "12px", letterSpacing: "0.32em" }}
            >
              Top Klassement
            </h3>
            <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
            <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-faded)" }}>
              {heroRiders.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4">
            {heroRiders.map((r) => (
              // RiderTile rendert het figuur + naam; status zit al in rider.
              // We hergebruiken de "hero"-grootte voor de leiders.
              <CategoryPanelRider key={r.id} rider={r} selected={selectedRiderId === r.id} onClick={onRiderClick} />
            ))}
          </div>
        </section>
      )}

      {/* 3. CATEGORY grid */}
      {otherActiveCats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
          className="vintage-paper rounded-lg p-3 md:p-4"
          style={{ border: "1px dashed var(--ink-sepia)", opacity: 0.95 }}
          aria-label="Uitgevallen"
        >
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px dashed var(--ink-sepia)" }}>
            <Skull className="h-4 w-4 shrink-0" style={{ color: "var(--vintage-red)" }} />
            <h3
              className="vintage-stamp"
              style={{ color: "var(--vintage-red)", fontSize: "11px", letterSpacing: "0.28em" }}
            >
              Uitgevallen
            </h3>
            <div className="flex-1 h-px" style={{ background: "var(--vintage-red)", opacity: 0.25 }} />
            <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-faded)" }}>
              {dnfRiders.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-1 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {dnfRiders.map((r) => (
              <CategoryPanelRider key={r.id} rider={r} selected={selectedRiderId === r.id} onClick={onRiderClick} />
            ))}
          </div>
        </section>
      )}

      {/* 5. LEGENDA */}
      {legendCats.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3"
          style={{ borderTop: "1px solid rgba(58,42,26,0.15)" }}
          aria-label="Legenda"
        >
          {legendCats.map((c) => {
            const t = categoryTone(c);
            return (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="block w-2.5 h-3.5 rounded-sm"
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
        </div>
      )}
    </div>
  );
}

/** Wrapper: hero-size RiderTile voor TOP-blok en DNF-blok. */
function CategoryPanelRider({
  rider,
  selected,
  onClick,
}: {
  rider: SheetRider;
  selected?: boolean;
  onClick?: (id: string) => void;
}) {
  return <RiderTile rider={rider} size="hero" selected={selected} onClick={onClick} />;
}

/** Tasteful skeleton zonder layout-shift — papier-paneel met grijsfade-tiles. */
function TeamSheetSkeleton() {
  const PILL = (h: number, w: number) => (
    <div
      className="animate-pulse rounded"
      style={{ background: "rgba(58,42,26,0.10)", height: `${h}px`, width: `${w}px` }}
    />
  );
  return (
    <div className="space-y-4">
      {/* Title row skeleton */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
        {PILL(12, 220)}
        <div className="flex-1 h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
      </div>
      {/* Hero panel */}
      <div className="vintage-paper rounded-xl p-4 md:p-5" style={{ border: "1.5px solid var(--ink-sepia)" }}>
        <div className="flex items-center gap-2 mb-4">{PILL(12, 160)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              {PILL(9, 32)}
              {PILL(13, 84)}
              {PILL(40, 56)}
            </div>
          ))}
        </div>
      </div>
      {/* 2 category panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} className="vintage-paper rounded-lg p-3" style={{ border: "1px solid var(--ink-sepia)", borderLeftWidth: 4 }}>
            <div className="mb-3">{PILL(11, 130)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-1 gap-y-3">
              {Array.from({ length: 4 }).map((__, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {PILL(9, 28)}
                  {PILL(12, 72)}
                  {PILL(36, 50)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
