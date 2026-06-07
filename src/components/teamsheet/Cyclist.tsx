/**
 * Reusable side-profile cyclist silhouette.
 *
 * Bewust één SVG die we via een `jerseyColor` (of een `category` token)
 * herkleuren. Hierdoor maken we 22 renners met 1 asset; bij DNF zetten we een
 * grayscale-filter aan en tekenen een rood kruis erover.
 *
 * Gebruik:
 *   <Cyclist category="GC" />
 *   <Cyclist jerseyColor="#7A3FA0" shortsColor="#2A1A2A" faded />
 */

import { categoryTone, type RiderCategory } from "./tokens";

type Props = {
  /** Geef óf een categorie (dan pakt 'ie de tone uit tokens.ts), … */
  category?: RiderCategory;
  /** … óf een directe kleur (overschrijft `category`). */
  jerseyColor?: string;
  shortsColor?: string;
  /** Vervaagd + rood X — DNF-modus. */
  faded?: boolean;
  width?: number;
  height?: number;
  className?: string;
  title?: string;
};

const INK = "#3A2A1A";
const SKIN = "#E8C9A8";
const RED = "#B23A34";

export default function Cyclist({
  category,
  jerseyColor,
  shortsColor,
  faded = false,
  width = 56,
  height = 42,
  className,
  title,
}: Props) {
  const tone = category ? categoryTone(category) : null;
  const jersey = jerseyColor ?? tone?.jersey ?? "#5A4A38";
  const shorts = shortsColor ?? tone?.shorts ?? "#2A2218";

  return (
    <svg
      viewBox="0 0 56 42"
      width={width}
      height={height}
      className={className}
      style={{
        display: "block",
        filter: faded ? "grayscale(1) opacity(0.45)" : undefined,
      }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Wielen */}
      <circle cx="13" cy="34" r="6.5" fill="none" stroke={INK} strokeWidth="1.5" />
      <circle cx="43" cy="34" r="6.5" fill="none" stroke={INK} strokeWidth="1.5" />
      <circle cx="13" cy="34" r="1" fill={INK} />
      <circle cx="43" cy="34" r="1" fill={INK} />
      {/* Frame */}
      <path
        d="M13 34 L28 22 L43 34 M28 22 L36 34 M28 22 L32 14"
        stroke={INK}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stuur */}
      <path d="M45 22 L48 18 L51 18" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Zadel */}
      <path d="M22 20 L26 20" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* Broek */}
      <path
        d="M22 19 L31 14 L33 16 L26 20 Z"
        fill={shorts}
        stroke={INK}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Trui — recolorable */}
      <path
        d="M26 20 L31 14 L40 11 L44 16 L36 18 L32 22 Z"
        fill={jersey}
        stroke={INK}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Arm naar stuur */}
      <path d="M40 12 L46 16 L48 19" stroke={jersey} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="19" r="1.3" fill={SKIN} stroke={INK} strokeWidth="0.5" />
      {/* Been */}
      <path d="M30 17 L34 28 L38 32" stroke={shorts} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M38 32 L43 34" stroke={SKIN} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Helm + hoofd */}
      <path
        d="M42 9 Q48 7 50 11 L46 13 Z"
        fill={jersey}
        stroke={INK}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="13" r="2" fill={SKIN} stroke={INK} strokeWidth="0.7" />

      {faded && (
        <g>
          <line x1="6" y1="6" x2="50" y2="38" stroke={RED} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="6" x2="6" y2="38" stroke={RED} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
