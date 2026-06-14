/**
 * useSwipeTabs — links/rechts-swipe op de tab-content → vorige/volgende tab.
 *
 * Geeft `bind` (touch-handlers) + een live `dragX`-offset terug. Spreid `bind`
 * op de content-container; gebruik `dragX` om ALLEEN de tabbalk mee te laten
 * bewegen tijdens de swipe (de pagina/content zelf beweegt niet horizontaal).
 *
 * Clamp aan de randen (geen wrap). Negeert: te kleine swipes (<50px), verticaal-
 * dominante bewegingen (kaapt scrollen niet), en swipes die in een horizontaal
 * scrollend element beginnen (bv. de etappe-bar). Na wisselen scroll naar boven
 * (reduced-motion-safe).
 */
import { useRef, useState, type TouchEvent } from "react";

const THRESHOLD = 50;
const MAX_DRAG = 36; // hoe ver de tabbalk maximaal meeschuift

function startedInHorizontalScroller(target: EventTarget | null, root: HTMLElement): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== root.parentElement) {
    const ox = window.getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 4) return true;
    el = el.parentElement;
  }
  return false;
}

export function useSwipeTabs({
  keys,
  active,
  onChange,
}: {
  keys: string[];
  active: string;
  onChange: (key: string) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const ignore = useRef(false);
  const horizontal = useRef(false);
  const [dragX, setDragX] = useState(0);

  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    ignore.current = startedInHorizontalScroller(e.target, e.currentTarget);
    horizontal.current = false;
  };

  const onTouchMove = (e: TouchEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || ignore.current) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Pas zodra de beweging duidelijk horizontaal is laten we de balk meeschuiven.
    if (!horizontal.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      horizontal.current = true;
    }
    if (!horizontal.current) return;
    const idx = keys.indexOf(active);
    // Aan de randen (geen vorige/volgende) minder meegeven (rubber-band-gevoel).
    const atEdge = (dx < 0 && idx >= keys.length - 1) || (dx > 0 && idx <= 0);
    const damp = atEdge ? 0.18 : 0.4;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx * damp));
    setDragX(clamped);
  };

  const onTouchEnd = (e: TouchEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    setDragX(0); // balk veert terug
    if (!s || ignore.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    const idx = keys.indexOf(active);
    if (idx < 0) return;
    const next = dx < 0 ? idx + 1 : idx - 1; // swipe links → volgende
    if (next < 0 || next >= keys.length) return; // clamp, geen wrap
    onChange(keys[next]);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })),
    );
  };

  // touchAction pan-y: verticaal scrollen blijft van de browser, horizontaal is
  // van ons → de pagina beweegt niet horizontaal mee.
  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, style: { touchAction: "pan-y" as const } },
    dragX,
  };
}
