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
  { label: "Uitslagen",      icon: Flag,      to: "/uitslagen"    },
  { label: "Subpoule",       icon: Users,     to: "/mijn-peloton", tab: "subpoules" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { thema } = useThema();
  const tabParam = new URLSearchParams(search).get("tab");

  // Op de MijnPeloton-routes (/mijn-peloton + /karavaan) staat al een sticky
  // in-page tabbalk met dezelfde bestemmingen. Twee concurrerende mobiele
  // balken = dubbel; daarom hier de globale BottomNav verbergen.
  if (pathname.startsWith("/mijn-peloton") || pathname.startsWith("/karavaan")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Accent gradient rule — volgt thema */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />

      <div
        className="grid grid-cols-4 border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)]"
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
                <span className="absolute inset-x-2 inset-y-1.5 rounded-xl pointer-events-none bg-primary/10" />
              )}

              <Icon
                className={cn(
                  "h-[23px] w-[23px] shrink-0 transition-transform relative z-10 group-active:scale-90",
                  active && "scale-110",
                )}
                strokeWidth={active ? 2.5 : 1.75}
              />

              <span className={cn(
                "text-[10px] font-bold uppercase tracking-[0.08em] leading-none relative z-10 whitespace-nowrap",
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
