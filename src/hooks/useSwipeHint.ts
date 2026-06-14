/**
 * useSwipeHint — toont één keer (app-breed) een wegklikbare swipe-hint. `visible`
 * is true tot de gebruiker 'm sluit (✕) óf voor het eerst swiped; daarna onthouden
 * in localStorage. v2-key zodat de hint opnieuw verschijnt voor wie de oude al zag.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "kp_swipe_hint_seen_v2";

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
