/**
 * CategoryPanel — papier-paneel met circulair icoon-badge, caps-titel + telling.
 * Rijen i.p.v. grid (zoals reference): cyclist | naam ……… nummer-chip.
 */

import CategoryBadgeIcon from "./icons";
import Cyclist from "./Cyclist";
import RiderTile from "./RiderTile";
import { categoryTone, type RiderCategory, type SheetRider } from "./tokens";

type Props = {
  category: RiderCategory;
  /** Actieve renners (DNF wordt apart als "Uitgevallen … N" rij getoond). */
  riders: SheetRider[];
  /** Aantal uitgevallen renners in deze categorie — toont samenvattingsrij onderaan. */
  dnfCount?: number;
  selectedRiderId?: string | null;
  onRiderClick?: (id: string) => void;
};

export default function CategoryPanel({ category, riders, dnfCount = 0, selectedRiderId, onRiderClick }: Props) {
  if (riders.length === 0 && dnfCount === 0) return null;
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
        {/* DNF-samenvattingsrij — één regel "Uitgevallen ……… N" met grijs
            renner-silhouet (volgens reference, compact en rustig). */}
        {dnfCount > 0 && (
          <div className="w-full flex items-center gap-2 py-1 px-1">
            <Cyclist category={category} faded width={56} height={42} />
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
              <span
                className="italic"
                style={{
                  fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "var(--ink-faded)",
                  lineHeight: 1.2,
                }}
              >
                Uitgevallen
              </span>
              <span
                aria-hidden
                className="flex-1 min-w-[10px] mb-[3px]"
                style={{ borderBottom: "1px dotted rgba(58,42,26,0.35)", height: "1px" }}
              />
            </div>
            <span
              className="shrink-0 font-mono tabular-nums px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(58,42,26,0.08)",
                color: "var(--ink-faded)",
                border: "1px solid rgba(58,42,26,0.25)",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                minWidth: "30px",
                textAlign: "center",
              }}
            >
              {dnfCount}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
