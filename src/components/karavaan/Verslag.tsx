import { useState } from "react";
import { ChevronDown, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEtappeVerslag } from "@/hooks/useEtappeVerslag";
import { alineas, leestijdMinuten, intro, bronregel, veiligeUrl, splitsNadruk } from "@/lib/verslag";

/**
 * Het etappeverslag als hoofdartikel in de Koerskrant: de terugblik op wat er
 * in de koers gebeurde. Spiegelbeeld van de Voorbeschouwing, en net als daar
 * open te klappen -- dicht toont het de intro, open het hele stuk.
 *
 * De tekst kan van een externe bron komen. Staat er een bron bij, dan is de
 * bronvermelding niet optioneel maar de voorwaarde waaronder het getoond mag
 * worden; die regel valt daarom niet weg als de kaart dichtgeklapt is.
 */
export default function Verslag({
  stageId,
  stageNumber,
  stageName,
  variant = "kaart",
  className,
}: {
  stageId?: string | null;
  stageNumber?: number | null;
  stageName?: string | null;
  /** "lead" laat de kaartrand en de kop weg: dan staat het in het hoofdartikel. */
  variant?: "kaart" | "lead";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: verslag, isLoading } = useEtappeVerslag(stageId);

  // Geen verslag = geen lege kaart. De krant hoort niet te melden dat er niets
  // te melden valt.
  if (isLoading || !verslag?.tekst?.trim()) return null;

  const stukken = alineas(verslag.tekst);
  const minuten = leestijdMinuten(verslag.tekst);
  const opening = intro(verslag.tekst);
  const bron = bronregel(verslag.bron);
  const url = veiligeUrl(verslag.bron_url);
  const meerDanEen = stukken.length > 1 || opening !== stukken[0];

  const isLead = variant === "lead";

  return (
    <section
      id="krant-verslag"
      className={cn(
        isLead ? "mt-2" : "retro-border no-hover-lift bg-card overflow-hidden",
        className,
      )}
    >
      {!isLead && (
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-[3px] bg-primary px-1.5 py-0.5 font-mono text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-primary-foreground">
            Verslag
          </span>
          {stageNumber != null && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Etappe {stageNumber}
              {stageName ? ` · ${stageName}` : ""}
            </span>
          )}
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            {minuten} min
          </span>
        </div>
      </div>
      )}

      <div className={cn(isLead ? "" : "px-4 pb-3.5 pt-2")}>
        {open ? (
          <div className="space-y-2.5">
            {stukken.map((p, i) => (
              <p
                key={i}
                className={cn(
                  "font-serif text-[14.5px] leading-relaxed",
                  // Eerste alinea iets zwaarder: dat is de lead, zoals in een krant.
                  i === 0 && "text-[15.5px] font-medium",
                )}
              >
                {/* Deelnemersnamen komen vetgedrukt binnen als **naam**. Als
                    tekststukken gerenderd, nooit als HTML -- een verslag kan
                    ook geplakt zijn. */}
                {splitsNadruk(p).map((stuk, j) =>
                  stuk.vet
                    ? <strong key={j} className="font-display font-black text-foreground">{stuk.tekst}</strong>
                    : <span key={j}>{stuk.tekst}</span>,
                )}
              </p>
            ))}
          </div>
        ) : (
          <p className="font-serif text-[14.5px] leading-relaxed">{opening}</p>
        )}

        {meerDanEen && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="krant-verslag"
            className="mt-2.5 inline-flex items-center gap-1 font-display text-[12px] font-bold text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {open ? "Inklappen" : "Lees het hele verslag"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>

      {bron && (
        <div className={cn(
          "font-sans text-[11px] text-muted-foreground",
          isLead ? "mt-2.5" : "border-t border-border bg-secondary/40 px-4 py-2",
        )}>
          {bron}
          {url && (
            <>
              {" · "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
              >
                lees het origineel
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
