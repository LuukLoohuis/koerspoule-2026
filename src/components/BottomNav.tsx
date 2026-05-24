import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Flag, Users, Bike } from "lucide-react";
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
  { label: "Results",        icon: Flag,      to: "/uitslagen"    },
  { label: "Peloton",        icon: Users,     to: "/mijn-peloton" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { thema } = useThema();
  const tabParam = new URLSearchParams(search).get("tab");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Accent gradient rule — volgt thema */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />

      <div
        className="grid grid-cols-4 border-t border-border/60 bg-card"
      >
        {NAV.map(({ label, labelXs, icon: Icon, to, tab, krant }) => {
          const shownLabel = krant ? thema.krant : label;
          const active = tab
            ? pathname === to && tabParam === tab
            : to === "/"
              ? pathname === "/"
              : pathname.startsWith(to) && !(to === "/mijn-peloton" && tabParam === "hors");

          return (
            <button
              key={label}
              onClick={() => navigate(tab ? `${to}?tab=${tab}` : to)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[52px]",
                "transition-colors relative select-none",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Active pill background */}
              {active && (
                <span className="absolute inset-x-2 inset-y-1.5 rounded-xl pointer-events-none bg-primary/10" />
              )}

              <Icon
                className={cn(
                  "h-[22px] w-[22px] shrink-0 transition-transform relative z-10",
                  active && "scale-110",
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />

              <span className="text-[10px] font-bold uppercase tracking-[0.08em] leading-none relative z-10 whitespace-nowrap">
                {labelXs ? (
                  <>
                    <span className="[@media(max-width:360px)]:hidden">{shownLabel}</span>
                    <span className="hidden [@media(max-width:360px)]:inline">{labelXs}</span>
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
