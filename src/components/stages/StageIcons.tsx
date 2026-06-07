/* StageIcons.tsx
 * Icon set + decorative texture for the Koerspoule stage-selector (Uitslagen tab).
 *
 * All glyphs use `currentColor`, so they inherit the color you set on the parent.
 * Drop one inside the circular badge and set the badge's text color to the stage-type
 * color, e.g.:
 *
 *   <span className="badge" style={{ color: "#C0395B" }}>
 *     <MountainIcon size={16} />
 *   </span>
 *
 * Type -> icon -> color mapping (matches the reference design):
 *   flat       -> <LightningIcon/>  green   #2E6A4F
 *   hilly      -> <HillsIcon/>      orange  #C2691C
 *   mountain   -> <MountainIcon/>   red     #C0395B
 *   timetrial  -> <StopwatchIcon/>  blue    #2E5E8C
 *   GC         -> <CrownIcon/>      gold    #E8B923
 */

import * as React from "react";

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  xmlns: "http://www.w3.org/2000/svg",
});

/* ----------------------------- TYPE ICONS ------------------------------ */

export function MountainIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M2.5 19.5 L9.5 6 L13 12 L15.5 8 L21.5 19.5 Z" fill="currentColor" />
      <path d="M8.1 8.6 L9.5 6 L10.9 8.6 L9.9 8 L9.5 8.6 L9.1 8 Z" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

export function HillsIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M2 18.5 Q7 9.5 12 18.5 Q17 9.5 22 18.5 Z" fill="currentColor" />
    </svg>
  );
}

export function LightningIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M13.5 2 L5 13.5 L10.5 13.5 L9 22 L19 9 L13 9 Z" fill="currentColor" />
    </svg>
  );
}

export function StopwatchIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <rect x="10" y="2" width="4" height="2.4" rx="0.8" fill="currentColor" />
      <rect x="11.2" y="3.6" width="1.6" height="2" fill="currentColor" />
      <circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M12 14 L15.2 10.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------- SUPPORTING ICONS ---------------------------- */

export function CrownIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M3 18 L4.5 8 L9 12.5 L12 5.5 L15 12.5 L19.5 8 L21 18 Z" fill="currentColor" />
      <rect x="3" y="18" width="18" height="2.4" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export function RouteIcon({ size = 18, className, title }: IconProps) {
  return (
    <svg {...base(size)} className={className} role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M6 19 C6 14 11 15 12 12 C13 9 18 10 18 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="19" r="1.8" fill="currentColor" />
      <circle cx="18" cy="5" r="1.8" fill="currentColor" />
    </svg>
  );
}

/* ----------------------- MOUNTAIN BAR TEXTURE -------------------------- */
//
// Sits absolutely positioned near the bottom of mountain (red) bars. Stretches
// to bar width via preserveAspectRatio="none".
//
// Usage:
//   <div className="bar" style={{ position: "relative", color: "#9E2B30" }}>
//     <MountainTexture className="bar-texture" />
//   </div>
//   .bar-texture { position: absolute; left: 0; right: 0; bottom: 0;
//                  width: 100%; height: 45%; opacity: 0.22;
//                  pointer-events: none; }

export function MountainTexture({
  className,
  opacity = 0.28,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 50"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* back ridge — lighter, taller, sits behind */}
      <path
        d="M0 50 L0 22 L14 6 L26 18 L40 2 L54 16 L66 5 L80 17 L92 7 L100 16 L100 50 Z"
        fill="currentColor"
        opacity={opacity * 0.55}
      />
      {/* front ridge — sharper, more pronounced */}
      <path
        d="M0 50 L0 30 L10 18 L20 28 L31 10 L42 26 L52 15 L64 30 L74 12 L85 26 L94 16 L100 28 L100 50 Z"
        fill="currentColor"
        opacity={opacity}
      />
    </svg>
  );
}

/* ----------------------------- HELPER ---------------------------------- */

export type StageType = "flat" | "hilly" | "mountain" | "timetrial";

export function StageTypeIcon({
  type,
  size = 18,
  className,
}: {
  type: StageType;
  size?: number;
  className?: string;
}) {
  switch (type) {
    case "mountain":  return <MountainIcon size={size} className={className} title="Bergrit" />;
    case "hilly":     return <HillsIcon size={size} className={className} title="Heuvelachtig" />;
    case "timetrial": return <StopwatchIcon size={size} className={className} title="Tijdrit" />;
    case "flat":
    default:          return <LightningIcon size={size} className={className} title="Vlakke rit" />;
  }
}
