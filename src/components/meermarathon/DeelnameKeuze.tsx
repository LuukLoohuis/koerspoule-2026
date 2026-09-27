/**
 * Deelnamekeuze — de eerste stap van de Meermarathon: waar rijd je mee?
 * Vrouwen, mannen of allebei. Het blijft één game; elk peloton heeft een
 * eigen ploeg en een eigen klassement.
 *
 * Alleen weergave. De twee kaarten zijn aan/uit-knoppen: allebei aan mag,
 * geen van beide niet (dan valt er niets samen te stellen).
 */
import { useId } from "react";
import { Check, Clock, Lock, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeelnameOptie } from "@/lib/meermarathonDeelname";

function samenvatting(opties: DeelnameOptie[], gekozen: Set<string>): string {
  const namen = opties.filter((o) => gekozen.has(o.id)).map((o) => `de ${o.label.toLowerCase()}`);
  if (namen.length === 0) return "Kies minstens één peloton.";
  if (namen.length === 1) return `Je rijdt mee bij ${namen[0]}: één ploeg, één klassement.`;
  return `Je rijdt mee bij ${namen.slice(0, -1).join(", ")} én ${namen[namen.length - 1]}: twee ploegen, twee klassementen.`;
}

export default function DeelnameKeuze({
  seizoen,
  opties,
  gekozen,
  onWissel,
  onVerder,
  deadline,
  className,
}: {
  /** "2026-2027" */
  seizoen: string;
  opties: DeelnameOptie[];
  gekozen: Set<string>;
  onWissel: (id: string) => void;
  onVerder: () => void;
  /** "vr 13 nov, 23:59" */
  deadline?: string | null;
  className?: string;
}) {
  const titelId = useId();
  // Alleen wat nog samengesteld moet worden telt voor de knop.
  const nieuw = opties.filter((o) => gekozen.has(o.id) && !o.ingeschreven);
  const knop =
    nieuw.length === 0
      ? "Kies een peloton"
      : nieuw.length === 1
        ? `Stel je ${nieuw[0].label.toLowerCase()}ploeg samen`
        : "Stel je ploegen samen";

  return (
    <section
      data-eigen-typografie
      aria-labelledby={titelId}
      className={cn("@container retro-border no-hover-lift bg-card p-4 font-inter text-card-foreground @2xl:p-6", className)}
    >
      <header className="flex flex-col gap-1">
        <span className="editor-eyebrow">Meermarathon {seizoen}</span>
        <h2 id={titelId} className="heading-oswald m-0 mt-1 text-[28px] @2xl:text-[34px]">
          Waar rijd je mee?
        </h2>
        <p className="m-0 max-w-xl text-[15px] leading-normal text-secondary-foreground">
          Eén game, twee pelotons. Kies de vrouwen, de mannen of allebei. Elk peloton heeft een eigen ploeg en een eigen
          klassement.
        </p>
      </header>

      <div role="group" aria-label="Pelotons" className="mt-4 grid gap-3 @2xl:grid-cols-2 @2xl:gap-4">
        {opties.map((o) => {
          const aan = gekozen.has(o.id);
          const vast = Boolean(o.ingeschreven);
          const dicht = Boolean(o.gesloten) && !vast;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={aan}
              disabled={vast || dicht}
              onClick={() => onWissel(o.id)}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-[9px] border-2 px-3.5 py-3 text-left outline-hidden transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                aan
                  ? "border-foreground text-white shadow-[3px_3px_0_hsl(var(--foreground))]"
                  : dicht
                    ? "cursor-not-allowed border-border bg-secondary/50 text-muted-foreground"
                    : "border-foreground/35 bg-card text-foreground hover:border-foreground hover:bg-secondary/60",
              )}
              style={
                aan
                  ? {
                      background:
                        o.categorie === "vrouwen"
                          ? "linear-gradient(135deg, var(--mm-v), var(--mm-v2))"
                          : "linear-gradient(135deg, var(--mm-m), var(--mm-m2))",
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  aan ? "bg-white/15 text-white" : "bg-[var(--mm-chip)]",
                )}
                style={aan || dicht ? undefined : { color: o.categorie === "vrouwen" ? "var(--mm-v)" : "var(--mm-m)" }}
              >
                {dicht ? <Lock className="size-5" /> : <Snowflake className="size-5" strokeWidth={1.8} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-xl font-bold leading-tight">{o.label}</span>
                <span className={cn("text-[13px] leading-snug", aan ? "text-white/85" : "text-muted-foreground")}>
                  {dicht ? "De inschrijving is gesloten" : vast ? "Je ploeg is ingediend" : o.ploeg}
                </span>
                <span className={cn("text-[13px] leading-snug", aan ? "text-white/85" : "text-muted-foreground")}>{o.kalender}</span>
              </span>
              {/* Aanvinkvakje: ook zonder kleur zie je wat aan staat. */}
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md border-2",
                  aan ? "border-white bg-white text-[var(--mm-m)]" : "border-foreground/40 bg-card",
                )}
              >
                {aan && <Check className="size-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p role="status" className="m-0 text-[15px] font-semibold leading-snug">
            {samenvatting(opties, gekozen)}
          </p>
          {deadline && (
            <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Clock aria-hidden className="size-4 shrink-0" strokeWidth={2} />
              <span>
                Inschrijven en het andere peloton erbij nemen kan tot <strong className="font-bold text-foreground">{deadline}</strong>.
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={nieuw.length === 0}
          onClick={onVerder}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center justify-center rounded-[9px] border-2 px-[18px] text-[15px] font-bold transition-colors",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            nieuw.length === 0
              ? "cursor-not-allowed border-border bg-secondary text-muted-foreground"
              : "border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--primary)/0.5)] hover:bg-primary/90",
          )}
        >
          {knop}
        </button>
      </div>
    </section>
  );
}
