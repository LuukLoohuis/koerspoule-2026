/**
 * useSwipeTabs — links/rechts-swipe op de tab-content → vorige/volgende tab.
 *
 * Geeft `bind` (touch-handlers + touch-action) en `barRef` terug. Hang `bind` op
 * de content-container en `barRef` op de tabbalk-wrapper: tijdens de swipe schuift
 * ALLEEN de tabbalk mee (transform wordt rechtstreeks op het DOM-element gezet —
 * GEEN React-state, dus geen re-render van de hele pagina → soepel). Na het
 * wisselen scrollt 'ie naar het BEGIN van de tab-inhoud (niet de pagina-top).
 *
 * Clamp aan de randen (geen wrap). Negeert te kleine (<50px) en verticaal-
 * dominante swipes, en swipes die in een horizontaal scrollend element beginnen
 * (bv. de etappe-bar). reduced-motion-safe.
 */
import { useRef, type TouchEvent } from "react";

const THRESHOLD = 50;
const MAX_DRAG = 36;
const TOP_OFFSET = 12; // klein, zodat je bij het begin van de tab-inhoud landt

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
  const container = useRef<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const setBar = (x: number) => {
    if (barRef.current) barRef.current.style.transform = x ? `translateX(${x}px)` : "";
  };

  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    ignore.current = startedInHorizontalScroller(e.target, e.currentTarget);
    horizontal.current = false;
    container.current = e.currentTarget;
  };

  const onTouchMove = (e: TouchEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || ignore.current) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!horizontal.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) horizontal.current = true;
    if (!horizontal.current) return;
    const idx = keys.indexOf(active);
    const atEdge = (dx < 0 && idx >= keys.length - 1) || (dx > 0 && idx <= 0);
    const damp = atEdge ? 0.18 : 0.4;
    setBar(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx * damp)));
  };

  const onTouchEnd = (e: TouchEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    setBar(0); // balk veert terug
    const el = container.current;
    container.current = null;
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
      requestAnimationFrame(() => {
        // Scroll naar het begin van de tab-inhoud (niet de pagina-top).
        const top = el ? el.getBoundingClientRect().top + window.scrollY - TOP_OFFSET : 0;
        window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
      }),
    );
  };

  // touchAction pan-y: verticaal scrollen blijft van de browser, horizontaal is
  // van ons → de pagina beweegt niet horizontaal mee.
  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, style: { touchAction: "pan-y" as const } },
    barRef,
  };
}
