import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type SubTab = {
  key: string;
  /** Volledige naam; alleen als toegankelijke naam gebruikt. */
  label: string;
  /** Korte naam die op een telefoon naast vier andere past. */
  kort?: string;
  icon?: ComponentType<{ className?: string }>;
};

/**
 * Subtabbalk voor mobiel: alle onderdelen naast elkaar, zonder horizontaal
 * scrollen.
 *
 * De vorige balk was een scrollende rij. Daardoor stonden er altijd onderdelen
 * buiten beeld en moest een veeghint uitleggen dat er meer was -- een hint die
 * nodig is om de vorm te redden, wijst erop dat de vorm niet klopt.
 *
 * Vijf gelijke kolommen op 375 px geeft 75 px per tab. Dat past alleen met
 * korte namen, dus die staan apart in i18n (`kort`); de volledige naam blijft
 * op desktop staan en dient hier als aria-label.
 *
 * Vegen tussen de panelen blijft bestaan; deze balk laat zien waar je bent en
 * laat je direct springen.
 */
export default function SubTabRaster({
  tabs,
  active,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  tabs: SubTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("grid w-full border-b border-border", className)}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map(({ key, label, kort, icon: Icon }) => {
        const isActief = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActief}
            aria-label={label}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex min-h-[52px] flex-col items-center justify-center gap-1 px-0.5 pb-2 pt-1.5",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isActief ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className={cn("h-[18px] w-[18px] shrink-0")} />}
            <span
              className={cn(
                "w-full truncate text-center text-[9.5px] uppercase leading-none tracking-[0.04em]",
                isActief ? "font-extrabold" : "font-semibold",
              )}
            >
              {kort ?? label}
            </span>
            {/* Streep onder de actieve tab, binnen de onderrand van de balk. */}
            {isActief && (
              <span aria-hidden className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
