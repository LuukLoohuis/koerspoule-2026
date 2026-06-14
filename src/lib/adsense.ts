/**
 * Google AdSense + Funding Choices (gecertificeerde CMP).
 *
 * De GDPR/CCPA-toestemmingsmelding wordt in de AdSense-console geconfigureerd
 * (Privacy & messaging) en door Google's Funding Choices getoond aan EU-bezoekers.
 * De CMP houdt gepersonaliseerde advertentiecookies tegen tot toestemming (TCF) —
 * dit is de officiële, gecertificeerde route, dus we hoeven het script niet zelf
 * achter een eigen knop te gaten. We injecteren de loaders idempotent.
 */
const ADSENSE_CLIENT = "ca-pub-3344256909895842";
const PUB_ID = "pub-3344256909895842";

function inject(src: string, attrs: Record<string, string> = {}): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector(`script[src="${src}"]`)) return false;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
  return true;
}

/** Signaleer aan Funding Choices dat de CMP aanwezig is (standaard Google-stub). */
function signalGooglefcPresent(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { frames: Record<string, unknown> };
  if (w.frames["googlefcPresent"]) return;
  if (document.body) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;display:none";
    iframe.name = "googlefcPresent";
    document.body.appendChild(iframe);
  } else {
    setTimeout(signalGooglefcPresent, 0);
  }
}

let started = false;
/** Eenmalig: laad Funding Choices (CMP) + de AdSense-loader. */
export function initAds(): void {
  if (typeof document === "undefined" || started) return;
  started = true;
  // 1) Funding Choices CMP — toont de in de console geconfigureerde consent-melding.
  inject(`https://fundingchoicesmessages.google.com/i/${PUB_ID}?ers=1`);
  signalGooglefcPresent();
  // 2) AdSense-loader.
  inject(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`, {
    crossorigin: "anonymous",
    "data-adsense": "1",
  });
}
