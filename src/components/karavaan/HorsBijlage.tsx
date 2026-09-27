import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import HorsTruien from "@/components/krant/HorsTruien";
import type { HorsScores, HorsTabKey } from "@/components/karavaan/MiniStrip";

/**
 * Hors Catégorie als bijlage bij de krant.
 *
 * Drie cijfers over jouw ploeg, elk een knop naar zijn eigen analyse. Ze staan
 * in een eigen getint vlak. Dat omhulsel doet het werk: één blok met een eigen
 * achtergrond zegt genoeg dat deze drie ergens anders horen, zonder dat er bij
 * elke tegel een pijltje of een label bij hoeft.
 *
 * Het zijn dezelfde drie truien als op de mobiele Krant, met het cijfer en
 * het label als opdruk: wie op zijn telefoon de gele trui van Monkey IQ kent,
 * herkent hem hier.
 *
 * Bewuste werkverdeling met de standbalk erboven: daar staat je POSITIE (rang,
 * punten), hier staat de VERGELIJKING (tegen de apen, tegen je droomploeg,
 * tegen het rapport). Nooit een percentage in de balk, nooit een rang hier.
 */
export default function HorsBijlage({
  scores,
  onOpen,
  className,
}: {
  scores: HorsScores;
  onOpen?: (tab: HorsTabKey) => void;
  className?: string;
}) {
  const { t } = useTranslation();

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

      {/* Niet over de volle breedte: drie truien van 300 px breed zijn een
          affiche, geen bijlage. */}
      <HorsTruien scores={scores} onOpen={onOpen} className="mx-auto max-w-[440px]" />
    </section>
  );
}
