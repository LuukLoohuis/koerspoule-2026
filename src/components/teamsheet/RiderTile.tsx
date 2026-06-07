/**
 * RiderTile — twee varianten:
 *  - hero: gestapeld (naam + nummer BOVEN grote cyclist). Voor TOP klassement.
 *  - row : compacte rij (cyclist | naam ……… nummer-chip). Voor category-panels.
 *
 * DNF: figuur grayscale + rood kruis, naam doorgestreept, klein "Uitgevallen".
 * Chip-nummer is gekleurd in de categorie-accentkleur.
 */

import Cyclist from "./Cyclist";
import { categoryTone, type SheetRider } from "./tokens";

type Props = {
  rider: SheetRider;
  size?: "default" | "hero";
  selected?: boolean;
  onClick?: (id: string) => void;
};

export default function RiderTile({ rider, size = "default", selected = false, onClick }: Props) {
  const isHero = size === "hero";
  const dnf = rider.status === "DNF";
  const numStr = rider.startNumber != null ? String(rider.startNumber) : "—";
  const tone = categoryTone(rider.category);
  const handleClick = onClick ? () => onClick(rider.id) : undefined;
  const Component: "button" | "div" = onClick ? "button" : "div";

  if (isHero) {
    return (
      <Component
        {...(onClick ? { type: "button" as const, onClick: handleClick } : {})}
        className="group flex flex-col items-center text-center min-w-0 px-1.5 py-2 rounded-lg transition-colors"
        style={{
          background: selected ? "rgba(58,42,26,0.06)" : "transparent",
          cursor: onClick ? "pointer" : "default",
        }}
        title={`#${numStr} · ${rider.name}`}
      >
        {/* Labels boven het figuurtje */}
        <div className="mb-1.5 min-w-0 w-full">
          <div
            className="font-mono tabular-nums leading-none mb-0.5"
            style={{ color: "#9A8A74", fontSize: "10px", letterSpacing: "0.18em" }}
          >
            #{numStr}
          </div>
          <div
            className="truncate"
            style={{
              fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
              fontWeight: 700,
              fontSize: "13.5px",
              color: dnf ? "rgba(58,42,26,0.42)" : "var(--ink-sepia)",
              textDecoration: dnf ? "line-through" : undefined,
              lineHeight: 1.15,
            }}
          >
            {rider.name}
          </div>
          {dnf && (
            <div
              className="italic mt-0.5"
              style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "9px", color: "var(--vintage-red)" }}
            >
              Uitgevallen
            </div>
          )}
        </div>

        <Cyclist category={rider.category} faded={dnf} width={108} height={82} />
      </Component>
    );
  }

  // ROW variant — voor category-panels: [cyclist] [naam ……] [chip]
  return (
    <Component
      {...(onClick ? { type: "button" as const, onClick: handleClick } : {})}
      className="group w-full flex items-center gap-2 py-1 px-1 rounded-md transition-colors"
      style={{
        background: selected ? "rgba(58,42,26,0.07)" : "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
      title={`#${numStr} · ${rider.name}`}
    >
      <Cyclist category={rider.category} faded={dnf} width={56} height={42} />
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span
          className="truncate"
          style={{
            fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
            fontWeight: 600,
            fontSize: "13px",
            color: dnf ? "rgba(58,42,26,0.45)" : "var(--ink-sepia)",
            textDecoration: dnf ? "line-through" : undefined,
            lineHeight: 1.2,
          }}
        >
          {rider.name}
        </span>
        {/* Dotted leader — vintage uitslag-vibe */}
        <span
          aria-hidden
          className="flex-1 min-w-[10px] mb-[3px]"
          style={{
            borderBottom: "1px dotted rgba(58,42,26,0.35)",
            height: "1px",
          }}
        />
      </div>
      {/* Chip-nummer */}
      <span
        className="shrink-0 font-mono tabular-nums px-2 py-0.5 rounded-full"
        style={{
          background: dnf ? "rgba(58,42,26,0.08)" : tone.tint,
          color: dnf ? "var(--ink-faded)" : tone.ink,
          border: `1px solid ${dnf ? "rgba(58,42,26,0.18)" : tone.jersey}`,
          fontSize: "10.5px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          minWidth: "30px",
          textAlign: "center",
        }}
      >
        #{numStr}
      </span>
      {dnf && (
        <span
          className="shrink-0 italic"
          style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "9px", color: "var(--vintage-red)" }}
        >
          Uitgevallen
        </span>
      )}
    </Component>
  );
}
