import { useState } from "react";
import { ChevronDown, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEtappeVerslag } from "@/hooks/useEtappeVerslag";
import { aankomstplaats } from "@/lib/krantKop";
import {
  alineas,
  leestijdMinuten,
  intro,
  bronregel,
  veiligeUrl,
  splitsNadruk,
  splitsKoersEnPoule,
} from "@/lib/verslag";

/**
 * Het etappeverslag als hoofdartikel in de Koerskrant.
 *
 * Opmaak volgt de krant en niet de app: schreefletter, een initiaal, een
 * plaatsregel zoals een persbericht, en een ornament tussen de koers en de
 * poule. Die twee zijn bewust van elkaar gescheiden -- het ene gaat over
 * profs, het andere over je buurman, en dat leest niet als dezelfde tekst.
 *
 * Komt de tekst van een externe bron, dan is de bronregel geen versiering maar
 * de voorwaarde waaronder hij getoond mag worden; die valt daarom nooit weg.
 */
function Alinea({ tekst, className }: { tekst: string; className?: string }) {
  return (
    <p className={className}>
      {/* Deelnemersnamen komen als **naam** binnen. Als tekststukken gerenderd,
          nooit als HTML -- een verslag kan ook geplakt zijn. */}
      {splitsNadruk(tekst).map((stuk, i) =>
        stuk.vet
          ? <strong key={i} className="font-bold text-primary">{stuk.tekst}</strong>
          : <span key={i}>{stuk.tekst}</span>,
      )}
    </p>
  );
}

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
  /** "lead" laat de kaartrand en de kopregel weg: dan staat het in het hoofdartikel. */
  variant?: "kaart" | "lead";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: verslag, isLoading } = useEtappeVerslag(stageId);

  // Geen verslag = geen lege kaart. De krant hoort niet te melden dat er niets
  // te melden valt.
  if (isLoading || !verslag?.tekst?.trim()) return null;

  const { koers, poule } = splitsKoersEnPoule(verslag.tekst);
  const alles = alineas(verslag.tekst);
  const minuten = leestijdMinuten(verslag.tekst);
  const opening = intro(verslag.tekst);
  const bron = bronregel(verslag.bron);
  const url = veiligeUrl(verslag.bron_url);
  const meerDanEen = alles.length > 1 || opening !== alles[0];
  const isLead = variant === "lead";
  const plaats = aankomstplaats(stageName);

  return (
    <section
      id="krant-verslag"
      className={cn(
        isLead ? "mt-3" : "retro-border no-hover-lift bg-card overflow-hidden",
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
        {/* Dubbele lijn: het klassieke krantengebaar onder een kop. */}
        {isLead && <div className="mb-3 border-t-[3px] border-double border-foreground/70" />}

        {open ? (
          <>
            <div className="font-serif">
              {koers.map((p, i) => (
                <Alinea
                  key={i}
                  tekst={p}
                  className={cn(
                    "text-[15px] leading-[1.62] hyphens-auto text-justify",
                    i > 0 && "mt-2.5",
                    // Initiaal alleen op de eerste alinea, en alleen in de
                    // krantweergave -- op een kaartje wordt het rommelig.
                    i === 0 && isLead &&
                      "[&::first-letter]:float-left [&::first-letter]:pr-2 [&::first-letter]:pt-1 " +
                      "[&::first-letter]:font-display [&::first-letter]:text-[52px] " +
                      "[&::first-letter]:font-black [&::first-letter]:leading-[0.82]",
                  )}
                />
              ))}
            </div>

            {poule.length > 0 && (
              <>
                <div aria-hidden className="my-3 text-center text-[13px] tracking-[0.5em] text-[hsl(var(--vintage-gold))]">
                  ✦ ✦ ✦
                </div>
                <p className="mb-1 text-center font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Uit de poule
                </p>
                <div className="font-serif italic">
                  {poule.map((p, i) => (
                    <Alinea key={i} tekst={p} className={cn("text-center text-[15px] leading-[1.6]", i > 0 && "mt-2")} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="font-serif text-[15px] leading-[1.62]">
            {isLead && plaats && (
              <span className="font-display text-[11.5px] font-bold uppercase tracking-[0.11em]">
                {plaats}
                <span className="text-muted-foreground"> — </span>
              </span>
            )}
            {opening}
          </p>
        )}

        {meerDanEen && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="krant-verslag"
            className="mt-2.5 inline-flex items-center gap-1 rounded font-display text-[12px] font-bold text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? "Inklappen" : "Lees het hele verslag"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>

      {bron && (
        <div
          className={cn(
            "font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground",
            isLead
              ? "mt-3 border-t border-border pt-2"
              : "border-t border-border bg-secondary/40 px-4 py-2",
          )}
        >
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
