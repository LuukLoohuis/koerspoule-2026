/**
 * useSwipeHint — toont één keer PER swipe-sectie een wegklikbare coachmark.
 * `visible` is true tot de gebruiker 'm sluit (✕), voor het eerst swiped, óf na
 * ~6s; daarna onthouden in localStorage. Sleutel per sectie (`sectionId`) zodat
 * de uitleg de eerste keer op elke swipe-sectie (Hors Cat, Volgwagen, subpoule,
 * uitslagen) verschijnt. v5-key zodat de verbeterde coachmark opnieuw verschijnt.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTO_HIDE_MS = 6000;

export function useSwipeHint(sectionId = "default"): { visible: boolean; dismiss: () => void } {
  const key = useMemo(() => `kp_swipe_hint_seen_v5_${sectionId}`, [sectionId]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      seen = true; // localStorage geblokkeerd → niet tonen (geen crash)
    }
    setVisible(!seen);
  }, [key]);

  // Na ~6s vanzelf weg (en onthouden), ook zonder swipe of ✕.
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* negeer */
      }
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [visible, key]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* negeer */
    }
  }, [key]);

  return { visible, dismiss };
}
