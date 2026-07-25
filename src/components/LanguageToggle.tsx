/**
 * <LanguageToggle> — compacte NL/EN-schakelaar in de masthead (retro-stijl).
 *
 * i18n.changeLanguage schrijft de keuze via de LanguageDetector-cache naar
 * localStorage ("koerspoule_lang"); document.documentElement.lang volgt via de
 * languageChanged-listener in src/i18n. Zichtbaar op mobiel én desktop.
 */
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const LANGS = ["nl", "en"] as const;
const TOUR_FEMMES_NL = "/tour-de-france-femmes-poule-2026";
const TOUR_FEMMES_EN = "/en/tour-de-france-femmes-fantasy-2026";

export default function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const active = i18n.language?.startsWith("en") ? "en" : "nl";

  const selectLanguage = (lng: (typeof LANGS)[number]) => {
    void i18n.changeLanguage(lng);

    if (location.pathname === TOUR_FEMMES_NL && lng === "en") {
      navigate(TOUR_FEMMES_EN);
    } else if (location.pathname === TOUR_FEMMES_EN && lng === "nl") {
      navigate(TOUR_FEMMES_NL);
    }
  };

  return (
    <div
      role="group"
      aria-label={t("shell.languageToggle")}
      className={cn(
        "inline-flex items-center h-9 rounded-lg border border-foreground/30 overflow-hidden",
        className,
      )}
    >
      {LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => selectLanguage(lng)}
          aria-pressed={active === lng}
          className={cn(
            "px-2 h-full font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
            active === lng
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:bg-secondary",
          )}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
