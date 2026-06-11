import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Flag, Users, Bike, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThema } from "@/contexts/ThemaContext";

type NavItem = {
  label: string;
  labelXs?: string;
  icon: LucideIcon;
  to: string;
  tab?: string;
  krant?: boolean; // label volgt thema.krant
};

const NAV: NavItem[] = [
  { label: "Gazetta",        icon: Newspaper, to: "/karavaan", krant: true },
  { label: "Volgwagen",      icon: Car,       to: "/mijn-peloton", tab: "team" },
  { label: "Subpoule",       icon: Users,     to: "/mijn-peloton", tab: "subpoules" },
  { label: "Uitslagen",      labelXs: "Uitslag.", icon: Flag, to: "/uitslagen" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { thema } = useThema();
  const tabParam = new URLSearchParams(search).get("tab");

  const isMijnPeloton = pathname.startsWith("/mijn-peloton");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Accent gradient rule — volgt thema */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />

      <div
        className="grid grid-cols-5 border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map(({ label, labelXs, icon: Icon, to, tab, krant }) => {
          const shownLabel = krant ? thema.krant : label;
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
              onClick={() => navigate(tab ? `${to}?tab=${tab}` : to)}
              className={cn(
                "group flex flex-col items-center justify-center gap-1 py-2 min-h-[58px]",
                "transition-transform active:scale-95 relative select-none",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
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
                {labelXs ? (
                  <>
                    <span className="[@media(max-width:480px)]:hidden">{shownLabel}</span>
                    <span className="hidden [@media(max-width:480px)]:inline">{labelXs}</span>
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
