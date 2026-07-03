/**
 * CategoryPanel — programmasectie in het vintage wedstrijdprogramma.
 * Sectiekop (shirt-badge + caps-titel + categoriesom, onderrand in jersey-kleur),
 * daaronder klikbare rennerregels met stippellijn-leaders naar de punten.
 * Klik op een regel klapt de bestaande RiderStageBreakdown open.
 */

import { ChevronDown } from "lucide-react";
import CategoryBadgeIcon from "./icons";
import RiderStageBreakdown from "./RiderStageBreakdown";
import { categoryTone, type RiderCategory, type SheetRider } from "./tokens";

type Props = {
  category: RiderCategory;
  /** Volledige bloktitel (teambuilder-naam). Valt terug op het korte tone-label. */
  title?: string;
  /** Alle renners van deze categorie; DNF onderaan (gesorteerd door TeamSheet). */
  riders: SheetRider[];
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
  /** Renner met open punten-dropdown (toggle). */
  expandedRiderId?: string | null;
  onToggleRider?: (id: string) => void;
  gameId?: string;
  entryId?: string | null;
  riderTotals?: Map<string, number>;
  riderTotalsReady?: boolean;
  /** Top-3 van het hele team (rider_id → 1|2|3) — gouden/zilveren/bronzen stip. */
  medalIds?: Map<string, 1 | 2 | 3>;
};

const MEDAL_BG: Record<1 | 2 | 3, string> = {
  1: "hsl(var(--vintage-gold))",
  2: "hsl(0 0% 78%)",
  3: "hsl(24 45% 55%)",
};

export function MedalDot({ rank }: { rank: 1 | 2 | 3 }) {
  return (
    <span
      aria-label={`teambreed nr. ${rank}`}
      className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold tabular-nums"
      style={{ background: MEDAL_BG[rank], border: "1px solid var(--ink-sepia)", color: "var(--ink-sepia)" }}
    >
      {rank}
    </span>
  );
}

export default function CategoryPanel({
  category,
  title,
  riders,
  onRiderClick,
  expandedRiderId,
  onToggleRider,
  gameId,
  entryId,
  riderTotals,
  riderTotalsReady,
  medalIds,
}: Props) {
  if (riders.length === 0) return null;
  const tone = categoryTone(category);
  const heading = title ?? tone.label;
  const headingId = `cat-${heading.toLowerCase().replace(/\W+/g, "-")}`;

  const activeRiders = riders.filter((r) => r.status !== "DNF");
  const dnfRiders = riders.filter((r) => r.status === "DNF");

  const totalFor = (id: string) => (riderTotalsReady ? riderTotals?.get(id) ?? 0 : undefined);
  const sectionTotal = riderTotalsReady
    ? riders.reduce((sum, r) => sum + (riderTotals?.get(r.id) ?? 0), 0)
    : undefined;

  const handleClick = onToggleRider ?? onRiderClick;

  const renderRider = (r: SheetRider) => {
    const isOpen = expandedRiderId === r.id;
    const panelId = `rider-breakdown-${r.id}`;
    const pts = totalFor(r.id);
    const dnf = r.status === "DNF";
    const nietGestart = r.status === "NIET_GESTART";
    const medal = medalIds?.get(r.id);
    return (
      <div key={r.id}>
        <button
          type="button"
          onClick={handleClick ? () => handleClick(r.id) : undefined}
          aria-expanded={onToggleRider ? isOpen : undefined}
          aria-controls={onToggleRider ? panelId : undefined}
          className="w-full flex items-baseline gap-1 py-[3px] px-0.5 rounded-sm text-left hover:bg-[rgba(58,42,26,0.05)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-sepia)] transition-colors motion-reduce:transition-none"
          style={{ fontSize: "12.5px", color: "var(--ink-sepia)" }}
          title={r.name}
        >
          <span
            className="whitespace-nowrap"
            style={{
              fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
              fontWeight: dnf || nietGestart ? 500 : 600,
              opacity: dnf || nietGestart ? 0.6 : 1,
              textDecoration: dnf || nietGestart ? "line-through" : undefined,
              textDecorationColor: dnf ? "#C0392B" : "hsl(var(--vintage-gold))",
            }}
          >
            {r.name}
          </span>
          {/* Stippellijn-leader naar de punten */}
          <span
            aria-hidden
            className="flex-1 min-w-[8px]"
            style={{ borderBottom: "1px dotted rgba(58,42,26,0.55)", transform: "translateY(-3px)" }}
          />
          {medal && <MedalDot rank={medal} />}
          {dnf && (
            <span aria-label="uitgevallen" className="shrink-0 text-[10px]" style={{ color: "#C0392B" }}>
              ☠
            </span>
          )}
          <span className="shrink-0 tabular-nums font-bold">{pts === undefined ? "–" : pts}</span>
          <ChevronDown
            aria-hidden
            className="shrink-0 transition-transform duration-200 motion-reduce:transition-none"
            size={11}
            strokeWidth={2.4}
            style={{ opacity: 0.6, transform: isOpen ? "rotate(180deg)" : undefined }}
          />
        </button>
        {onToggleRider && (
          <RiderStageBreakdown
            open={isOpen}
            riderId={r.id}
            riderName={r.name}
            category={category}
            gameId={gameId}
            entryId={entryId}
            panelId={panelId}
          />
        )}
      </div>
    );
  };

  return (
    <section aria-labelledby={headingId} style={{ breakInside: "avoid" }} className="mb-4">
      {/* Sectiekop */}
      <header
        className="flex items-center gap-1.5 pb-1 mb-1"
        style={{ borderBottom: `1.5px solid ${tone.jersey}` }}
      >
        <CategoryBadgeIcon category={category} size={16} />
        <h3
          id={headingId}
          className="flex-1 min-w-0 truncate"
          title={heading}
          style={{
            fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
            fontWeight: 700,
            fontSize: "11.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: tone.ink,
          }}
        >
          {heading}
        </h3>
        <span className="shrink-0 tabular-nums" style={{ fontSize: "11px", fontWeight: 700, color: tone.ink }}>
          {sectionTotal === undefined ? "–" : `${sectionTotal} pt`}
        </span>
      </header>

      {activeRiders.map(renderRider)}

      {activeRiders.length > 0 && dnfRiders.length > 0 && (
        <div className="flex items-center gap-2 px-1 pt-1.5 pb-0.5 select-none" aria-hidden>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(192,57,43,0.35), transparent)" }} />
          <span className="font-mono uppercase shrink-0" style={{ color: "#C0392B", fontSize: "9px", letterSpacing: "0.22em", fontWeight: 700 }}>
            ✦ Uitgevallen ({dnfRiders.length}) ✦
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(192,57,43,0.35), transparent)" }} />
        </div>
      )}

      {dnfRiders.map(renderRider)}
    </section>
  );
}
