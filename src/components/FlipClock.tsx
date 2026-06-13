/**
 * <FlipClock> — retro split-flap teller (solari-bord), pure CSS + React.
 *
 * Eén donkere tile per cijfer, amber cijfers, middennaad + 3D-randje.
 * Bij waardeverandering (of mount) flipt elk gewijzigd cijfer kort om z'n
 * X-as. prefers-reduced-motion → geen animatie, cijfer staat er direct.
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  /** Suffix-label naast de tiles, bv. "PT". */
  suffix?: string;
  /** Tile-hoogte in px (breedte schaalt mee). */
  size?: number;
  className?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Digit({ ch, size, animate }: { ch: string; size: number; animate: boolean }) {
  const w = Math.round(size * 0.72);
  return (
    <span
      // key-remount in de parent triggert de flip; hier alleen de styling
      className={animate ? "fc-digit fc-digit--flip" : "fc-digit"}
      style={{
        width: w,
        height: size,
        fontSize: Math.round(size * 0.62),
        lineHeight: `${size}px`,
        borderRadius: Math.max(3, Math.round(size * 0.09)),
      }}
    >
      {ch}
      {/* middennaad van het split-flap mechaniek */}
      <span aria-hidden className="fc-seam" />
    </span>
  );
}

export default function FlipClock({ value, suffix, size = 44, className }: Props) {
  const reduce = prefersReducedMotion();
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const digits = String(safe).split("");

  // Eerste render niet flippen behalve bij mount-animatie; daarna alleen
  // gewijzigde posities. Key bevat positie+cijfer → remount = CSS-animatie.
  const prevRef = useRef<string[]>([]);
  const [, force] = useState(0);
  useEffect(() => {
    prevRef.current = digits;
    force((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe]);

  return (
    <span className={"fc-wrap " + (className ?? "")} role="img" aria-label={`${safe}${suffix ? ` ${suffix}` : ""}`}>
      <style>{`
.fc-wrap { display: inline-flex; align-items: baseline; gap: 4px; }
.fc-digit {
  position: relative;
  display: inline-block;
  text-align: center;
  background: linear-gradient(180deg, #2A241D 0%, #1A1612 48%, #14110D 52%, #221D17 100%);
  color: hsl(var(--vintage-gold));
  text-shadow: 0 0 12px rgba(212,154,26,0.5);
  font-family: 'Oswald','Archivo Black',sans-serif;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  border: 1px solid rgba(0,0,0,0.65);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 -1px 0 rgba(0,0,0,0.5),
    0 2px 4px rgba(0,0,0,0.35);
  user-select: none;
  backface-visibility: hidden;
}
.fc-seam {
  position: absolute; left: 0; right: 0; top: 50%;
  height: 1px;
  background: linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7));
  pointer-events: none;
}
@keyframes fc-flip {
  0%   { transform: rotateX(-90deg); }
  100% { transform: rotateX(0deg); }
}
.fc-digit--flip { animation: fc-flip 200ms ease-out; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .fc-digit--flip { animation: none; }
}
.fc-suffix {
  font-family: 'Oswald','Archivo Black',sans-serif;
  font-weight: 700;
  color: hsl(var(--vintage-gold));
  opacity: 0.85;
}
      `}</style>
      {digits.map((ch, i) => (
        <Digit
          // positie + cijfer in de key → gewijzigd cijfer remount + flip
          key={`${i}-${ch}-${digits.length}`}
          ch={ch}
          size={size}
          animate={!reduce}
        />
      ))}
      {suffix && (
        <span className="fc-suffix" style={{ fontSize: Math.round(size * 0.32) }}>
          {suffix}
        </span>
      )}
    </span>
  );
}
