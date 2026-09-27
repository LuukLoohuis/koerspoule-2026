import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import CijferTrui from "@/components/krant/CijferTrui";
import type { HorsTrui } from "@/lib/wielertruien";

/**
 * Hors Catégorie als bijlage bij de krant.
 *
 * Drie cijfers over jouw ploeg, elk een knop naar zijn eigen analyse. Ze staan
 * in een eigen getint vlak. Dat omhulsel doet het werk: één blok met een eigen
 * achtergrond zegt genoeg dat deze drie ergens anders horen, zonder dat er bij
 * elke tegel een pijltje of een label bij hoeft.
 *
 * Het cijfer staat op de borst van een wielertrui, dezelfde drie truien als op
 * de mobiele Krant: wie op zijn telefoon de gele trui bij Monkey IQ kent,
 * herkent hem hier.
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
  /** De trui die het cijfer draagt. */
  trui: HorsTrui;
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
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {tegels.map((tegel) => (
          <button
            key={tegel.key}
            type="button"
            onClick={tegel.onClick}
            className={cn(
              // Smal: trui boven de tekst. Vanaf md ernaast; eerder past de
              // haak niet meer naast de trui.
              "flex min-h-[78px] flex-col items-center gap-2 rounded-[14px] bg-background p-2.5 text-center",
              "md:flex-row md:gap-3.5 md:px-3.5 md:text-left",
              "shadow-[0_0_0_1px_rgba(20,18,16,0.07),0_10px_22px_-16px_rgba(0,0,0,0.45)]",
              "transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-px",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
            )}
          >
            {/* Geen nepnul als het cijfer er nog niet is: de trui draagt dan
                een streepje. */}
            <CijferTrui
              trui={tegel.trui}
              waarde={tegel.waarde === null ? null : tegel.waarde.toLocaleString("nl-NL")}
              eenheid={tegel.eenheid}
              breedte={72}
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-bold leading-tight">{tegel.titel}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">{tegel.haak}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
