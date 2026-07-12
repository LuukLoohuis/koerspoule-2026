/**
 * i18n — tweetalige deelnemer-app (nl/en) via react-i18next.
 *
 * SSR/hydration-strategie: de geprerenderde marketing-routes zijn in het
 * Nederlands gebakken. Daarom initialiseert i18next ALTIJD op "nl" (lng
 * hard gezet — de detector detecteert dan niet bij init) zodat de eerste
 * client-render byte-voor-byte overeenkomt met de server-HTML. Ná mount roept
 * <App> applyStoredLanguage() aan, die de opgeslagen voorkeur (of de
 * browsertaal) alsnog activeert. De LanguageDetector blijft geconfigureerd
 * zodat i18next.changeLanguage de keuze in localStorage cachet
 * ("koerspoule_lang").
 *
 * Admin (src/components/admin/, AdminV3) en AI-teksten blijven Nederlands en
 * lopen bewust NIET via t().
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import nl from "./locales/nl.json";
import en from "./locales/en.json";

export const LANG_STORAGE_KEY = "koerspoule_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
    },
    // Hard op nl: eerste render = server-HTML (geen hydration-mismatch).
    lng: "nl",
    fallbackLng: "nl",
    supportedLngs: ["nl", "en"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

// <html lang> volgt de actieve taal (a11y/SEO).
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

/**
 * Ná mount aanroepen (useEffect in App): activeer de opgeslagen voorkeur of
 * val terug op de browsertaal. No-op wanneer dat al nl is.
 */
export function applyStoredLanguage(): void {
  try {
    // ?lang=en/nl heeft voorrang (bv. vanaf de Engelse SEO-landingspagina) en
    // wordt meteen als voorkeur bewaard. Anders localStorage, dan browsertaal.
    const qp = new URLSearchParams(window.location.search).get("lang");
    const fromQuery = qp === "en" || qp === "nl" ? qp : null;
    if (fromQuery) {
      window.localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      if (fromQuery !== i18n.language) void i18n.changeLanguage(fromQuery);
      return;
    }
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    const preferred =
      stored === "en" || stored === "nl"
        ? stored
        : navigator.language?.toLowerCase().startsWith("en")
          ? "en"
          : "nl";
    if (preferred !== i18n.language) void i18n.changeLanguage(preferred);
  } catch {
    /* localStorage geblokkeerd → nl blijven */
  }
}

export default i18n;
