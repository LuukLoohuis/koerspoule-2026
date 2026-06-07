/**
 * CategoryPanel — papier-paneel met circulair icoon-badge, caps-titel + telling.
 * Rijen i.p.v. grid (zoals reference): cyclist | naam ……… nummer-chip.
 */

import CategoryBadgeIcon from "./icons";
import RiderTile from "./RiderTile";
import { categoryTone, type RiderCategory, type SheetRider } from "./tokens";

type Props = {
  category: RiderCategory;
  riders: SheetRider[];
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
};

export default function CategoryPanel({ category, riders, selectedRiderId, onRiderClick }: Props) {
  if (riders.length === 0) return null;
  const tone = categoryTone(category);

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
      <header className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <CategoryBadgeIcon category={category} size={32} />
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
            fontWeight: 700,
          }}
        >
          {riders.length}
        </span>
      </header>

      {/* Rij-lijst (compact, scanbaar) */}
      <div className="px-2 pb-2.5">
        {riders.map((r) => (
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
  );
}
