import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Hors Catégorie als bijlage bij de krant.
 *
 * Drie cijfers over jouw ploeg, elk een knop naar zijn eigen analyse. Ze staan
 * in een eigen getint vlak met één "Bijlage ↗" in de kop: dat omhulsel vertelt
 * dat deze drie de pagina verlaten, zodat er niet bij elke tegel een pijltje
 * hoeft te staan.
 *
 * Bewuste werkverdeling met de standbalk erboven: daar staat je POSITIE (rang,
 * punten), hier staat de VERGELIJKING (tegen de apen, tegen je droomploeg,
 * tegen het rapport). Nooit een percentage in de balk, nooit een rang hier.
 */
export type BijlageTegel = {
  key: string;
  /** Het cijfer zelf; null als het er nog niet is. */
  waarde: number | null;
  /** Wat er achter het cijfer staat, bijvoorbeeld een procentteken. */
  eenheid?: string;
  titel: string;
  haak: string;
  /** Kleur van het cijfer, als CSS-kleur. */
  kleur: string;
  onClick: () => void;
};

export default function HorsBijlage({
  tegels,
  className,
}: {
  tegels: BijlageTegel[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (tegels.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-[20px] border border-border bg-[hsl(var(--vintage-gold)/0.07)] p-3",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="font-oswald text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("karavaan.voorpagina.bijlageKop")}
        </span>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="font-oswald text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("karavaan.voorpagina.bijlageLink")} ↗
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {tegels.map((tegel) => (
          <button
            key={tegel.key}
            type="button"
            onClick={tegel.onClick}
            className={cn(
              "min-h-[78px] rounded-[14px] bg-background p-2.5 text-left",
              "shadow-[0_0_0_1px_rgba(20,18,16,0.07),0_10px_22px_-16px_rgba(0,0,0,0.45)]",
              "transition-transform duration-150 hover:-translate-y-[2px] active:translate-y-[1px]",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
            )}
          >
            {/* Geen nepnul als het cijfer er nog niet is: een streepje op
                cijferhoogte houdt het raster staan en liegt niet. */}
            {tegel.waarde === null ? (
              <span aria-hidden className="mt-1.5 mb-[11px] block h-[3px] w-[26px] bg-foreground" />
            ) : (
              <span
                className="block text-[24px] font-extrabold leading-none tracking-[-0.02em] tabular-nums"
                style={{ color: tegel.kleur }}
              >
                {tegel.waarde.toLocaleString("nl-NL")}
                {tegel.eenheid && <span className="ml-px text-[11px] font-bold">{tegel.eenheid}</span>}
              </span>
            )}
            <span className="mt-1.5 block text-[13px] font-bold leading-tight">{tegel.titel}</span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">{tegel.haak}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
