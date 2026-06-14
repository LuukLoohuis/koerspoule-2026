/**
 * useAutoHideOnScroll — `visible` voor een balk die wegglijdt bij omlaag scrollen
 * en terugkomt bij omhoog scrollen. Bovenaan de pagina altijd zichtbaar.
 *
 * Passieve window-scroll-listener, throttled via requestAnimationFrame, met
 * accumulatie tot een drempel zodat kleine bewegingen niet flikkeren.
 * prefers-reduced-motion → altijd zichtbaar (geen verbergen).
 */
import { useEffect, useRef, useState } from "react";

export function useAutoHideOnScroll(threshold = 12): boolean {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 24) {
          setVisible(true); // bovenaan altijd zichtbaar
          lastY.current = y;
          ticking.current = false;
          return;
        }
        const dy = y - lastY.current;
        if (Math.abs(dy) < threshold) {
          ticking.current = false; // te klein → lastY niet resetten (accumuleren)
          return;
        }
        setVisible(dy < 0); // omhoog → tonen, omlaag → verbergen
        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return visible;
}
