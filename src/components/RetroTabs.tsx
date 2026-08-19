import { useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useUitgelichtSubtab } from "@/components/Rondleiding";

// ─────────────────────────────────────────────────────────────────────────────
// RetroTabs — twee niveaus, twee gewichten. De rangorde moet uit de vorm
// blijken, niet uit de plek op de pagina.
//
// "dossard" (niveau 1) is het startbord: één perkament-balk met inkt-rand en
// harde offset-schaduw, waarin de rij als geheel telt. Alleen de gedragen tab
// krijgt kleur, de gouden leiderstruistreep en zijn twee speldjes — de rest is
// enkel tekst. Eerder had élke tab een eigen rand, en de actieve daarbovenop
// nog een rand met schaduw: drie kaders voor één rij.
//
// "segment" (niveau 2) laat alle omlijsting los en wordt typografie: labels op
// het papier met een glijdende streep eronder. Zwaar object boven, letters
// eronder. Bovendien groeit die rij mee met de tekst en scrollt hij horizontaal
// in plaats van vijf tabs even breed te persen — daar sneuvelden labels als
// "De Wielerdirecteur" op.
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
   * "dossard" — het rugnummerbord, voor de hoofdnavigatie.
   * "segment" — onderstreepte labels voor élk sub-niveau. Twee identiek zware
   * balken onder elkaar lezen als broers, terwijl de tweede een kind van de
   * eerste is; het verschil in gewicht maakt die rangorde zichtbaar.
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
  // Tijdens de rondleiding licht één subtabje op: dat tilt zichzelf boven de
  // donkere laag, de rest blijft eronder en wordt dus vanzelf donker.
  const uitgelichtSub = useUitgelichtSubtab();
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
        "relative flex",
        segment
          // Geen kader en geen vulling: alleen een haarlijn waar de labels op
          // staan. Scrollt horizontaal zodra de labels niet passen, zodat er
          // niets afgekapt wordt.
          ? "w-full items-end gap-6 overflow-x-auto border-b border-border pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "w-full items-stretch gap-1 rounded-xl border-2 border-foreground bg-card p-1 shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      {/* Glijdende markering. Bij het startbord is dat het gedragen rugnummer
          zelf (gevuld vlak met de gouden streep erop); bij de onderstreping een
          streep van 2px op de haarlijn. */}
      {ind && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute",
            segment
              ? "bottom-[-1px] h-0.5 rounded-full bg-primary"
              : "top-1 overflow-hidden rounded-lg bg-primary",
            // De indicator is een eigen laag naast de knoppen; zonder deze
            // regel bleef de actieve tab tijdens de rondleiding fel oplichten
            // terwijl de knop erboven al gedoofd was.
            uitgelichteKey != null && uitgelichteKey !== active && "opacity-30",
          )}
          style={{
            height: segment ? undefined : "calc(100% - 0.5rem)",
            width: ind.w,
            transform: `translateX(${ind.x}px)`,
            transition: !animate || reduce ? "none" : "transform 200ms ease, width 200ms ease",
          }}
        >
          {/* Leiderstrui-streep: schuift mee met het rugnummer. */}
          {!segment && (
            <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-[hsl(var(--vintage-gold))]" />
          )}
        </span>
      )}

      {tabs.map((t) => {
        const on = t.key === active;
        const uitgelicht = uitgelichteKey != null && t.key === uitgelichteKey;
        const gedoofd = uitgelichteKey != null && !uitgelicht;
        const subUitgelicht = segment && uitgelichtSub != null && t.key === uitgelichtSub;
        return (
          <button
            key={t.key}
            ref={(el) => {
              btnRefs.current[t.key] = el;
            }}
            role="tab"
            // De rondleiding licht dit vlak op; alleen zinvol op het niveau
            // waar zij naartoe navigeert.
            data-rondleiding-doel={uitgelichteKey !== undefined ? t.key : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            type="button"
            disabled={t.disabled}
            title={t.title}
            onClick={() => !t.disabled && onChange(t.key)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              segment
                ? cn(
                    // Eigen breedte en geen afkapping: liever scrollen dan een
                    // label halveren.
                    "shrink-0 whitespace-nowrap pb-2.5 text-[13px]",
                    on ? "font-bold text-foreground" : "font-semibold text-muted-foreground hover:text-foreground",
                  )
                : cn(
                    "min-w-0 flex-1 justify-center rounded-lg border-0 px-3 min-h-[42px] text-xs font-display font-semibold uppercase tracking-wider",
                    on
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  ),
              t.disabled && "cursor-not-allowed opacity-40",
              gedoofd && "opacity-30",
              uitgelicht && "ring-2 ring-primary ring-offset-1 ring-offset-card",
              // z-[71] gaat net boven de verduistering van de rondleiding.
              subUitgelicht && "z-[71] rounded-md bg-card px-2 ring-2 ring-[hsl(var(--vintage-gold))]",
            )}
          >
            {/* Speldjes zitten alleen op het gedragen rugnummer — dat is het
                enige dat werkelijk opgespeld is. Tien identieke stipjes over
                vijf tabs zeiden niets. */}
            {!segment && on && <>
              <span aria-hidden className="absolute left-2 top-1.5 h-1 w-1 rounded-full bg-primary-foreground/55" />
              <span aria-hidden className="absolute right-2 top-1.5 h-1 w-1 rounded-full bg-primary-foreground/55" />
            </>}
            <t.Icon className="h-3.5 w-3.5 shrink-0" />
            <span className={segment ? undefined : "truncate"}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
