import { useLocation, useNavigate } from "react-router-dom";
import { Home, Flag, Users, Bike } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  labelXs?: string;
  icon: LucideIcon;
  to: string;
  tab?: string;
};

const NAV: NavItem[] = [
  { label: "Home",           icon: Home,  to: "/"             },
  { label: "Results",        icon: Flag,  to: "/uitslagen"    },
  { label: "Peloton",        icon: Users, to: "/mijn-peloton" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const tabParam = new URLSearchParams(search).get("tab");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Giro gradient rule */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="grid grid-cols-4 bg-card border-t border-border/60">
        {NAV.map(({ label, labelXs, icon: Icon, to, tab }) => {
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
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full bg-primary" />
              )}
              <Icon
                className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] leading-none font-bold">
                <span className="[@media(max-width:380px)]:hidden">{label}</span>
                {labelXs && (
                  <span className="hidden [@media(max-width:380px)]:inline">{labelXs}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
