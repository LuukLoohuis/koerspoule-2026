import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Flag, Users, Bike, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useThema } from "@/contexts/ThemaContext";
import { useUitgelichteNav } from "@/components/Rondleiding";

type NavItem = {
  label: string;
  labelKey?: string; // i18n-sleutel; wint van label wanneer gezet
  labelXs?: string;
  labelXsKey?: string;
  icon: LucideIcon;
  to: string;
  tab?: string;
  /** Sleutel waarop de rondleiding deze tab uitlicht. */
  navKey: string;
};

const NAV: NavItem[] = [
  { label: "Krant",          icon: Newspaper, to: "/karavaan", navKey: "karavaan" },
  { label: "Volgwagen",      icon: Car,       to: "/mijn-peloton", tab: "team", navKey: "team" },
  { label: "Subpoule",       icon: Users,     to: "/mijn-peloton", tab: "subpoules", navKey: "subpoules" },
  { label: "Uitslagen",      labelKey: "nav.results", labelXsKey: "nav.resultsShort", icon: Flag, to: "/uitslagen", navKey: "uitslagen" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors", navKey: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { thema } = useThema();
  const { t } = useTranslation();
  const tabParam = new URLSearchParams(search).get("tab");

  const isMijnPeloton = pathname.startsWith("/mijn-peloton");
  // Loopt er een rondleiding? Dan licht de besproken tab op boven het waas.
  const uitgelicht = useUitgelichteNav();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label={t("shell.bottomNav.aria")}>
      {/* Accent gradient rule — volgt thema */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />

      <div
        className="grid grid-cols-5 border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map(({ label, labelKey, labelXs, labelXsKey, icon: Icon, to, tab, navKey }) => {
          // Vaste naam: de wegwijzer moet niet per koers veranderen. De
          // koersnaam (Marca, Gazzetta, L'Equipe) staat als masthead op de
          // pagina zelf.
          const shownLabel = labelKey ? t(labelKey) : label;
          const shownLabelXs = labelXsKey ? t(labelXsKey) : labelXs;
          let active = false;
          if (tab === "team") {
            // Volgwagen = /mijn-peloton zonder tab-param of met tab=team
            active = isMijnPeloton && (tabParam === null || tabParam === "team");
          } else if (tab) {
            active = isMijnPeloton && tabParam === tab;
          } else if (to === "/") {
            active = pathname === "/";
          } else {
            active = pathname.startsWith(to);
          }

          return (
            <button
              key={label}
              // De rondleiding zoekt het op te lichten vlak hiermee op.
              data-rondleiding-doel={navKey}
              onClick={() => navigate(tab ? `${to}?tab=${tab}` : to)}
              className={cn(
                "group flex flex-col items-center justify-center gap-1 py-2 min-h-[58px]",
                "transition-transform active:scale-95 relative select-none",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                // Tijdens de rondleiding: alleen de besproken tab blijft fel.
                uitgelicht !== null && uitgelicht !== navKey && "opacity-30",
                uitgelicht === navKey && "text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Rondleiding wijst deze tab aan */}
              {uitgelicht === navKey && (
                <span className="absolute inset-x-0.5 inset-y-0.5 rounded-xl ring-2 ring-primary bg-primary/15 pointer-events-none animate-pulse motion-reduce:animate-none" />
              )}

              {/* Active marker — gouden stempelstreep bovenaan */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-b-full bg-[hsl(var(--vintage-gold))] pointer-events-none" />
              )}

              {/* Active pill background */}
              {active && (
                <span className="absolute inset-x-1 inset-y-1.5 rounded-xl pointer-events-none bg-primary/10" />
              )}

              <Icon
                className={cn(
                  "h-[22px] w-[22px] shrink-0 transition-transform relative z-10 group-active:scale-90",
                  active && "scale-110",
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />

              <span className={cn(
                "text-[10px] font-bold uppercase tracking-[0.06em] leading-none relative z-10 whitespace-nowrap",
                active && "text-primary",
              )}>
                {shownLabelXs ? (
                  <>
                    <span className="[@media(max-width:480px)]:hidden">{shownLabel}</span>
                    <span className="hidden [@media(max-width:480px)]:inline">{shownLabelXs}</span>
                  </>
                ) : (
                  shownLabel
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
