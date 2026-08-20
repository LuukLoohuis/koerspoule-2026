import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type Rubriek = {
  key: string;
  Icon: ComponentType<{ className?: string }>;
  titel: string;
  /** Eén regel die zegt wát daar te halen valt — geen menu, maar een krant. */
  haak: string;
  nieuw?: boolean;
  onClick: () => void;
};

/**
 * Kop en rubriekenrij van de Krant.
 *
 * De pagina heet de Krant, dus laat hem zich zo gedragen: een naambalk met
 * datum en editie, en daaronder verwijzingen naar de rest van het blad. De haak
 * onder elke rubriek is het verschil met een menu — een menu zegt waar je heen
 * kunt, een krant zegt waarom je zou gaan.
 */
export default function Voorpagina({
  koers,
  editie,
  rubrieken,
  className,
}: {
  koers: string;
  editie: string | null;
  rubrieken: Rubriek[];
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="border-b-[3px] border-double border-foreground pb-2">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="truncate">{koers}</span>
          {editie && <span className="shrink-0">{editie}</span>}
        </div>
        <p className="mt-1.5 text-center font-display text-[26px] font-black leading-none tracking-tight sm:text-[34px]">
          {t("karavaan.voorpagina.naam")}
        </p>
        <p className="mt-1 text-center font-serif text-[11px] italic text-muted-foreground">
          {t("karavaan.voorpagina.leus")}
        </p>
      </div>

      {rubrieken.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {rubrieken.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={r.onClick}
              className={cn(
                "relative flex flex-col items-start gap-0.5 overflow-hidden rounded-lg border border-border bg-card px-2.5 py-2 text-left",
                "transition-all hover:-translate-y-px hover:border-[hsl(var(--vintage-gold))]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
              )}
            >
              {r.nieuw && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-px font-mono text-[7.5px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  {t("karavaan.voorpagina.nieuw")}
                </span>
              )}
              <r.Icon className="h-4 w-4 text-[hsl(var(--vintage-gold))]" />
              <span className="mt-0.5 font-display text-[12.5px] font-bold leading-tight">{r.titel}</span>
              <span className="line-clamp-2 font-serif text-[11px] leading-snug text-muted-foreground">{r.haak}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
