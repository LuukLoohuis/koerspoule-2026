import { useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// RetroTabs — één retro DESKTOP-tabbalk in dossard/rugnummer-stijl.
//
// Perkament-balk met inkt-border + harde offset-shadow. Elke tab is een
// dossard-plaatje (label + icoon + twee "speld"-puntjes, GEEN cijfer). De actieve
// tab is de "gele trui": een glijdende gouden indicator schuift eronder.
//
// Controlled component (active + onChange) zodat hij werkt bovenop zowel Radix
// <Tabs value> (content-switch blijft via de Tabs-root) als eigen useState-tabs.
// ui/tabs.tsx blijft ongemoeid → generieke Tabs elders houden hun default-look.
//
// Toegankelijk: role=tablist/tab, roving tabindex, pijltjes/Home/End-navigatie,
// focus-ring. prefers-reduced-motion → indicator springt direct.
// ─────────────────────────────────────────────────────────────────────────────

export type RetroTab = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  title?: string;
};

export function RetroTabs({
  tabs,
  active,
  onChange,
  className,
  variant = "dossard",
  uitgelichteKey,
  "aria-label": ariaLabel,
}: {
  tabs: readonly RetroTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  /**
   * "dossard" — de zware rugnummer-balk, voor de hoofdnavigatie.
   * "segment" — lichte segmented control voor een sub-niveau. Twee identiek
   * zware balken onder elkaar lezen als broers, terwijl de tweede een kind van
   * de eerste is; het lichtere gewicht maakt die rangorde zichtbaar.
   */
  variant?: "dossard" | "segment";
  /**
   * Tijdens de rondleiding: de tab die besproken wordt. Die blijft fel, de rest
   * dooft, zodat je ziet waar het over gaat. Niet gezet = geen rondleiding.
   */
  uitgelichteKey?: string | null;
  "aria-label"?: string;
}) {
  const segment = variant === "segment";
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[active];
      if (!el) {
        setInd(null);
        return;
      }
      setInd({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    // Animeer pas vanaf de tweede meting → geen sprong bij eerste render.
    const raf = requestAnimationFrame(() => setAnimate(true));
    const list = listRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && list) {
      ro.observe(list);
      Object.values(btnRefs.current).forEach((b) => b && ro.observe(b));
    }
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [active, tabs]);

  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const order = tabs.filter((t) => !t.disabled).map((t) => t.key);
    if (order.length === 0) return;
    const idx = Math.max(0, order.indexOf(active));
    let next: string | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = order[(idx + 1) % order.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = order[(idx - 1 + order.length) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    else return;
    e.preventDefault();
    onChange(next);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-stretch rounded-xl",
        segment
          // w-fit, niet w-auto: een display:flex div blijft block-level en zou
          // anders over de volle breedte uitrekken.
          ? "w-fit gap-0.5 self-start bg-foreground/[0.06] p-1"
          : "w-full gap-1.5 border-2 border-foreground bg-card p-1.5 shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      {/* Glijdende gouden indicator (de "gele trui") onder de actieve tab. */}
      {ind && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 rounded-lg",
            segment
              ? "top-1 bg-card shadow-sm"
              : "top-1.5 bg-primary shadow-[2px_2px_0_hsl(var(--foreground))]",
            // De indicator is een eigen laag naast de knoppen; zonder deze
            // regel bleef de actieve tab tijdens de rondleiding fel oplichten
            // terwijl de knop erboven al gedoofd was.
            uitgelichteKey != null && uitgelichteKey !== active && "opacity-30",
          )}
          style={{
            height: segment ? "calc(100% - 0.5rem)" : "calc(100% - 0.75rem)",
            width: ind.w,
            transform: `translateX(${ind.x}px)`,
            transition: !animate || reduce ? "none" : "transform 200ms ease, width 200ms ease",
          }}
        />
      )}

      {tabs.map((t) => {
        const on = t.key === active;
        const uitgelicht = uitgelichteKey != null && t.key === uitgelichteKey;
        const gedoofd = uitgelichteKey != null && !uitgelicht;
        return (
          <button
            key={t.key}
            ref={(el) => {
              btnRefs.current[t.key] = el;
            }}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            type="button"
            disabled={t.disabled}
            title={t.title}
            onClick={() => !t.disabled && onChange(t.key)}
            className={cn(
              "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-lg transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              segment
                ? cn(
                    "px-3.5 min-h-[38px] text-xs font-semibold",
                    on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                : cn(
                    "flex-1 border-2 px-3 min-h-[44px] text-xs font-display font-semibold uppercase tracking-wider",
                    on
                      ? "-translate-y-0.5 border-foreground text-primary-foreground"
                      : "border-foreground/15 bg-foreground/[0.015] text-muted-foreground hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground",
                  ),
              t.disabled && "cursor-not-allowed opacity-40",
              gedoofd && "opacity-30",
              uitgelicht && "ring-2 ring-primary ring-offset-1 ring-offset-card",
            )}
          >
            {/* Speld-puntjes horen bij het rugnummer; een segment heeft ze niet. */}
            {!segment && <>
              <span aria-hidden className={cn("absolute left-2 top-1.5 h-1 w-1 rounded-full", on ? "bg-primary-foreground/60" : "bg-foreground/25")} />
              <span aria-hidden className={cn("absolute right-2 top-1.5 h-1 w-1 rounded-full", on ? "bg-primary-foreground/60" : "bg-foreground/25")} />
            </>}
            <t.Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
