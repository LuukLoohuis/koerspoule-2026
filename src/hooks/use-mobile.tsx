import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Beide haken luisteren naar een media query maar lazen de uitkomst uit
 * window.innerWidth. Dat is niet hetzelfde getal: innerWidth telt de
 * scrollbalk mee, en in een ingesloten of geschaald venster kan het compleet
 * afwijken van de breedte waar CSS mee rekent. Het gevolg was dat JS zich
 * "desktop" waande terwijl Tailwind's md: al op mobiel stond, of andersom.
 * Nu komt het antwoord uit dezelfde query als waar we op abonneren, zodat JS
 * en CSS het per definitie eens zijn.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** True zodra het viewport minstens `px` breed is (bv. 1024 = Tailwind `lg`). */
export function useMinWidth(px: number) {
  const [ok, setOk] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${px}px)`);
    const onChange = () => setOk(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [px]);
  return !!ok;
}
