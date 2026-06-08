/**
 * CategoryPanel — papier-paneel met circulair icoon-badge, caps-titel + telling.
 * Rijen i.p.v. grid (zoals reference): cyclist | naam ……… nummer-chip.
 */

import CategoryBadgeIcon from "./icons";
import RiderTile from "./RiderTile";
import RiderStageBreakdown from "./RiderStageBreakdown";
import { categoryTone, type RiderCategory, type SheetRider } from "./tokens";

type Props = {
  category: RiderCategory;
  /** Alle renners van deze categorie. DNF wordt door RiderTile zelf doorgestreept
   *  en met rood kruis getoond — geen aparte samenvattingsrij. */
  riders: SheetRider[];
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
  /** Renner met open punten-dropdown (toggle). */
  expandedRiderId?: string | null;
  onToggleRider?: (id: string) => void;
  gameId?: string;
  entryId?: string | null;
  riderTotals?: Map<string, number>;
};

export default function CategoryPanel({
  category,
  riders,
  selectedRiderId,
  onRiderClick,
  expandedRiderId,
  onToggleRider,
  gameId,
  entryId,
  riderTotals,
}: Props) {
  if (riders.length === 0) return null;
  const tone = categoryTone(category);

  // Sorteer: actieve renners eerst, DNF onderaan met vintage divider ertussen.
  const activeRiders = riders.filter((r) => r.status !== "DNF");
  const dnfRiders = riders.filter((r) => r.status === "DNF");

  // Eén renner-rij + (indien open) de inline punten-dropdown eronder.
  const renderRider = (r: SheetRider) => {
    const isOpen = expandedRiderId === r.id;
    const panelId = `rider-breakdown-${r.id}`;
    return (
      <div key={r.id}>
        <RiderTile
          rider={r}
          size="default"
          selected={selectedRiderId === r.id || isOpen}
          onClick={onToggleRider ?? onRiderClick}
          ariaExpanded={onToggleRider ? isOpen : undefined}
          ariaControls={onToggleRider ? panelId : undefined}
          totalPoints={riderTotals?.get(r.id)}
        />
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
    <section
      className="vintage-paper rounded-xl relative"
      style={{
        border: "1px solid rgba(58,42,26,0.18)",
        borderLeftWidth: 6,
        borderLeftColor: tone.jersey,
        boxShadow: "0 2px 0 rgba(58,42,26,0.10), 0 4px 14px -8px rgba(58,42,26,0.25)",
      }}
      aria-labelledby={`cat-${category}`}
    >
      {/* Kop */}
      <header className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5 relative">
        <div
          className="shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            background: tone.tint,
            boxShadow: `0 0 0 1px ${tone.jersey}33, 0 2px 6px -2px ${tone.jersey}55`,
          }}
        >
          <CategoryBadgeIcon category={category} size={32} />
        </div>
        <h3
          id={`cat-${category}`}
          className="shrink-0"
          style={{
            color: tone.ink,
            fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {tone.label}
        </h3>
        <div className="flex-1" />
        <span
          className="font-mono tabular-nums shrink-0 px-2 py-0.5 rounded-full"
          style={{
            background: tone.tint,
            color: tone.ink,
            border: `1px solid ${tone.jersey}`,
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          {riders.length}
        </span>
        {/* Subtiel gradient-onderlijntje in jersey-kleur */}
        <div
          aria-hidden
          className="absolute left-3.5 right-3.5 bottom-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${tone.jersey}, ${tone.jersey}22 60%, transparent)`,
          }}
        />
      </header>

      {/* Rij-lijst (compact, scanbaar) — actief eerst, DNF onder divider */}
      <div className="px-2 pb-2.5 pt-1">
        {activeRiders.map(renderRider)}

        {activeRiders.length > 0 && dnfRiders.length > 0 && (
          <div
            className="flex items-center gap-2 px-1 pt-2 pb-1 select-none"
            aria-hidden
          >
            <div
              className="flex-1 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(192,57,43,0.35), transparent)",
              }}
            />
            <span
              className="font-mono uppercase shrink-0"
              style={{
                color: "#C0392B",
                fontSize: "9px",
                letterSpacing: "0.22em",
                fontWeight: 700,
              }}
            >
              ✦ Uitgevallen ({dnfRiders.length}) ✦
            </span>
            <div
              className="flex-1 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(192,57,43,0.35), transparent)",
              }}
            />
          </div>
        )}

        {dnfRiders.map(renderRider)}
      </div>
    </section>
  );
}
