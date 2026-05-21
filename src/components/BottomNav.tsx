import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Flag, Users, Bike } from "lucide-react";
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
  { label: "Gazetta",        icon: Newspaper, to: "/karavaan"     },
  { label: "Results",        icon: Flag,      to: "/uitslagen"    },
  { label: "Peloton",        icon: Users,     to: "/mijn-peloton" },
  { label: "Hors Catégorie", labelXs: "Hors Cat.", icon: Bike, to: "/mijn-peloton", tab: "hors" },
];

export default function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const tabParam = new URLSearchParams(search).get("tab");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Giro gradient rule */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#E8336D] to-transparent" />

      <div
        className="grid grid-cols-4 border-t border-border/60"
        style={{ background: "#FAF7F2" }}
      >
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
                "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[52px]",
                "transition-colors relative select-none",
                active ? "text-[#E8336D]" : "text-[#9A8A7A] hover:text-[#1a1a1a]",
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Active pill background */}
              {active && (
                <span
                  className="absolute inset-x-2 inset-y-1.5 rounded-xl pointer-events-none"
                  style={{ background: "rgba(232,51,109,0.10)" }}
                />
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
                    <span className="[@media(max-width:360px)]:hidden">{label}</span>
                    <span className="hidden [@media(max-width:360px)]:inline">{labelXs}</span>
                  </>
                ) : (
                  label
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
