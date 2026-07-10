/**
 * <FloatingTabSwitcher> — één consistente zwevende tab-schakelaar (mobiel-only).
 *
 *  - 3+ tabs → rond perkament-bolletje rechtsonder dat een retro "Ga naar"-menu
 *    opent (Radix DropdownMenu, modal=false → geen iOS-scroll-lock).
 *  - 2 tabs → tweedelig pill-toggle; één tik op het inactieve segment wisselt.
 *
 *  Na wisselen scrollt de pagina naar boven (dubbele rAF, reduced-motion-safe).
 *  Zelfde retro-chrome als de subpoule "Spring naar"; die blijft apart bestaan.
 */
import { useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListTree, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FloatingTab = { key: string; label: string; icon?: ComponentType<{ className?: string }> };

/** Scroll naar boven ná een tab-wissel (nieuwe tab vanaf de top). */
function scrollTopAfterChange(): void {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })),
  );
}

export default function FloatingTabSwitcher({
  tabs,
  active,
  onChange,
  offsetClassName = "bottom-[72px]",
}: {
  tabs: FloatingTab[];
  active: string;
  onChange: (key: string) => void;
  /** Verticale positie (Tailwind bottom-*). Default net boven de BottomNav;
   *  override bv. naar "bottom-[136px]" als er nóg een zweefknop onder staat. */
  offsetClassName?: string;
}) {
  const { t: translate } = useTranslation();
  const [open, setOpen] = useState(false);
  const select = (key: string) => {
    onChange(key);
    scrollTopAfterChange();
  };

  // ── 2 tabs → tweedelig pill-toggle ──
  if (tabs.length === 2) {
    return (
      <div className={cn("md:hidden fixed right-4 z-40 inline-flex rounded-full border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))] overflow-hidden", offsetClassName)}>
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => { if (!isActive) select(t.key); }}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon && <t.icon className="h-4 w-4 shrink-0" />}
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── 3+ tabs → rond bolletje + "Ga naar"-menu ──
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={translate("shell.tabSwitcher.goToAria")}
          className={cn("md:hidden fixed right-4 z-40 inline-flex items-center justify-center h-12 w-12 rounded-full bg-card text-foreground border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all", offsetClassName)}
        >
          <ListTree className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-56 p-0 rounded-xl overflow-hidden border-2 border-foreground bg-card shadow-[4px_4px_0_hsl(var(--foreground))]"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-foreground bg-[hsl(var(--vintage-gold))] text-foreground font-mono uppercase tracking-[0.2em] text-[10px] font-bold">
          <ArrowUpDown className="h-3.5 w-3.5" />
          {translate("shell.tabSwitcher.goToHeading")}
        </div>
        <div className="p-1">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <DropdownMenuItem
                key={t.key}
                onSelect={(e) => { e.preventDefault(); setOpen(false); select(t.key); }}
                className={cn(
                  "font-mono text-[13px] rounded-lg py-2.5 px-2.5 gap-2.5 cursor-pointer border-l-[3px] border-transparent focus:bg-secondary/60 hover:bg-secondary/60",
                  isActive && "border-primary bg-primary/10",
                )}
              >
                {t.icon && <t.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-[hsl(var(--vintage-gold))]")} />}
                {t.label}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
