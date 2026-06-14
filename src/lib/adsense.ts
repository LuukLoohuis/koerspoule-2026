/**
 * Google AdSense — laadt het advertentiescript UITSLUITEND ná expliciete
 * toestemming (AVG/GDPR). Consent wordt opgeslagen in localStorage door de
 * CookieBanner; dit bestand injecteert de loader idempotent.
 */
const ADSENSE_CLIENT = "ca-pub-3344256909895842";
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
const CONSENT_KEY = "koers-ads-consent"; // "granted" | "denied"

export function getAdConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setAdConsent(v: "granted" | "denied"): void {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode — negeer */
  }
}

/** Injecteer de AdSense-loader één keer. */
export function loadAdSense(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('script[data-adsense="1"]')) return; // al geladen
  const s = document.createElement("script");
  s.async = true;
  s.src = ADSENSE_SRC;
  s.crossOrigin = "anonymous";
  s.dataset.adsense = "1";
  document.head.appendChild(s);
}

/** Laad alleen als de gebruiker eerder toestemming gaf. */
export function maybeLoadAdSense(): void {
  if (getAdConsent() === "granted") loadAdSense();
}
