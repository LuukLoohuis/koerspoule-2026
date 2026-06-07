/**
 * CategoryPanel — papier-paneel met categorie-kop en een grid van RiderTiles.
 *
 * Rand-accent in de categorie-kleur, label in gespatieerde caps, telling rechts.
 */

import RiderTile from "./RiderTile";
import { categoryIcon, categoryTone, type RiderCategory, type SheetRider } from "./tokens";

type Props = {
  category: RiderCategory;
  riders: SheetRider[];
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
  /** Hero-grootte (gebruikt door TeamSheet voor de leiders). */
  size?: "default" | "hero";
};

export default function CategoryPanel({
  category,
  riders,
  selectedRiderId,
  onRiderClick,
  size = "default",
}: Props) {
  if (riders.length === 0) return null;
  const tone = categoryTone(category);
  const icon = categoryIcon(category);

  return (
    <section
      className="vintage-paper rounded-lg p-3 md:p-4 relative"
      style={{
        border: `1px solid ${tone.ink}`,
        borderLeftWidth: 4,
        boxShadow: "0 1px 0 rgba(58,42,26,0.10)",
      }}
      aria-labelledby={`cat-${category}`}
    >
      {/* Kop */}
      <header className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px dashed ${tone.ink}` }}>
        <span aria-hidden className="text-base leading-none shrink-0">{icon}</span>
        <h3
          id={`cat-${category}`}
          className="vintage-stamp shrink-0"
          style={{
            color: tone.ink,
            fontSize: size === "hero" ? "12px" : "11px",
            letterSpacing: "0.26em",
          }}
        >
          {tone.label}
        </h3>
        <div className="flex-1" />
        <span
          className="font-mono tabular-nums shrink-0"
          style={{ color: "var(--ink-faded)", fontSize: "10px" }}
        >
          {riders.length}
        </span>
      </header>

      {/* Grid van renners — responsive */}
      <div
        className={
          size === "hero"
            ? "grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3"
            : "grid grid-cols-2 gap-x-1 gap-y-3 sm:grid-cols-3 md:grid-cols-4"
        }
      >
        {riders.map((r) => (
          <RiderTile
            key={r.id}
            rider={r}
            size={size}
            selected={selectedRiderId === r.id}
            onClick={onRiderClick}
          />
        ))}
      </div>
    </section>
  );
}
