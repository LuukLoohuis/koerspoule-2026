/**
 * useSwipeTabs — links/rechts-swipe op de tab-content → vorige/volgende tab.
 *
 * Geeft touch-handlers terug om op de content-container te spreiden. Clamp aan
 * de randen (geen wrap). Negeert: te kleine swipes (<50px), verticaal-dominante
 * bewegingen (kaapt scrollen niet), en swipes die in een horizontaal scrollend
 * element beginnen (bv. de etappe-bar). Na wisselen scroll naar boven
 * (reduced-motion-safe).
 */
import { useRef, type TouchEvent } from "react";

const THRESHOLD = 50;

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

  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    ignore.current = startedInHorizontalScroller(e.target, e.currentTarget);
  };

  const onTouchEnd = (e: TouchEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || ignore.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Horizontaal-dominant + boven drempel; anders is het (verticaal) scrollen.
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

  return { onTouchStart, onTouchEnd };
}
