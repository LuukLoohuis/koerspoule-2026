/**
 * RiderTile — naam + startnummer + Cyclist.
 *
 * Eenheid voor zowel het hero-blok als de category-panels. DNF: figuur grijs +
 * kruis, naam doorgestreept, klein "Uitgevallen"-label.
 */

import Cyclist from "./Cyclist";
import type { SheetRider } from "./tokens";

type Props = {
  rider: SheetRider;
  /** Iets grotere figuur voor de hero (leiders). */
  size?: "default" | "hero";
  /** Geselecteerd → subtiele highlight. */
  selected?: boolean;
  onClick?: (id: string) => void;
};

export default function RiderTile({ rider, size = "default", selected = false, onClick }: Props) {
  const isHero = size === "hero";
  const dnf = rider.status === "DNF";
  const w = isHero ? 76 : 54;
  const h = isHero ? 58 : 42;
  const numStr = rider.startNumber != null ? String(rider.startNumber) : "—";

  const handleClick = onClick ? () => onClick(rider.id) : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onClick}
      className="group flex flex-col items-center text-center min-w-0 px-1 py-1.5 rounded-md transition-colors"
      style={{
        background: selected ? "rgba(58,42,26,0.06)" : "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
      title={`#${numStr} · ${rider.name}`}
    >
      {/* Label-blok boven het figuurtje */}
      <div className="mb-1 min-w-0 w-full">
        <div
          className="font-mono tabular-nums leading-none mb-0.5"
          style={{
            color: "#9A8A74",
            fontSize: isHero ? "10px" : "9.5px",
            letterSpacing: "0.18em",
          }}
        >
          #{numStr}
        </div>
        <div
          className="truncate"
          style={{
            fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
            fontWeight: 600,
            fontSize: isHero ? "13px" : "11.5px",
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
            style={{
              fontFamily: "'Source Serif 4',Georgia,serif",
              fontSize: "9px",
              color: "var(--vintage-red)",
            }}
          >
            Uitgevallen
          </div>
        )}
      </div>

      <Cyclist category={rider.category} faded={dnf} width={w} height={h} />
    </button>
  );
}
