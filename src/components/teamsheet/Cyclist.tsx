/**
 * Reusable side-profile cyclist illustration.
 *
 * Voorkeur: een echt asset per truikleur (src/assets/riders/<color>.png|svg).
 * Als asset ontbreekt → val terug op een rijkere recolorable SVG met
 * `category` of `jerseyColor` als input. Hierdoor renderen 22 renners zonder
 * 22 losse afbeeldingen.
 *
 * Gebruik:
 *   <Cyclist category="GC" />
 *   <Cyclist jerseyColor="#7A3FA0" shortsColor="#2A1A2A" faded />
 *   <Cyclist category="SPRINT" width={120} />
 */

import { categoryTone, type RiderCategory } from "./tokens";

// Eager-glob: pakt elk asset src/assets/riders/<naam>.{png,svg,webp} op zodat we
// per categorie/kleur een rijk illustratief asset kunnen laden zodra de assets
// in de repo zitten. Lege map = geen records → SVG-fallback wordt gebruikt.
const RIDER_ASSETS = import.meta.glob("../../assets/riders/*.{png,svg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Sleutel-suggesties per categorie (laat assets met deze namen vallen om ze te
 *  activeren: alien.png, gc.png, sprint.png, klim.png, tijdrit.png, aanval.png,
 *  punch.png, klassiek.png, talent.png, oud.png, joker.png). */
const CATEGORY_ASSET_KEYS: Record<RiderCategory, string[]> = {
  ALIEN:    ["alien", "purple", "gc"],
  GC:       ["gc", "leader", "yellow", "purple"],
  SPRINT:   ["sprint", "sprinter", "blue"],
  KLIM:     ["klim", "klimmer", "green", "mountain"],
  TIJDRIT:  ["tijdrit", "chrono", "brown", "tt"],
  AANVAL:   ["aanval", "attack", "orange"],
  PUNCH:    ["punch", "orange"],
  KLASSIEK: ["klassiek", "classics", "tan"],
  TALENT:   ["talent", "white", "young"],
  OUD:      ["oud", "veteraan", "brown"],
  JOKER:    ["joker", "purple"],
  OVERIG:   ["rider", "default"],
};

function resolveAsset(category: RiderCategory | undefined): string | null {
  if (!category) return null;
  const keys = CATEGORY_ASSET_KEYS[category];
  for (const k of keys) {
    for (const path in RIDER_ASSETS) {
      if (path.toLowerCase().includes(`/${k}.`)) return RIDER_ASSETS[path];
    }
  }
  return null;
}

type Props = {
  category?: RiderCategory;
  jerseyColor?: string;
  shortsColor?: string;
  faded?: boolean;
  width?: number;
  height?: number;
  className?: string;
  title?: string;
};

const INK = "#3A2A1A";
const SKIN = "#E8C9A8";
const SKIN_DARK = "#B89270";
const RED = "#B23A34";

export default function Cyclist({
  category,
  jerseyColor,
  shortsColor,
  faded = false,
  width = 72,
  height = 56,
  className,
  title,
}: Props) {
  const tone = category ? categoryTone(category) : null;
  const jersey = jerseyColor ?? tone?.jersey ?? "#5A4A38";
  const shorts = shortsColor ?? tone?.shorts ?? "#2A2218";
  const jerseyShade = shade(jersey, -0.18);

  // 1) Geef voorrang aan een echt asset als die in src/assets/riders staat.
  const asset = !jerseyColor ? resolveAsset(category) : null;
  if (asset) {
    return (
      <img
        src={asset}
        alt={title ?? ""}
        width={width}
        height={height}
        className={className}
        style={{
          display: "block",
          objectFit: "contain",
          filter: faded ? "grayscale(1) opacity(0.55)" : undefined,
        }}
      />
    );
  }

  // 2) Fallback: rijke vector-cyclist (zelfde proportie als de hero-illustraties).
  return (
    <svg
      viewBox="0 0 120 90"
      width={width}
      height={height}
      className={className}
      style={{
        display: "block",
        filter: faded ? "grayscale(1) opacity(0.55)" : undefined,
        overflow: "visible",
      }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`g-jersey-${jersey}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={jersey} />
          <stop offset="100%" stopColor={jerseyShade} />
        </linearGradient>
      </defs>

      {/* Grondschaduw onder de fiets */}
      <ellipse cx="60" cy="84" rx="46" ry="3" fill="rgba(58,42,26,0.18)" />

      {/* Achterwiel */}
      <g>
        <circle cx="28" cy="70" r="14" fill="none" stroke={INK} strokeWidth="2.2" />
        <circle cx="28" cy="70" r="2.4" fill={INK} />
        {/* Spaken */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x = 28 + Math.cos(a) * 12.5;
          const y = 70 + Math.sin(a) * 12.5;
          return <line key={i} x1="28" y1="70" x2={x} y2={y} stroke={INK} strokeWidth="0.7" opacity="0.55" />;
        })}
      </g>

      {/* Voorwiel */}
      <g>
        <circle cx="92" cy="70" r="14" fill="none" stroke={INK} strokeWidth="2.2" />
        <circle cx="92" cy="70" r="2.4" fill={INK} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.35;
          const x = 92 + Math.cos(a) * 12.5;
          const y = 70 + Math.sin(a) * 12.5;
          return <line key={i} x1="92" y1="70" x2={x} y2={y} stroke={INK} strokeWidth="0.7" opacity="0.55" />;
        })}
      </g>

      {/* Frame (driehoek) */}
      <path
        d="M28 70 L60 46 L92 70 M60 46 L78 70 M60 46 L66 30 M28 70 L66 30"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Crank + crank-arm + tandwiel */}
      <circle cx="60" cy="70" r="4" fill="#222" stroke={INK} strokeWidth="0.7" />
      <line x1="60" y1="70" x2="64" y2="64" stroke={INK} strokeWidth="2" strokeLinecap="round" />

      {/* Ketting-suggestie (3 stippen) */}
      <line x1="62" y1="68" x2="90" y2="70" stroke={INK} strokeWidth="0.8" opacity="0.4" />

      {/* Stuur + remhendels */}
      <path d="M93 46 L102 36 L108 36" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M102 36 L102 30" stroke={INK} strokeWidth="2" strokeLinecap="round" />

      {/* Zadelpen + zadel */}
      <line x1="60" y1="46" x2="60" y2="32" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M52 32 Q60 28 68 32" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />

      {/* Broek — kort blokje boven zadel */}
      <path
        d="M50 36 L66 26 L72 30 L58 38 Z"
        fill={shorts}
        stroke={INK}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Trui — gebogen torso */}
      <path
        d="M58 38 L66 22 L86 16 L96 28 L80 32 L70 40 Z"
        fill={`url(#g-jersey-${jersey})`}
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Trui-detail: schouder-streep */}
      <path
        d="M76 22 L92 24"
        stroke={jerseyShade}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Voorste arm */}
      <path d="M88 20 L98 30 L102 36" stroke={jersey} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M88 20 L98 30 L102 36" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <circle cx="102" cy="36" r="2.6" fill={SKIN} stroke={INK} strokeWidth="0.7" />

      {/* Achterste arm (deels verstopt) */}
      <path d="M70 22 L82 34" stroke={jerseyShade} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />

      {/* Voorste been (over de pedaal) */}
      <path d="M64 30 L68 50 L74 64" stroke={shorts} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M64 30 L68 50 L74 64" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M74 64 L80 70" stroke={SKIN_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Achterste been deels achter frame */}
      <path d="M58 32 L52 50" stroke={shorts} strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Helm (aero, met spleet) */}
      <path
        d="M86 14 Q104 8 108 22 L96 26 Z"
        fill={`url(#g-jersey-${jersey})`}
        stroke={INK}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line x1="92" y1="14" x2="104" y2="14" stroke={INK} strokeWidth="0.7" opacity="0.6" />
      <line x1="92" y1="18" x2="104" y2="18" stroke={INK} strokeWidth="0.7" opacity="0.6" />

      {/* Gezicht + zonnebril */}
      <circle cx="99" cy="24" r="3.4" fill={SKIN} stroke={INK} strokeWidth="0.8" />
      <path d="M97 23 L101 23" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

      {faded && (
        <g>
          <line x1="12" y1="14" x2="108" y2="82" stroke={RED} strokeWidth="4" strokeLinecap="round" />
          <line x1="108" y1="14" x2="12" y2="82" stroke={RED} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/** Verschuif een hex-kleur licht-/donkerder (gebruikt voor schaduw op trui). */
function shade(hex: string, ratio: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  if (ratio < 0) {
    r = Math.max(0, Math.round(r * (1 + ratio)));
    g = Math.max(0, Math.round(g * (1 + ratio)));
    b = Math.max(0, Math.round(b * (1 + ratio)));
  } else {
    r = Math.min(255, Math.round(r + (255 - r) * ratio));
    g = Math.min(255, Math.round(g + (255 - g) * ratio));
    b = Math.min(255, Math.round(b + (255 - b) * ratio));
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
