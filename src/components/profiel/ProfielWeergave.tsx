/**
 * ProfielWeergave — de opmaak van /profiel, los van waar de data vandaan
 * komt: kop van de pagina, de rennerslicentie, en twee tabs. "Palmares" is de
 * bestaande erelijst (PalmaresPanel), "Oude spellen" het archief waarin je
 * per afgeronde koers je uitslag laadt.
 */
import type { ReactNode } from "react";
import { Archive, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RetroTabs } from "@/components/RetroTabs";
import ProfielKop, { type ProfielKopProps } from "@/components/profiel/ProfielKop";

export type ProfielTab = "palmares" | "oude-spellen";

type Props = {
  kop: ProfielKopProps;
  tab: ProfielTab;
  onTab: (tab: ProfielTab) => void;
  palmares: ReactNode;
  oudeSpellen: ReactNode;
};

export default function ProfielWeergave({ kop, tab, onTab, palmares, oudeSpellen }: Props) {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto max-w-6xl px-5 pb-8 pt-4 md:py-6">
      <div className="relative mb-4 flex flex-col items-center gap-1 text-center md:mb-6 md:gap-2">
        <span className="overline-stamp">{t("profiel.overline")}</span>
        <h1 className="heading-oswald text-3xl md:text-5xl">{t("profiel.titel")}</h1>
        <div className="double-rule mx-auto mt-1 w-full max-w-md md:mt-2" />
        {/* Rechtsboven op desktop: een stille regel in de letter van de
            overline, zoals de datum in de kop van Mijn Peloton. */}
        <div className="absolute right-0 top-0 hidden md:block" aria-hidden="true">
          <span className="overline-stamp block border-b border-current/25 pb-1 text-[10px] leading-none">
            {t("profiel.carnet", { jaar: new Date().getFullYear() })}
          </span>
        </div>
      </div>

      <ProfielKop {...kop} className="mx-auto mb-5 max-w-3xl md:mb-7" />

      <RetroTabs
        className="mx-auto mb-5 max-w-3xl md:mb-7"
        aria-label={t("profiel.tabsAria")}
        active={tab}
        onChange={(k) => onTab(k as ProfielTab)}
        tabs={[
          { key: "palmares", label: t("profiel.tabs.palmares"), Icon: Trophy },
          { key: "oude-spellen", label: t("profiel.tabs.oudeSpellen"), Icon: Archive },
        ]}
      />

      <div role="tabpanel">{tab === "palmares" ? palmares : oudeSpellen}</div>
    </div>
  );
}
