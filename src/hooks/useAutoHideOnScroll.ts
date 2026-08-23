/**
 * useAutoHideOnScroll — `visible` voor een balk die alleen in beeld is terwijl
 * je scrolt.
 *
 * Je hebt zo'n balk nodig op het moment dat je ergens heen wilt, niet terwijl
 * je zit te lezen. Dus: elke scrollbeweging haalt hem tevoorschijn, ongeacht de
 * richting, en na een korte stilte glijdt hij weer weg. Bovenaan de pagina
 * blijft hij staan -- daar ben je net aangekomen en oriënteer je je nog.
 *
 * Hiervoor verdween hij bij omlaag scrollen en kwam hij terug bij omhoog. Dat
 * betekende dat hij juist tijdens het lezen in beeld bleef zodra je een keer
 * terugscrolde, en dat hij wegviel op het moment dat je wilde navigeren.
 *
 * Passieve scroll-listener, throttled via requestAnimationFrame.
 * prefers-reduced-motion → altijd zichtbaar (geen verbergen).
 */
import { useEffect, useRef, useState } from "react";
import { isProgrammaticScroll } from "@/lib/scrollLock";

/** Hoe lang zonder scrollen voordat de balk weer wegglijdt. */
const RUST_MS = 1400;

/** Vanaf hier tel je als "in de tekst" in plaats van "bovenaan". */
const TOP_PX = 24;

export function useAutoHideOnScroll(rustMs = RUST_MS): boolean {
  const [visible, setVisible] = useState(true);
  const ticking = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const plan = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        // Bovenaan niet verbergen: daar is de balk je startpunt.
        if (window.scrollY < TOP_PX) return;
        setVisible(false);
      }, rustMs);
    };

    const onScroll = () => {
      // Tabwissel-scroll (carrousel) is geen gebruikersscroll; die mag de balk
      // niet oproepen en de rusttimer niet verlengen.
      if (isProgrammaticScroll()) return;
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setVisible(true);
        plan();
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    plan();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [rustMs]);

  return visible;
}
