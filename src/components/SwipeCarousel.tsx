/**
 * <SwipeCarousel> — vinger-volgende tab-carrousel (touch/mobiel-only).
 *
 * Toont de actieve tab; zodra een HORIZONTALE drag begint mount 'ie de buur-tab
 * in de sleeprichting (peek) en volgt de content real-time de duim
 * (translateX rechtstreeks op het DOM → géén React-state per frame → geen
 * re-render → soepel). Bij loslaten snapt 'ie naar de buur (≥35% breedte of een
 * flick) of veert terug (~240ms ease-out).
 *
 * Richting-lock in de eerste ~10px: horizontaal → carrousel + e.preventDefault()
 * (de pagina scrollt NIET verticaal mee); verticaal → carrousel genegeerd, pagina
 * scrollt normaal. Gebaren die in een horizontaal scrollend element beginnen
 * (bv. de etappe-bar) worden genegeerd. Randen: rubber-band (factor 0.2), geen wrap.
 *
 * Alleen dit content-vlak beweegt — header/tabbalk/bottom-nav blijven staan; de
 * tabbalk/stippen updaten pas bij de definitieve wissel (op snap), want onChange
 * vuurt pas dan. prefers-reduced-motion → directe drempel-wissel zonder beweging.
 * Heavy tabs: alleen de actieve + (tijdens een drag) de buur gemount. De
 * overflow-clip staat alléén tijdens een drag aan, zodat position:sticky in de
 * tab-inhoud normaal blijft werken.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

const AXIS_LOCK_PX = 10; // richting-lock-drempel
const SNAP_RATIO = 0.35; // ≥35% van de breedte → snap naar buur
const FLICK_VEL = 0.5; // px/ms → snelle flick snapt ook
const FLICK_MIN_PX = 24;
const RM_THRESHOLD = 50; // reduced-motion: harde drempel (oud gedrag)
const EDGE_DAMP = 0.2; // rubber-band aan de randen
const SNAP_MS = 240;
const TOP_OFFSET = 12; // landen bij het begin van de tab-inhoud

function startedInHorizontalScroller(target: EventTarget | null, root: HTMLElement): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== root.parentElement) {
    const ox = window.getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 4) return true;
    el = el.parentElement;
  }
  return false;
}

export default function SwipeCarousel({
  keys,
  activeKey,
  onChange,
  renderTab,
  onSwiped,
  className,
}: {
  keys: string[];
  activeKey: string;
  onChange: (key: string) => void;
  renderTab: (key: string) => ReactNode;
  onSwiped?: () => void;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [neighbor, setNeighbor] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  // Mutable drag-state (geen re-render per frame).
  const st = useRef({
    startX: 0,
    startY: 0,
    startT: 0,
    axis: "none" as "none" | "h" | "v",
    ignore: false,
    width: 1,
    dir: 0 as 0 | 1 | -1,
    reduce: false,
  });

  // Props in refs zodat de native (non-passive) listeners altijd de verse waarde zien.
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const activeRef = useRef(activeKey);
  activeRef.current = activeKey;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSwipedRef = useRef(onSwiped);
  onSwipedRef.current = onSwiped;

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const setX = (px: number, anim: boolean) => {
      const t = trackRef.current;
      if (!t) return;
      t.style.transition = anim ? `transform ${SNAP_MS}ms cubic-bezier(0.22,0.61,0.36,1)` : "";
      t.style.transform = px ? `translateX(${px}px)` : "";
    };

    const neighborIdx = (dir: 1 | -1) => {
      const idx = keysRef.current.indexOf(activeRef.current);
      const n = idx + dir;
      return n >= 0 && n < keysRef.current.length ? n : -1;
    };

    const scrollToBegin = () => {
      const reduce = st.current.reduce;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const top = vp.getBoundingClientRect().top + window.scrollY - TOP_OFFSET;
          window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
        }),
      );
    };

    const reset = () => {
      st.current.axis = "none";
      st.current.dir = 0;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const s = st.current;
      s.startX = t.clientX;
      s.startY = t.clientY;
      s.startT = performance.now();
      s.axis = "none";
      s.dir = 0;
      s.ignore = startedInHorizontalScroller(e.target, vp);
      s.width = vp.clientWidth || 1;
      s.reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const tr = trackRef.current;
      if (tr) tr.style.transition = ""; // kill een lopende snap
    };

    const onMove = (e: TouchEvent) => {
      const s = st.current;
      if (s.ignore || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;

      if (s.axis === "none") {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          s.axis = "h";
          s.dir = dx < 0 ? 1 : -1; // links vegen → volgende
          if (!s.reduce) {
            const ni = neighborIdx(s.dir);
            setNeighbor(ni >= 0 ? { key: keysRef.current[ni], dir: s.dir } : null);
          }
        } else {
          s.axis = "v"; // verticaal → pagina scrollt normaal
          return;
        }
      }
      if (s.axis !== "h") return;

      e.preventDefault(); // horizontaal gelockt → geen verticale page-scroll
      if (s.reduce) return; // geen vinger-volgen bij reduced-motion

      const toward = (dx < 0 ? 1 : -1) === s.dir && neighborIdx(s.dir) >= 0;
      const px = toward ? Math.max(-s.width, Math.min(s.width, dx)) : dx * EDGE_DAMP;
      setX(px, false);
    };

    const settleBack = () => {
      setX(0, true);
      window.setTimeout(() => {
        setNeighbor(null);
        const tr = trackRef.current;
        if (tr) tr.style.transition = "";
      }, SNAP_MS + 20);
    };

    const commitTo = (key: string, dir: 1 | -1) => {
      setX(-dir * st.current.width, true); // animeer de buur in beeld
      window.setTimeout(() => {
        const tr = trackRef.current;
        // Commit naadloos: nieuwe actieve tab + verwijder inline transform in
        // dezelfde frame (flushSync → geen tussentijdse paint → geen flits).
        flushSync(() => {
          setNeighbor(null);
          onChangeRef.current(key);
        });
        if (tr) {
          tr.style.transition = "";
          tr.style.transform = "";
        }
        onSwipedRef.current?.();
        scrollToBegin();
      }, SNAP_MS);
    };

    const onEnd = (e: TouchEvent) => {
      const s = st.current;
      const lockedDir = s.dir;
      const wasH = s.axis === "h";
      const ignore = s.ignore;
      reset();
      if (ignore || !wasH) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;
      const dt = Math.max(1, performance.now() - s.startT);
      const vel = Math.abs(dx) / dt;

      if (s.reduce) {
        if (Math.abs(dx) >= RM_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          const ni = neighborIdx(dx < 0 ? 1 : -1);
          if (ni >= 0) {
            onChangeRef.current(keysRef.current[ni]);
            onSwipedRef.current?.();
            scrollToBegin();
          }
        }
        return;
      }

      const dir = (dx < 0 ? 1 : -1) as 1 | -1;
      const ni = neighborIdx(dir);
      const toward = dir === lockedDir && ni >= 0;
      const passed =
        Math.abs(dx) >= SNAP_RATIO * s.width || (vel >= FLICK_VEL && Math.abs(dx) >= FLICK_MIN_PX);
      if (toward && passed) commitTo(keysRef.current[ni], dir);
      else settleBack();
    };

    const onCancel = () => {
      if (st.current.axis === "h" && !st.current.reduce) settleBack();
      reset();
    };

    vp.addEventListener("touchstart", onStart, { passive: true });
    vp.addEventListener("touchmove", onMove, { passive: false });
    vp.addEventListener("touchend", onEnd, { passive: true });
    vp.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      vp.removeEventListener("touchstart", onStart);
      vp.removeEventListener("touchmove", onMove);
      vp.removeEventListener("touchend", onEnd);
      vp.removeEventListener("touchcancel", onCancel);
    };
  }, []);

  const neighborStyle: CSSProperties | undefined = neighbor
    ? { position: "absolute", top: 0, width: "100%", left: neighbor.dir > 0 ? "100%" : "-100%" }
    : undefined;

  return (
    <div
      ref={viewportRef}
      // Clip alléén tijdens een drag (neighbor !== null): idle blijft overflow
      // zichtbaar zodat position:sticky in de tab-inhoud gewoon werkt.
      className={cn(neighbor ? "overflow-x-clip overflow-y-visible" : "overflow-visible", className)}
      style={{ touchAction: "pan-y" }}
    >
      <div ref={trackRef} className="relative" style={{ willChange: "transform" }}>
        <div>{renderTab(activeKey)}</div>
        {neighbor && (
          <div aria-hidden style={neighborStyle}>
            {renderTab(neighbor.key)}
          </div>
        )}
      </div>
    </div>
  );
}
