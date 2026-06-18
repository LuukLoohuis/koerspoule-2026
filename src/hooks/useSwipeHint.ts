/**
 * useSwipeHint — toont één keer (app-breed) een wegklikbare swipe-coachmark.
 * `visible` is true tot de gebruiker 'm sluit (✕), voor het eerst swiped, óf na
 * ~5s; daarna onthouden in localStorage. v4-key zodat de verbeterde coachmark
 * opnieuw verschijnt voor wie de oude al zag.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "kp_swipe_hint_seen_v4";
const AUTO_HIDE_MS = 5000;

export function useSwipeHint(): { visible: boolean; dismiss: () => void } {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      seen = true; // localStorage geblokkeerd → niet tonen (geen crash)
    }
    if (!seen) setVisible(true);
  }, []);

  // Na ~5s vanzelf weg (en onthouden), ook zonder swipe of ✕.
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* negeer */
      }
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* negeer */
    }
  }, []);

  return { visible, dismiss };
}
