/**
 * scrollLock — gedeelde, kortstondige "dit is een geprogrammeerde scroll"-vlag.
 *
 * De SwipeCarousel scrollt bij een tabwissel zelf met window.scrollTo (naar het
 * begin van de tab). Die scroll mag NIET als gebruikersscroll tellen — anders
 * klapt de auto-hide-tabbalk weg/terug (useAutoHideOnScroll) én verlengt de
 * carrousel z'n eigen scroll-cooldown, waardoor de volgende swipe genegeerd
 * wordt. Beide luisteraars checken isProgrammaticScroll() en slaan de event over
 * zolang de vlag warm is.
 *
 * Module-scoped timestamp: markProgrammaticScroll zet "warm tot nu + duration".
 */
let programmaticUntil = 0;

export function markProgrammaticScroll(durationMs = 500): void {
  programmaticUntil = performance.now() + durationMs;
}

export function isProgrammaticScroll(): boolean {
  return performance.now() < programmaticUntil;
}
