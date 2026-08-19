/**
 * <Voorbeeldmarkering> — dit zijn niet jouw cijfers.
 *
 * Zolang een koers nog niet rijdt valt er niets te berekenen, en dan toonden
 * sommige panelen leegte en andere voorbeelddata zonder dat het verschil te
 * zien was. Bij Dartpijl stond een voorbeeldpercentage waar niets bij stond:
 * dat kun je voor je eigen score aanzien.
 *
 * Diagonale arcering plus een label. De arcering doet het echte werk — die
 * zie je ook als je de tekst niet leest — en ligt eroverheen zonder de inhoud
 * onleesbaar te maken.
 */
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Voorbeeldmarkering({
  children,
  opentWanneer,
  className,
}: {
  children: ReactNode;
  /** Eén regel: wanneer de echte cijfers verschijnen. */
  opentWanneer?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span
        className="pointer-events-none absolute -top-1 right-0 z-10 rounded-full border border-[hsl(var(--vintage-gold))/0.6] bg-card px-2 py-px font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--vintage-gold))]"
      >
        Voorbeeld
      </span>

      <div className="relative">
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent 0 9px, hsl(var(--foreground)/0.05) 9px 18px)",
          }}
        />
      </div>

      {opentWanneer && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" aria-hidden />
          {opentWanneer}
        </p>
      )}
    </div>
  );
}
