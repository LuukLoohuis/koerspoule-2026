import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useActiveLegende } from "@/hooks/useRubriek";
import { legendeDelen, legendeKicker, legendeBron } from "@/lib/legende";

/**
 * De Legende: een archiefverhaal in de rechterkolom van de voorpagina.
 *
 * Krantvorm, geen kaartje: gespatieerde kapitalen, een kop, één alinea en een
 * rode regel met een pijltje -- hetzelfde gebaar als "Bekijk de uitslagen"
 * eronder. De dubbele regel erboven wordt door de voorpagina gezet, zodat die
 * ook meeverdwijnt als er geen verhaal is.
 *
 * Geen actief item betekent geen blok. De krant hoort niet te melden dat er
 * vandaag niets uit het archief is.
 */
/** Dezelfde initiaal als boven het hoofdartikel, een maat kleiner voor de kolom. */
const INITIAAL =
  "[&::first-letter]:float-left [&::first-letter]:pr-1.5 [&::first-letter]:pt-1 " +
  "[&::first-letter]:font-display [&::first-letter]:text-[34px] " +
  "[&::first-letter]:font-black [&::first-letter]:leading-[0.8]";

export default function Legende({ gameId }: { gameId?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: item } = useActiveLegende(gameId);

  const { teaser, rest, meer } = legendeDelen(item?.content);
  if (!item || !teaser) return null;

  const titel = item.titel?.trim() || null;
  const bron = legendeBron(item.bron);

  return (
    <section id="krant-legende" className="scroll-mt-24">
      <p className="border-b border-foreground/25 pb-1.5 font-oswald text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground">
        {legendeKicker(t("karavaan.voorpagina.rubLegende"), item.jaar)}
      </p>
      {/* Archieffoto links naast het verhaal, tekst eromheen -- zoals een
          krantenplaat in een kolom staat. Float in plaats van een tweede
          kolom: dan loopt de tekst er vanzelf onderdoor zodra hij langer is
          dan de foto hoog is. */}
      {item.foto_url && (
        <img
          src={item.foto_url}
          alt={item.titel?.trim() || t("karavaan.voorpagina.rubLegende")}
          loading="lazy"
          className="float-left mb-2 mr-3 mt-2.5 aspect-[4/3] w-[42%] max-w-[150px] border border-foreground/15 object-cover"
        />
      )}
      {titel && (
        <h3 className="mt-2.5 font-display text-[19px] font-bold leading-[1.15] tracking-[-0.015em]">
          {titel}
        </h3>
      )}

      {/* Initiaal op de openingsalinea, net als bij het hoofdartikel. */}
      {open ? (
        <div className="space-y-2">
          {rest.map((alinea, i) => (
            <p
              key={i}
              className={cn(
                "font-serif text-[13.5px] leading-[1.5] text-foreground/90",
                i === 0 && INITIAAL,
              )}
            >
              {alinea}
            </p>
          ))}
        </div>
      ) : (
        <p
          className={cn(
            "mt-1.5 font-serif text-[13.5px] leading-[1.5] text-foreground/90",
            INITIAAL,
          )}
        >
          {teaser}
        </p>
      )}

      {meer && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "clear-left mt-2.5 inline-flex items-center gap-1 rounded font-oswald text-[10.5px] uppercase tracking-[0.16em]",
            "text-primary underline underline-offset-[5px] decoration-primary/50",
            "transition-colors hover:decoration-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {open ? t("karavaan.voorpagina.legendeDicht") : t("karavaan.voorpagina.legendeOpen")}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      )}

      {bron && (
        <p className="clear-left mt-2.5 font-oswald text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {bron.url ? (
            <a
              href={bron.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 underline underline-offset-[3px] hover:text-foreground"
            >
              {bron.tekst}
              <ExternalLink className="h-2.5 w-2.5" aria-hidden />
            </a>
          ) : (
            bron.tekst
          )}
        </p>
      )}
    </section>
  );
}
