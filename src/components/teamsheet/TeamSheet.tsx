/**
 * <TeamSheet> — Mijn Ploeg als vintage wedstrijdprogramma.
 *
 * Compositie (één parchment-vel):
 *   1. Masthead — dubbele inktlijnen, "MIJN PLOEG", cursieve uitleg, statsregel.
 *   2. Gouden leidersstrip — "Jacht op geel" (Alien + GC1-4) met klikbare
 *      tegels (naam + punten + aandeelbalkje) en de per-etappe-breakdown.
 *   3. Programmasecties — alle overige teambuilder-categorieën in CSS
 *      multi-columns met stippellijn-leaders (CategoryPanel).
 *   4. Colofon — "Gedrukt in de Ploegleiderswagen" + optioneel de gamenaam.
 *
 * Subtiele achtergrond line-art (wielen, bergsilhouet) staat achter de inhoud.
 */

import { useMemo } from "react";
import { Crown, ChevronDown } from "lucide-react";
import CategoryPanel, { MedalDot } from "./CategoryPanel";
import RiderStageBreakdown from "./RiderStageBreakdown";
import {
  type RiderCategory,
  type SheetRider,
} from "./tokens";

// De gele hero-strip groepeert Alien + GC1-4 (door MyTeamPanel gemerkt met deze key).
const HERO_KEY = "JACHT_OP_GEEL";

type SheetGroup = { key: string; title: string; category: RiderCategory; order: number; riders: SheetRider[] };

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
  /** Voor het colofon rechtsonder ("Tour de France 2026"). */
  gameName?: string;
};

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
  onRiderClick,
  expandedRiderId,
  onToggleRider,
  gameId,
  entryId,
  riderTotals,
  riderTotalsReady,
  gameName,
}: Props) {
  const { groups, total } = useMemo(() => {
    // Groepeer op de échte teambuilder-categorie (catKey), niet op de grove
    // tone-categorie. Binnen elk blok: actieve eerst, DNF onderaan.
    const map = new Map<string, SheetGroup>();
    for (const r of riders) {
      let g = map.get(r.catKey);
      if (!g) {
        g = { key: r.catKey, title: r.catTitle, category: r.category, order: r.catOrder, riders: [] };
        map.set(r.catKey, g);
      }
      g.riders.push(r);
    }
    for (const g of map.values()) {
      g.riders.sort((a, b) => (a.status === "DNF" ? 1 : 0) - (b.status === "DNF" ? 1 : 0));
    }
    const ordered = [...map.values()].sort((a, b) => a.order - b.order);
    return { groups: ordered, total: riders.length };
  }, [riders]);

  // Teambreed: totaal + top-3 medailles (alleen zodra er echt punten zijn).
  const teamTotal = riderTotalsReady
    ? riders.reduce((sum, r) => sum + (riderTotals?.get(r.id) ?? 0), 0)
    : undefined;
  const dnfCount = riders.filter((r) => r.status === "DNF").length;
  const medalIds = useMemo(() => {
    const m = new Map<string, 1 | 2 | 3>();
    if (!riderTotalsReady) return m;
    const scored = riders
      .map((r) => ({ id: r.id, pts: riderTotals?.get(r.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts);
    if ((scored[0]?.pts ?? 0) <= 0) return m; // alles 0 → geen medailles
    scored.slice(0, 3).forEach((s, i) => {
      if (s.pts > 0) m.set(s.id, (i + 1) as 1 | 2 | 3);
    });
    return m;
  }, [riders, riderTotals, riderTotalsReady]);

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

  const heroGroup = groups.find((g) => g.key === HERO_KEY) ?? null;
  const otherGroups = groups.filter((g) => g.key !== HERO_KEY);
  const heroRiders: SheetRider[] = heroGroup?.riders ?? [];
  const expandedHeroRider = heroRiders.find((r) => r.id === expandedRiderId) ?? null;
  const heroTotal = riderTotalsReady
    ? heroRiders.reduce((sum, r) => sum + (riderTotals?.get(r.id) ?? 0), 0)
    : undefined;

  const inkLine = (
    <div className="flex-1">
      <div className="h-[2px]" style={{ background: "var(--ink-sepia)" }} />
      <div className="h-[1px] mt-0.5" style={{ background: "var(--ink-sepia)", opacity: 0.5 }} />
    </div>
  );

  return (
    <div className="relative space-y-4">
      {/* ── Subtiele achtergrond line-art (achter alles, low contrast) ── */}
      <BackgroundDecor />

      {/* 1. Masthead */}
      <header className="relative text-center px-1">
        <div className="flex items-center gap-3">{inkLine}<span aria-hidden className="text-[10px]" style={{ color: "var(--ink-sepia)" }}>✦</span>{inkLine}</div>
        <h2
          className="mt-2"
          style={{
            fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
            color: "var(--ink-sepia)",
            fontSize: "20.5px",
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            fontWeight: 700,
            lineHeight: 1.1,
            paddingLeft: "0.42em", // compenseer letterspacing voor optisch centreren
          }}
        >
          Mijn Ploeg
        </h2>
        <p
          className="mt-0.5 italic"
          style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "12.5px", color: "var(--ink-faded)" }}
        >
          Klik op een renner voor zijn resultaten per etappe
        </p>
        <p
          className="mt-1 font-mono uppercase tabular-nums"
          style={{ fontSize: "11px", letterSpacing: "0.12em", color: "var(--ink-sepia)" }}
        >
          {total} renners <span aria-hidden style={{ color: "hsl(var(--vintage-gold))" }}>◆</span>{" "}
          {teamTotal === undefined ? "–" : teamTotal} pt <span aria-hidden style={{ color: "hsl(var(--vintage-gold))" }}>◆</span>{" "}
          {dnfCount} uitvallers
        </p>
        <div className="flex items-center gap-3 mt-2">{inkLine}<span aria-hidden className="text-[10px]" style={{ color: "var(--ink-sepia)" }}>✦</span>{inkLine}</div>
      </header>

      {/* 2. Gouden leidersstrip — één variant voor alle breekpunten */}
      {heroRiders.length > 0 && (
        <section
          aria-label="Jacht op geel"
          className="relative rounded-lg overflow-hidden"
          style={{ background: "var(--vintage-yellow)", border: "1.5px solid var(--ink-sepia)" }}
        >
          <div className="px-3 pt-2.5 pb-3 sm:px-4">
            {/* Koprij */}
            <div className="flex items-center gap-2">
              <Crown size={18} strokeWidth={2.4} style={{ color: "var(--ink-sepia)" }} aria-hidden />
              <h3
                className="flex-1 min-w-0 truncate"
                style={{
                  fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                  fontWeight: 800,
                  fontSize: "14px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-sepia)",
                }}
              >
                Jacht op geel
              </h3>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 tabular-nums"
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--ink-sepia)",
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid var(--ink-sepia)",
                }}
              >
                {heroTotal === undefined ? "–" : `${heroTotal} pt`}
              </span>
            </div>

            {/* Renner-tegels */}
            <div
              className="mt-2 grid gap-1"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}
            >
              {heroRiders.map((r) => {
                const isOpen = expandedRiderId === r.id;
                const pts = resolveTotal(riderTotalsReady, riderTotals, r.id);
                const share = heroTotal && heroTotal > 0 ? ((pts ?? 0) / heroTotal) * 100 : 0;
                const medal = medalIds.get(r.id);
                const faded = r.status === "DNF" || r.status === "NIET_GESTART";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => (onToggleRider ?? onRiderClick)?.(r.id)}
                    aria-expanded={onToggleRider ? isOpen : undefined}
                    aria-controls={onToggleRider ? `rider-breakdown-${r.id}` : undefined}
                    className="rounded-md px-1.5 py-1.5 text-left transition-colors motion-reduce:transition-none hover:bg-[rgba(255,255,255,0.35)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-sepia)]"
                    style={{ background: isOpen ? "rgba(255,255,255,0.45)" : undefined }}
                    title={r.name}
                  >
                    <span
                      className="block truncate"
                      style={{
                        fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--ink-sepia)",
                        opacity: faded ? 0.6 : 1,
                        textDecoration: faded ? "line-through" : undefined,
                      }}
                    >
                      {r.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {medal && <MedalDot rank={medal} />}
                      <span className="tabular-nums" style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink-sepia)" }}>
                        {pts === undefined ? "–" : pts}
                      </span>
                      <ChevronDown
                        aria-hidden
                        size={12}
                        strokeWidth={2.4}
                        className="transition-transform duration-200 motion-reduce:transition-none"
                        style={{ color: "var(--ink-sepia)", opacity: 0.65, transform: isOpen ? "rotate(180deg)" : undefined }}
                      />
                    </span>
                    {/* Aandeelbalkje: dit deel van de hero-punten */}
                    <span aria-hidden className="mt-1 block h-[3px] rounded-full" style={{ background: "rgba(58,42,26,0.18)" }}>
                      <span className="block h-full rounded-full" style={{ width: `${share}%`, background: "var(--ink-sepia)" }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {onToggleRider && expandedHeroRider && (
            <div className="px-3 pb-3 sm:px-4">
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
      )}

      {/* 3. Programmasecties — CSS multi-columns (mobiel 1, desktop max 3) */}
      {otherGroups.length > 0 && (
        <div
          className="relative"
          style={{ columns: "220px 3", columnGap: "22px", columnRule: "1px dashed rgba(58,42,26,0.25)" }}
        >
          {otherGroups.map((g) => (
            <CategoryPanel
              key={g.key}
              category={g.category}
              title={g.title}
              riders={g.riders}
              onRiderClick={onRiderClick}
              expandedRiderId={expandedRiderId ?? null}
              onToggleRider={onToggleRider}
              gameId={gameId}
              entryId={entryId}
              riderTotals={riderTotals}
              riderTotalsReady={riderTotalsReady}
              medalIds={medalIds}
            />
          ))}
        </div>
      )}

      {/* 4. Colofon */}
      <footer
        className="flex items-center justify-between gap-2 pt-1.5"
        style={{ borderTop: "1px solid rgba(58,42,26,0.35)" }}
      >
        <span className="italic" style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "11px", color: "var(--ink-faded)" }}>
          Gedrukt in de Ploegleiderswagen
        </span>
        {gameName && (
          <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--ink-faded)" }}>
            {gameName}
          </span>
        )}
      </footer>
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
  const PILL = (h: number, w: number | string) => (
    <div
      className="animate-pulse rounded"
      style={{ background: "rgba(58,42,26,0.10)", height: `${h}px`, width: typeof w === "number" ? `${w}px` : w }}
    />
  );
  return (
    <div className="space-y-4">
      {/* Masthead */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-full h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
        {PILL(18, 200)}
        {PILL(11, 260)}
        {PILL(10, 220)}
        <div className="w-full h-px" style={{ background: "var(--ink-sepia)", opacity: 0.3 }} />
      </div>
      {/* Leidersstrip */}
      <div className="rounded-lg p-3" style={{ background: "var(--vintage-yellow)", border: "1.5px solid var(--ink-sepia)", opacity: 0.6 }}>
        <div className="flex items-center gap-2 mb-2">
          {PILL(16, 16)}
          {PILL(13, 120)}
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 p-1.5">
              {PILL(11, "80%")}
              {PILL(15, 40)}
              {PILL(3, "100%")}
            </div>
          ))}
        </div>
      </div>
      {/* Drie kolommen met regel-pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, p) => (
          <div key={p} className="space-y-1.5">
            {PILL(13, 130)}
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} className="flex items-center gap-2">
                {PILL(11, 90)}
                <div className="flex-1" />
                {PILL(11, 28)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
