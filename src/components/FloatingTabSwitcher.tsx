/**
 * <FloatingTabSwitcher> — één consistente zwevende tab-schakelaar (mobiel-only).
 *
 *  Alleen de 2-tab-variant: een tweedelig pill-toggle waarbij één tik op het
 *  inactieve segment wisselt. Bij meer tabs rendert hij niets — daarvoor was er
 *  een "Ga naar"-bolletje, maar die schermen hebben al een tabbalk, stippen en
 *  een veegbeweging.
 *
 *  Na wisselen scrollt de pagina naar boven (dubbele rAF, reduced-motion-safe).
 */
import type { ComponentType } from "react";
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

  // 3+ tabs hadden hier een rond "Ga naar"-bolletje. Dat is eruit: die
  // schermen hebben al een tabbalk bovenaan, stippen en een veegbeweging, en
  // een vierde manier om hetzelfde te doen was op een telefoon te veel.
  return null;
}
