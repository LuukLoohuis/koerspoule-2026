/**
 * RiderTile — twee varianten:
 *  - hero: gestapeld (naam + nummer BOVEN grote cyclist). Voor TOP klassement.
 *  - row : compacte rij (cyclist | naam ……… nummer-chip). Voor category-panels.
 *
 * DNF: figuur grayscale + rood kruis, naam doorgestreept, klein "Uitgevallen".
 * Chip-nummer is gekleurd in de categorie-accentkleur.
 */

import { ChevronDown, X } from "lucide-react";
import Cyclist from "./Cyclist";
import { categoryTone, type RiderCategory, type SheetRider } from "./tokens";

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

/** Volle ink-sepia met opacity — naam blijft scherp leesbaar, strikethrough in
 *  rood + DNF-chip doen het werk als "uitgevallen"-marker. */
const DNF_NAME_COLOR = "var(--ink-sepia)";
const DNF_NAME_OPACITY = 0.78;

/** Pill met totaal behaalde punten (vervangt het startnummer). */
function PointsChip({
  value,
  tint,
  ink,
  jersey,
}: {
  value?: number | null;
  tint: string;
  ink: string;
  jersey: string;
}) {
  const known = typeof value === "number";
  return (
    <span
      className="shrink-0 font-mono tabular-nums px-2 py-0.5 rounded-full inline-flex items-baseline gap-0.5"
      style={{
        background: tint,
        color: ink,
        border: `1px solid ${jersey}`,
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.02em",
        minWidth: "34px",
        justifyContent: "center",
      }}
      title="Totaal behaalde punten t/m laatst gefiatteerde etappe"
    >
      {known ? value : "–"}
      <span style={{ fontSize: "8px", fontWeight: 700, opacity: 0.7 }}>pt</span>
    </span>
  );
}

type Props = {
  rider: SheetRider;
  size?: "default" | "hero";
  selected?: boolean;
  onClick?: (id: string) => void;
  /** Override de category-jersey die Cyclist tekent (bv. in de GC-hero:
   *  index 0 = "GC" (gele trui), overige = "KLIM" (bolletjes). De
   *  chip-kleur + rest van de tile-styling blijft op rider.category. */
  cyclistOverride?: RiderCategory;
  /** A11y: koppel de tile-knop aan een uitklap-paneel (dropdown). */
  ariaExpanded?: boolean;
  ariaControls?: string;
  /** Totaal behaalde punten van deze renner t/m laatst gefiatteerde etappe.
   *  undefined = nog onbekend (laadt) → toont "–". Vervangt het startnummer. */
  totalPoints?: number | null;
};

export default function RiderTile({
  rider,
  size = "default",
  selected = false,
  onClick,
  cyclistOverride,
  ariaExpanded,
  ariaControls,
  totalPoints,
}: Props) {
  const cyclistCategory = cyclistOverride ?? rider.category;
  const isHero = size === "hero";
  const dnf = rider.status === "DNF";
  const tone = categoryTone(rider.category);
  const handleClick = onClick ? () => onClick(rider.id) : undefined;
  const Component: "button" | "div" = onClick ? "button" : "div";

  if (isHero) {
    return (
      <Component
        {...(onClick
          ? {
              type: "button" as const,
              onClick: handleClick,
              ...(ariaExpanded !== undefined ? { "aria-expanded": ariaExpanded } : {}),
              ...(ariaControls ? { "aria-controls": ariaControls } : {}),
            }
          : {})}
        className="group flex flex-col items-center text-center min-w-0 px-1.5 py-2 rounded-lg transition-colors"
        style={{
          background: selected ? "rgba(58,42,26,0.10)" : "transparent",
          cursor: onClick ? "pointer" : "default",
        }}
        title={rider.name}
      >
        {/* Naam + totaal-punten boven het figuurtje (startnummer verwijderd) */}
        <div className="mb-1.5 min-w-0 w-full">
          <div
            className="break-words"
            style={{
              fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
              fontWeight: 700,
              fontSize: "13.5px",
              color: DNF_NAME_COLOR,
              opacity: dnf ? DNF_NAME_OPACITY : 1,
              textDecoration: dnf ? "line-through" : undefined,
              textDecorationColor: dnf ? "#C0392B" : undefined,
              textDecorationThickness: dnf ? "1.5px" : undefined,
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={rider.name}
          >
            {rider.name}
          </div>
          <div className="mt-1 flex justify-center">
            <PointsChip value={totalPoints} tint={tone.tint} ink={tone.ink} jersey={tone.jersey} />
          </div>
          {dnf && (
            <div className="mt-1 flex justify-center">
              <DnfBadge />
            </div>
          )}
        </div>

        <Cyclist category={cyclistCategory} faded={dnf} width={108} height={82} />

        {/* Chevron-affordance: signaleert dat de hero-renner uitklapbaar is */}
        {ariaExpanded !== undefined && (
          <ChevronDown
            aria-hidden
            size={16}
            strokeWidth={2.4}
            className="mt-1 transition-transform duration-200"
            style={{
              color: "var(--ink-sepia)",
              opacity: ariaExpanded ? 0.9 : 0.5,
              transform: ariaExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        )}
      </Component>
    );
  }

  // ROW variant — voor category-panels: [cyclist] [naam ……] [chip OF DNF-badge]
  return (
    <Component
      {...(onClick
        ? {
            type: "button" as const,
            onClick: handleClick,
            ...(ariaExpanded !== undefined ? { "aria-expanded": ariaExpanded } : {}),
            ...(ariaControls ? { "aria-controls": ariaControls } : {}),
          }
        : {})}
      className="group w-full flex items-center gap-2 py-1 px-1 rounded-md transition-all duration-200"
      style={{
        background: selected ? "rgba(58,42,26,0.07)" : "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (selected) return;
        e.currentTarget.style.background = dnf ? "rgba(58,42,26,0.04)" : tone.tint;
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        if (selected) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.transform = "translateX(0)";
      }}
      title={rider.name}
    >
      <Cyclist category={cyclistCategory} faded={dnf} width={52} height={40} />
      <div className="flex-1 min-w-0">
        {/* Volledige naam — mag wrappen naar 2 regels zodat 'ie altijd
            zichtbaar is (geen afkapping). */}
        <span
          className="break-words"
          style={{
            fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
            fontWeight: 600,
            fontSize: "13px",
            color: DNF_NAME_COLOR,
            opacity: dnf ? DNF_NAME_OPACITY : 1,
            textDecoration: dnf ? "line-through" : undefined,
            textDecorationColor: dnf ? "#C0392B" : undefined,
            textDecorationThickness: dnf ? "1.5px" : undefined,
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={rider.name}
        >
          {rider.name}
        </span>
      </div>
      {/* Rechts: totaal behaalde punten (startnummer verwijderd). DNF-renners
          tonen daarnaast nog de DNF-badge. */}
      {dnf && <DnfBadge size="small" />}
      <PointsChip value={totalPoints} tint={tone.tint} ink={tone.ink} jersey={tone.jersey} />
      {/* Chevron-affordance: alleen tonen wanneer de tile een uitklap-dropdown
          aanstuurt (ariaExpanded gedefinieerd). Roteert bij openen, en is
          subtiel zichtbaar in rust + duidelijker on hover/open zodat de
          gebruiker ziet dat de rij uitklapbaar is. */}
      {ariaExpanded !== undefined && (
        <ChevronDown
          aria-hidden
          size={15}
          strokeWidth={2.4}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: tone.jersey,
            opacity: ariaExpanded ? 1 : 0.55,
            transform: ariaExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      )}
    </Component>
  );
}
