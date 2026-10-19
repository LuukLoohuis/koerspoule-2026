// Koerspoule als app op het beginscherm: welk toestel, draait hij al als app,
// en wanneer mag de hint boven de onderbalk in beeld.
import { describe, expect, it } from "vitest";
import {
  bepaalPlatform,
  draaitAlsApp,
  hintMagTonen,
  leesWegSinds,
  telBezoek,
  OPSLAG_BEZOEKEN,
  OPSLAG_WEG,
  WEG_DAGEN,
} from "./beginscherm";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 398.0.0.30.84 (iPhone15,2; iOS 18_6; nl_NL; nl; scale=3.00; 1179x2556)";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const MAC = IPAD;

function geheugen(begin: Record<string, string> = {}) {
  const data = new Map(Object.entries(begin));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
  };
}

describe("bepaalPlatform", () => {
  it("iPhone in Safari en in Chrome: allebei het deelmenu", () => {
    expect(bepaalPlatform(IPHONE_SAFARI)).toBe("ios");
    expect(bepaalPlatform(IPHONE_CHROME)).toBe("ios");
  });

  it("Instagram op de iPhone: eerst naar Safari", () => {
    expect(bepaalPlatform(IPHONE_INSTAGRAM)).toBe("ios-inapp");
  });

  it("iPad doet zich voor als Mac; het aanraakscherm verraadt hem", () => {
    expect(bepaalPlatform(IPAD, 5)).toBe("ios");
    expect(bepaalPlatform(MAC, 0)).toBe("anders");
  });

  it("Android", () => {
    expect(bepaalPlatform(ANDROID)).toBe("android");
  });
});

describe("draaitAlsApp", () => {
  const venster = (standalone: boolean | undefined, modus: string | null) => ({
    navigator: { standalone } as unknown as Navigator,
    matchMedia: (q: string) => ({ matches: modus !== null && q === `(display-mode: ${modus})` }) as MediaQueryList,
  });

  it("iOS meldt het via navigator.standalone", () => {
    expect(draaitAlsApp(venster(true, null))).toBe(true);
  });

  it("de rest via display-mode", () => {
    expect(draaitAlsApp(venster(undefined, "standalone"))).toBe(true);
    expect(draaitAlsApp(venster(false, "browser"))).toBe(false);
  });
});

describe("telBezoek", () => {
  it("telt één bezoek per browsersessie", () => {
    const lokaal = geheugen();
    const sessie = geheugen();
    expect(telBezoek(lokaal, sessie)).toBe(1);
    expect(telBezoek(lokaal, sessie)).toBe(1);
    expect(telBezoek(lokaal, geheugen())).toBe(2);
    expect(lokaal.getItem(OPSLAG_BEZOEKEN)).toBe("2");
  });

  it("rommel in de opslag telt als nul", () => {
    expect(telBezoek(geheugen({ [OPSLAG_BEZOEKEN]: "x" }), geheugen())).toBe(1);
  });
});

describe("hintMagTonen", () => {
  const NU = Date.parse("2026-10-19T12:00:00Z");
  const basis = {
    platform: "ios" as const,
    alsApp: false,
    kanInstalleren: false,
    bezoeken: 2,
    cookiesAkkoord: true,
    wegSinds: null,
    nu: NU,
  };

  it("iPhone, tweede bezoek, nog niet als app: ja", () => {
    expect(hintMagTonen(basis)).toBe(true);
  });

  it("niet bij het eerste bezoek en niet zolang de cookiebanner staat", () => {
    expect(hintMagTonen({ ...basis, bezoeken: 1 })).toBe(false);
    expect(hintMagTonen({ ...basis, cookiesAkkoord: false })).toBe(false);
  });

  it("niet als Koerspoule al als app draait", () => {
    expect(hintMagTonen({ ...basis, alsApp: true })).toBe(false);
  });

  it("weggeklikt: 60 dagen weg, daarna terug", () => {
    const dag = 86_400_000;
    expect(hintMagTonen({ ...basis, wegSinds: NU - 10 * dag })).toBe(false);
    expect(hintMagTonen({ ...basis, wegSinds: NU - (WEG_DAGEN + 1) * dag })).toBe(true);
  });

  it("Android alleen als Chrome de installatievraag aanbiedt", () => {
    expect(hintMagTonen({ ...basis, platform: "android" })).toBe(false);
    expect(hintMagTonen({ ...basis, platform: "android", kanInstalleren: true })).toBe(true);
  });

  it("Instagram-browser en desktop: geen strook (de uitleg staat in het menu)", () => {
    expect(hintMagTonen({ ...basis, platform: "ios-inapp" })).toBe(false);
    expect(hintMagTonen({ ...basis, platform: "anders" })).toBe(false);
  });
});

describe("leesWegSinds", () => {
  it("leest een tijdstip, negeert rommel", () => {
    expect(leesWegSinds(geheugen({ [OPSLAG_WEG]: "1760000000000" }))).toBe(1760000000000);
    expect(leesWegSinds(geheugen({ [OPSLAG_WEG]: "ja" }))).toBeNull();
    expect(leesWegSinds(geheugen())).toBeNull();
  });
});
