/**
 * Koerspoule als app op het beginscherm.
 *
 * Een website kan zichzelf op de iPhone niet installeren: daar bestaat geen
 * installatieknop, je kunt alleen uitleggen hoe het moet (Safari: Deel → Zet op
 * beginscherm). Op Android vuurt Chrome `beforeinstallprompt` en mag de site
 * zelf de installatievraag stellen.
 *
 * Hier alleen de beslissingen, zonder DOM: welk toestel, draait de site al als
 * app, en mag de hint vandaag in beeld. De opslag (localStorage) gaat er als
 * argument in, zodat het te testen is en de prerender er niet over struikelt.
 */

/**
 * - `ios`: Safari of een andere browser op iPhone/iPad die het deelmenu heeft.
 * - `ios-inapp`: de ingebouwde browser van Instagram, Facebook en co. Die heeft
 *   geen "Zet op beginscherm"; eerst openen in Safari.
 * - `android`: kan installeren, met of zonder de vraag van Chrome.
 * - `anders`: desktop en de rest; geen hint.
 */
export type Platform = "ios" | "ios-inapp" | "android" | "anders";

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|TikTok|BytedanceWebview|musical_ly|Twitter|Line\//i;

export function bepaalPlatform(ua: string, maxTouchPoints = 0): Platform {
  // iPadOS doet zich voor als Mac; alleen het aanraakscherm verraadt hem.
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  if (ios) return IN_APP.test(ua) ? "ios-inapp" : "ios";
  if (/Android/i.test(ua)) return "android";
  return "anders";
}

/** Draait Koerspoule al vanaf het beginscherm? */
export function draaitAlsApp(win: Pick<Window, "matchMedia" | "navigator">): boolean {
  if ((win.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return ["standalone", "fullscreen", "minimal-ui"].some(
    (modus) => win.matchMedia?.(`(display-mode: ${modus})`).matches ?? false,
  );
}

export const OPSLAG_WEG = "koerspoule:beginscherm-weg";
/** Zelfde sleutel als CookieBanner: zolang die balk staat, geen tweede strook. */
export const OPSLAG_COOKIES = "koers-cookies-accepted-v2";
/** CookieBanner seint dit bij "Begrepen", zodat de hint meteen kan komen. */
export const COOKIES_AKKOORD_EVENT = "koerspoule:cookies-akkoord";

/** Weggeklikt blijft de hint zo lang weg. */
export const WEG_DAGEN = 60;

type Opslag = Pick<Storage, "getItem">;

export function hintMagTonen(s: {
  platform: Platform;
  alsApp: boolean;
  /** Chrome heeft `beforeinstallprompt` gevuurd. */
  kanInstalleren: boolean;
  cookiesAkkoord: boolean;
  /** Tijdstip (ms) waarop de hint is weggeklikt of gebruikt, of null. */
  wegSinds: number | null;
  nu: number;
}): boolean {
  // Al bij het eerste bezoek, maar niet bovenop de cookiebanner.
  if (s.alsApp || !s.cookiesAkkoord) return false;
  if (s.wegSinds !== null && s.nu - s.wegSinds < WEG_DAGEN * 86_400_000) return false;
  // Android zonder de vraag van Chrome: dan is installeren een zoektocht door
  // het browsermenu. Die uitleg staat in het menu, niet in een strook.
  if (s.platform === "android") return s.kanInstalleren;
  return s.platform === "ios";
}

/** Leest het weggeklikt-tijdstip; rommel telt als niet weggeklikt. */
export function leesWegSinds(lokaal: Opslag): number | null {
  const waarde = Number(lokaal.getItem(OPSLAG_WEG));
  return Number.isFinite(waarde) && waarde > 0 ? waarde : null;
}
