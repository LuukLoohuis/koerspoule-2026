/**
 * useBeginscherm — gedeelde stand voor "Koerspoule als app": de hint boven de
 * onderbalk, het menu-item en het uitlegpaneel lezen en zetten hier hetzelfde.
 *
 * Toestel en opslag worden pas na mount gelezen: de prerender kent geen
 * window, en de eerste client-render moet gelijk zijn aan de server-HTML.
 *
 * `beforeinstallprompt` (Chrome op Android) vuurt vlak na het laden, vaak nog
 * voor er een component staat. Daarom luistert deze module zelf, bij import.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  bepaalPlatform,
  draaitAlsApp,
  hintMagTonen,
  leesWegSinds,
  COOKIES_AKKOORD_EVENT,
  OPSLAG_COOKIES,
  OPSLAG_WEG,
  type Platform,
} from "@/lib/beginscherm";
import { captureEvent } from "@/lib/posthog";

type InstallVraag = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Stand = {
  paneelOpen: boolean;
  vraag: InstallVraag | null;
  hintWeg: boolean;
  /** Cookiebanner in dit bezoek weggeklikt (na het laden). */
  cookiesNet: boolean;
};

const BEGIN: Stand = { paneelOpen: false, vraag: null, hintWeg: false, cookiesNet: false };
let stand = BEGIN;
const luisteraars = new Set<() => void>();

function zet(deel: Partial<Stand>) {
  stand = { ...stand, ...deel };
  luisteraars.forEach((fn) => fn());
}

function abonneer(fn: () => void) {
  luisteraars.add(fn);
  return () => { luisteraars.delete(fn); };
}

function onthoudWeg() {
  try { localStorage.setItem(OPSLAG_WEG, String(Date.now())); } catch { /* geen opslag */ }
  zet({ hintWeg: true });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Geen eigen balkje van Chrome: de vraag komt via onze hint of het menu.
    e.preventDefault();
    zet({ vraag: e as InstallVraag });
  });
  window.addEventListener("appinstalled", () => {
    zet({ vraag: null });
    onthoudWeg();
    captureEvent("beginscherm_geinstalleerd");
  });
  // Eerste bezoek: de hint wacht op de cookiebanner en komt zodra die weg is.
  window.addEventListener(COOKIES_AKKOORD_EVENT, () => zet({ cookiesNet: true }));
}

type Omgeving = {
  platform: Platform;
  alsApp: boolean;
  cookiesAkkoord: boolean;
  wegSinds: number | null;
};

// Eén keer per paginalading, gedeeld door alle componenten.
let omgeving: Omgeving | null = null;

function leesOmgeving(): Omgeving {
  if (omgeving) return omgeving;
  // Alleen in dev: ?beginscherm=ios (of ios-inapp, android) laat de hint zien
  // zonder iPhone of cookiebanner.
  const proef = import.meta.env.DEV ? new URLSearchParams(location.search).get("beginscherm") : null;
  if (proef === "ios" || proef === "ios-inapp" || proef === "android") {
    omgeving = { platform: proef, alsApp: false, cookiesAkkoord: true, wegSinds: null };
    return omgeving;
  }
  const platform = bepaalPlatform(navigator.userAgent, navigator.maxTouchPoints);
  const alsApp = draaitAlsApp(window);
  let cookiesAkkoord = false;
  let wegSinds: number | null = null;
  try {
    cookiesAkkoord = Boolean(localStorage.getItem(OPSLAG_COOKIES));
    wegSinds = leesWegSinds(localStorage);
  } catch { /* geen opslag: dan ook geen hint */ }
  omgeving = { platform, alsApp, cookiesAkkoord, wegSinds };
  if (alsApp) captureEvent("beginscherm_app_geopend", { platform });
  return omgeving;
}

export type Bron = "hint" | "menu";

async function installeer(vraag: InstallVraag, bron: Bron) {
  zet({ vraag: null }); // één vraag per keer; Chrome stuurt een nieuwe als het mag
  await vraag.prompt();
  const { outcome } = await vraag.userChoice;
  captureEvent("beginscherm_installatievraag", { bron, outcome });
  onthoudWeg();
}

export function useBeginscherm() {
  const s = useSyncExternalStore(abonneer, () => stand, () => BEGIN);
  const [omg, setOmg] = useState<Omgeving | null>(null);
  useEffect(() => setOmg(leesOmgeving()), []);

  const platform = omg?.platform ?? "anders";
  const alsApp = omg?.alsApp ?? false;
  const kanInstalleren = s.vraag !== null;

  const hintZichtbaar =
    omg !== null &&
    !s.hintWeg &&
    hintMagTonen({
      ...omg,
      cookiesAkkoord: omg.cookiesAkkoord || s.cookiesNet,
      kanInstalleren,
      nu: Date.now(),
    });

  return {
    platform,
    /** Menu-item tonen: mobiel en nog niet als app. */
    beschikbaar: omg !== null && !alsApp && platform !== "anders",
    kanInstalleren,
    hintZichtbaar,
    paneelOpen: s.paneelOpen,
    /** Android met de vraag van Chrome installeert meteen; de rest krijgt uitleg. */
    open(bron: Bron) {
      if (s.vraag) {
        void installeer(s.vraag, bron);
        return;
      }
      captureEvent("beginscherm_uitleg_geopend", { bron, platform });
      onthoudWeg(); // wie de uitleg zag, hoeft de strook niet meer
      zet({ paneelOpen: true });
    },
    sluit() {
      zet({ paneelOpen: false });
    },
    verbergHint() {
      captureEvent("beginscherm_hint_weggeklikt", { platform });
      onthoudWeg();
    },
  };
}
