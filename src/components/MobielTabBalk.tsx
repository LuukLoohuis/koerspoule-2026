/**
 * MobielTabBalk — mobile-only shared tab component.
 * Pill layout (≤3 tabs) or scrollable chips (4+ tabs).
 * Must be wrapped in md:hidden by the parent; desktop uses its own tab bar.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type MobielTab = {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type Props = {
  tabs: MobielTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

// Actieve tab volgt het thema (geel = TdF, rood = Vuelta, roze = Giro) via de
// CSS-tokens; BG/rand/inactief blijven warm-neutraal (perkament) over thema's heen.
const ACTIVE_BG = "hsl(var(--primary))";
const ACTIVE_FG = "hsl(var(--primary-foreground))";
const BG   = "#EDE8DF";
const BORDER = "#C8B89A";
const INACTIVE = "#7A6A5A";

export function MobielTabBalk({ tabs, active, onChange, className }: Props) {
  const isPill = tabs.length <= 3;
  const activeRef  = useRef<HTMLButtonElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  // Auto-center active chip in scrollable bar
  useEffect(() => {
    if (isPill) return;
    const el  = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [active, isPill]);

  /* ── Pill (≤3 tabs) ─────────────────────────────────────────── */
  if (isPill) {
    return (
      <div
        className={cn("flex w-full rounded-[8px] p-[3px] gap-[3px]", className)}
        style={{ background: BG, border: `1px solid ${BORDER}` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              aria-current={isActive ? "page" : undefined}
              onClick={() => !tab.disabled && onChange(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-[6px]",
                "min-h-[44px] px-3 transition-all duration-200",
                "text-[12px] font-display font-bold uppercase tracking-[0.04em] whitespace-nowrap",
                isActive  ? "shadow-sm" : "hover:bg-black/5",
                tab.disabled && "opacity-40 cursor-not-allowed",
              )}
              style={{
                background: isActive ? ACTIVE_BG : "transparent",
                color: isActive ? ACTIVE_FG : INACTIVE,
              }}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ── Scrollable chips (4+ tabs) ─────────────────────────────── */
  return (
    <div
      className={cn("relative w-full", className)}
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
      }}
    >
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "8px",
          padding: "3px 12px",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={isActive ? activeRef : undefined}
              type="button"
              disabled={tab.disabled}
              aria-current={isActive ? "page" : undefined}
              onClick={() => !tab.disabled && onChange(tab.key)}
              className={cn(
                "flex items-center gap-1.5 flex-none rounded-[6px]",
                "min-h-[44px] px-4 transition-all duration-200",
                "text-[12px] font-display font-bold uppercase tracking-[0.04em] whitespace-nowrap",
                isActive  ? "shadow-sm" : "hover:bg-black/5",
                tab.disabled && "opacity-40 cursor-not-allowed",
              )}
              style={{
                background: isActive ? ACTIVE_BG : "transparent",
                color: isActive ? ACTIVE_FG : INACTIVE,
              }}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
