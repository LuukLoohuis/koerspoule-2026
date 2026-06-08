/**
 * RiderTile — twee varianten:
 *  - hero: gestapeld (naam + nummer BOVEN grote cyclist). Voor TOP klassement.
 *  - row : compacte rij (cyclist | naam ……… nummer-chip). Voor category-panels.
 *
 * DNF: figuur grayscale + rood kruis, naam doorgestreept, klein "Uitgevallen".
 * Chip-nummer is gekleurd in de categorie-accentkleur.
 */

import { X } from "lucide-react";
import Cyclist from "./Cyclist";
import { categoryTone, type SheetRider } from "./tokens";

/** Compacte DNF-chip met kruis-icoon. Vervangt het oude italic "Uitgevallen"
 *  tekstje zodat uitgevallen renners visueel duidelijk gemarkeerd zijn.
 */
function DnfBadge({ size = "default" }: { size?: "default" | "small" }) {
  const isSmall = size === "small";
  return (
    <span
      className="inline-flex items-center gap-0.5 font-mono font-black uppercase rounded"
      style={{
        background: "#FFEBEB",
        color: "#C0392B",
        border: "1px solid #E74C3C",
        letterSpacing: "0.1em",
        fontSize: isSmall ? "8.5px" : "9.5px",
        padding: isSmall ? "1px 4px" : "1.5px 5px",
        lineHeight: 1,
      }}
      aria-label="Did not finish"
    >
      <X
        strokeWidth={3.2}
        style={{ width: isSmall ? 8 : 9, height: isSmall ? 8 : 9 }}
        aria-hidden
      />
      DNF
    </span>
  );
}

/** Lichtgrijs zodat naam leesbaar blijft maar duidelijk "uitgevallen" leest. */
const DNF_NAME_COLOR = "#9CA3AF";

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
              color: dnf ? DNF_NAME_COLOR : "var(--ink-sepia)",
              textDecoration: dnf ? "line-through" : undefined,
              textDecorationColor: dnf ? "#C0392B" : undefined,
              textDecorationThickness: dnf ? "1.5px" : undefined,
              lineHeight: 1.15,
            }}
          >
            {rider.name}
          </div>
          {dnf && (
            <div className="mt-1 flex justify-center">
              <DnfBadge />
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
            color: dnf ? DNF_NAME_COLOR : "var(--ink-sepia)",
            textDecoration: dnf ? "line-through" : undefined,
            textDecorationColor: dnf ? "#C0392B" : undefined,
            textDecorationThickness: dnf ? "1.5px" : undefined,
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
        <span className="shrink-0">
          <DnfBadge size="small" />
        </span>
      )}
    </Component>
  );
}
