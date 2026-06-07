/**
 * Reusable side-profile cyclist illustration.
 *
 * Cartoon-stijl: dikke zwarte outlines, effen vlakken, racefiets met drop-bars.
 * Volledig recolorable — geef `category` (token-kleur) of een directe
 * `jerseyColor`. Helm + sokken/schoenen volgen automatisch de jersey-tint.
 *
 * Voorkeur: een echt asset per categorie in src/assets/riders/<key>.png/svg.
 * Resolver-tabel verderop bepaalt welke bestandsnaam bij welke categorie hoort.
 */

import { categoryTone, type RiderCategory } from "./tokens";

const RIDER_ASSETS = import.meta.glob("../../assets/riders/*.{png,svg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const CATEGORY_ASSET_KEYS: Record<RiderCategory, string[]> = {
  ALIEN:    ["alien", "purple"],
  GC:       ["gc", "yellow", "leader"],
  SPRINT:   ["sprint", "sprinter", "green"],
  KLIM:     ["klim", "klimmer", "polka", "mountain"],
  TIJDRIT:  ["tijdrit", "chrono", "brown", "tt"],
  AANVAL:   ["aanval", "attack", "orange"],
  PUNCH:    ["punch", "orange"],
  KLASSIEK: ["klassiek", "classics", "tan", "brown"],
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

const INK = "#1F1A14";              // bijna zwart voor outline-cartoon
const SKIN = "#F3D6B0";
const SKIN_SHADE = "#D9A878";
const FRAME = "#3B3F45";
const FRAME_DARK = "#23262B";
const TIRE = "#1A1A1A";
const RIM = "#888";
const RED = "#B23A34";

export default function Cyclist({
  category,
  jerseyColor,
  shortsColor,
  faded = false,
  width = 96,
  height = 72,
  className,
  title,
}: Props) {
  const tone = category ? categoryTone(category) : null;
  const jersey = jerseyColor ?? tone?.jersey ?? "#E8B923";
  const shorts = shortsColor ?? tone?.shorts ?? "#1F1A14";
  // Schoenen + sokken volgen jersey voor "completed kit" gevoel.
  const sock = jersey;

  // 1) Echt asset heeft voorrang.
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

  // 2) Cartoon-stijl vector — past bij reference.
  return (
    <svg
      viewBox="0 0 200 150"
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
      {/* Grondschaduw */}
      <ellipse cx="100" cy="140" rx="82" ry="4" fill="rgba(31,26,20,0.18)" />

      {/* ─── Achterwiel ─────────────────────────────────────────── */}
      <g>
        <circle cx="48" cy="115" r="26" fill="none" stroke={TIRE} strokeWidth="4" />
        <circle cx="48" cy="115" r="22" fill="none" stroke={RIM} strokeWidth="1.2" />
        <circle cx="48" cy="115" r="3.5" fill={INK} />
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const x = 48 + Math.cos(a) * 21;
          const y = 115 + Math.sin(a) * 21;
          return <line key={i} x1="48" y1="115" x2={x} y2={y} stroke={INK} strokeWidth="0.8" opacity="0.7" />;
        })}
      </g>

      {/* ─── Voorwiel ───────────────────────────────────────────── */}
      <g>
        <circle cx="152" cy="115" r="26" fill="none" stroke={TIRE} strokeWidth="4" />
        <circle cx="152" cy="115" r="22" fill="none" stroke={RIM} strokeWidth="1.2" />
        <circle cx="152" cy="115" r="3.5" fill={INK} />
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + 0.2;
          const x = 152 + Math.cos(a) * 21;
          const y = 115 + Math.sin(a) * 21;
          return <line key={i} x1="152" y1="115" x2={x} y2={y} stroke={INK} strokeWidth="0.8" opacity="0.7" />;
        })}
      </g>

      {/* ─── Frame (dik, cartoon) ───────────────────────────────── */}
      {/* Voorvork */}
      <path d="M152 115 L138 65" stroke={FRAME} strokeWidth="5" strokeLinecap="round" />
      <path d="M152 115 L138 65" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {/* Down tube */}
      <path d="M72 115 L138 65" stroke={FRAME} strokeWidth="5" strokeLinecap="round" />
      <path d="M72 115 L138 65" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {/* Seat tube */}
      <path d="M72 115 L100 60" stroke={FRAME} strokeWidth="5" strokeLinecap="round" />
      <path d="M72 115 L100 60" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {/* Top tube */}
      <path d="M100 60 L138 65" stroke={FRAME} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 60 L138 65" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {/* Chain stay */}
      <path d="M72 115 L48 115" stroke={FRAME_DARK} strokeWidth="4" strokeLinecap="round" />
      {/* Seat stay */}
      <path d="M100 60 L48 115" stroke={FRAME_DARK} strokeWidth="3" strokeLinecap="round" opacity="0.85" />

      {/* Crank + tandwiel */}
      <circle cx="72" cy="115" r="6" fill={FRAME_DARK} stroke={INK} strokeWidth="1" />
      <circle cx="72" cy="115" r="2.4" fill={INK} />
      <line x1="72" y1="115" x2="80" y2="105" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />

      {/* Stuur (drop bar) */}
      <path d="M138 65 L160 50 L168 56 L160 64" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Remhendels */}
      <path d="M160 50 L160 44" stroke={INK} strokeWidth="3" strokeLinecap="round" />

      {/* Zadelpen + zadel */}
      <line x1="100" y1="60" x2="100" y2="44" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M88 44 Q100 38 112 44" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* ─── Renner ─────────────────────────────────────────────── */}
      {/* Broek (zit op zadel, gebogen naar voren) */}
      <path
        d="M86 50 L108 36 L118 42 L96 56 Z"
        fill={shorts}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Achterste been (deels achter frame) */}
      <path
        d="M96 50 L84 100"
        stroke={shorts}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M96 50 L84 100"
        stroke={INK}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Voorste been over pedaal */}
      <path d="M104 44 L102 80 L88 108" stroke={shorts} strokeWidth="8" strokeLinecap="round" />
      <path d="M104 44 L102 80 L88 108" stroke={INK} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* Kuit/voet */}
      <path d="M88 108 L80 116" stroke={SKIN_SHADE} strokeWidth="6" strokeLinecap="round" />
      {/* Sok */}
      <path d="M80 116 L72 122" stroke={sock} strokeWidth="6" strokeLinecap="round" />
      <path d="M80 116 L72 122" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Schoen */}
      <path d="M68 122 L80 124 L80 128 L66 126 Z" fill={sock} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />

      {/* Torso/trui — gebogen voorover */}
      <path
        d="M96 56 L106 28 L142 22 L156 38 L130 44 L116 52 Z"
        fill={jersey}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Schaduw-vouw op trui */}
      <path
        d="M120 30 L142 30"
        stroke={INK}
        strokeWidth="1"
        opacity="0.18"
      />

      {/* Achterste arm (deels) */}
      <path d="M124 28 L142 38" stroke={jersey} strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <path d="M124 28 L142 38" stroke={INK} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Voorste arm naar stuur */}
      <path d="M148 26 L160 44 L160 50" stroke={jersey} strokeWidth="8" strokeLinecap="round" />
      <path d="M148 26 L160 44 L160 50" stroke={INK} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Handschoen */}
      <circle cx="160" cy="50" r="4" fill={SKIN_SHADE} stroke={INK} strokeWidth="1.4" />

      {/* Nek */}
      <path d="M156 22 L162 18" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />

      {/* Hoofd */}
      <ellipse cx="164" cy="22" rx="9" ry="10" fill={SKIN} stroke={INK} strokeWidth="2" />
      {/* Oor-suggestie */}
      <path d="M158 24 Q156 24 156 21" stroke={INK} strokeWidth="1.2" fill="none" />
      {/* Neus + mond mini */}
      <path d="M172 22 Q174 24 172 26" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M170 28 L173 28" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />

      {/* Aero-helm */}
      <path
        d="M155 18 Q160 6 178 14 Q176 22 168 22 L155 22 Z"
        fill={jersey}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Helm-ventilatie */}
      <ellipse cx="166" cy="14" rx="2.5" ry="1.4" fill={INK} opacity="0.7" />
      <ellipse cx="172" cy="14" rx="2.5" ry="1.4" fill={INK} opacity="0.7" />
      <ellipse cx="160" cy="14" rx="2.5" ry="1.4" fill={INK} opacity="0.7" />

      {faded && (
        <g>
          <line x1="16" y1="14" x2="184" y2="138" stroke={RED} strokeWidth="6" strokeLinecap="round" />
          <line x1="184" y1="14" x2="16" y2="138" stroke={RED} strokeWidth="6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
