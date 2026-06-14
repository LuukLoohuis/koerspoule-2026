/**
 * useSwipeHint — geeft één keer (app-breed) `peek = true` terug zodat de
 * tab-content een korte hint-beweging maakt die de swipe aanleert. Daarna
 * onthouden in localStorage. prefers-reduced-motion → nooit peeken.
 */
import { useEffect, useState } from "react";

const KEY = "kp_swipe_hint_seen";

export function useSwipeHint(): boolean {
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      seen = true; // localStorage geblokkeerd → niet peeken (geen crash)
    }
    if (seen) return;
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* negeer */
    }
    setPeek(true);
    const id = window.setTimeout(() => setPeek(false), 600);
    return () => window.clearTimeout(id);
  }, []);

  return peek;
}
