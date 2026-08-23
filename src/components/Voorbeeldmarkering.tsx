/**
 * <Voorbeeldmarkering> — dit zijn niet jouw cijfers.
 *
 * Zolang een koers nog niet rijdt valt er niets te berekenen. Dan tonen we het
 * échte keuzepatroon van een uitgereden koers, zodat je ziet wát een paneel
 * doet in plaats van naar leegte te kijken.
 *
 * Dat vraagt om een waarschuwing die je niet kúnt missen. Een klein pilletje
 * in de hoek was te makkelijk over het hoofd te zien: iemand die de heatmap
 * openslaat leest de namen, niet het label. Vandaar een balk over de volle
 * breedte bóven het paneel.
 *
 * Eerst lag er ook diagonale arcering over de inhoud. Dat werkte als
 * waarschuwing maar maakte tabellen en heatmaps rommelig om te lezen — en
 * juist die inhoud is wat je wilt laten zien. Nu een rustige gouden waas plus
 * een doorlopende rand: even goed te zien dat het apart staat, zonder dat het
 * de cijfers eronder in de weg zit.
 */
import type { ReactNode } from "react";
import { Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Voorbeeldmarkering({
  children,
  actief = true,
  opentWanneer,
  bron,
  className,
}: {
  children: ReactNode;
  /**
   * Staat er iets te waarschuwen? Zo niet, dan komt de inhoud er kaal doorheen.
   *
   * De aanroepers deden dit eerder met `className="contents"`, maar dat haalt
   * alleen het omhulsel uit de layout -- de waarschuwingsbalk zelf bleef staan.
   * Gevolg: bij een live koers stonden er echte cijfers onder de mededeling dat
   * het voorbeeldcijfers waren.
   */
  actief?: boolean;
  /** Eén regel: wanneer de echte cijfers verschijnen. */
  opentWanneer?: string;
  /** Waar de voorbeeldcijfers vandaan komen, bv. "Tour de France 2026". */
  bron?: string;
  className?: string;
}) {
  if (!actief) return <>{children}</>;

  return (
    <div className={cn("relative", className)}>
      {/* Onmiskenbaar: volle breedte, gouden rand, boven het paneel. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border-2 border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.12] px-3 py-2">
        <Info className="h-4 w-4 shrink-0 text-[hsl(var(--vintage-gold))]" aria-hidden />
        <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-[hsl(var(--vintage-gold))]">
          Voorbeeld — geen echte cijfers
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {bron
            ? `Gesimuleerd op de uitslagen van ${bron}.`
            : "Gesimuleerde cijfers, alleen om te laten zien hoe dit werkt."}
        </span>
      </div>

      <div className="relative rounded-lg border border-dashed border-[hsl(var(--vintage-gold))/0.55] p-1.5">
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-[hsl(var(--vintage-gold))/0.05]"
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
