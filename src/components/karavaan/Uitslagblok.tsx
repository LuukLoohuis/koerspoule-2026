import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type UitslagRenner = { positie: number; renner: string; ploeg: string | null };
export type StandPloeg = { rang: number; naam: string; deelnemer?: string | null; punten: number; vandaag?: number | null; isMij?: boolean };

/**
 * Rituitslag en poulestand in krantvorm, met een binnenpagina om door te
 * drillen.
 *
 * Bewust geen modaal met ronde hoeken: dubbele lijnen boven en onder,
 * papierkleur, geen radius. Het moet lezen als een pagina uit de krant, niet
 * als een venster uit een app.
 *
 * De rituitslag toont géén tijden. stage_results kent alleen posities, en een
 * verzonnen tijd naast echte namen is erger dan geen tijd.
 */
function Rij({
  nummer,
  naam,
  onder,
  waarde,
  eerste,
  isMij,
}: {
  nummer: number;
  naam: string;
  onder?: string | null;
  waarde?: string;
  eerste?: boolean;
  isMij?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2.5 border-t border-dotted border-border py-[7px] first:border-t-0",
        isMij && "text-primary",
      )}
    >
      <span
        className={cn(
          "w-[20px] shrink-0 text-right font-oswald text-[11px] tabular-nums text-muted-foreground",
          eerste && "text-[hsl(var(--vintage-gold))]",
          isMij && "text-primary",
        )}
      >
        {nummer}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-serif text-[13.5px]", (eerste || isMij) && "font-semibold")}>
          {naam}
        </span>
        {onder && (
          <span className="block truncate font-oswald text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {onder}
          </span>
        )}
      </span>
      {waarde && (
        <span className="shrink-0 font-serif text-[13px] tabular-nums text-muted-foreground">{waarde}</span>
      )}
    </div>
  );
}

export default function Uitslagblok({
  etappeNummer,
  etappeNaam,
  rituitslag,
  stand,
  className,
}: {
  etappeNummer: number | null;
  etappeNaam: string | null;
  rituitslag: UitslagRenner[];
  stand: StandPloeg[];
  className?: string;
}) {
  const [drill, setDrill] = useState<null | "klassement" | "etappe">(null);

  if (rituitslag.length === 0 && stand.length === 0) return null;

  const etappeLabel = etappeNummer != null ? `Uitslag etappe ${etappeNummer}` : "Uitslag";
  const kopregel = (label: string, opent: "klassement" | "etappe") => (
    <button
      type="button"
      onClick={() => setDrill(opent)}
      className="mb-2 flex w-full items-baseline gap-2 font-oswald text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <span className="ml-auto text-[9px] tracking-[0.12em] text-primary">Top 10 ▸</span>
    </button>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {rituitslag.length > 0 && (
        <div>
          {kopregel(etappeLabel, "etappe")}
          {/* Vijf in de kolom als voorproefje; de rest staat in de binnenpagina. */}
          {rituitslag.slice(0, 5).map((r) => (
            <Rij key={r.positie} nummer={r.positie} naam={r.renner} onder={r.ploeg} eerste={r.positie === 1} />
          ))}
        </div>
      )}

      {stand.length > 0 && (
        <div>
          {kopregel("Klassement", "klassement")}
          {stand.slice(0, 5).map((p) => (
            <Rij
              key={p.rang}
              nummer={p.rang}
              naam={p.naam}
              onder={p.deelnemer}
              waarde={String(p.punten)}
              eerste={p.rang === 1}
              isMij={p.isMij}
            />
          ))}
        </div>
      )}

      <Dialog open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent
          className={cn(
            // Krantpagina, geen app-venster: geen ronde hoeken, dubbele lijnen
            // boven en onder, papier eronder.
            "max-w-[600px] gap-0 rounded-none border-x-0 bg-card p-0",
            "border-y-[5px] border-double border-foreground",
            "shadow-[0_26px_60px_-18px_rgba(0,0,0,0.6)]",
          )}
        >
          <div className="max-h-[80vh] overflow-y-auto px-6 pb-5 pt-4">
            <div className="flex items-baseline justify-between border-b border-border pb-2 font-oswald text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Binnenpagina · de cijfers</span>
              <button
                type="button"
                onClick={() => setDrill(null)}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sluiten <X className="h-3 w-3" aria-hidden />
              </button>
            </div>

            <DialogTitle className="mt-3 text-center font-display text-[30px] font-black leading-none tracking-[-0.02em]">
              {drill === "klassement" ? "Klassement" : etappeLabel}
            </DialogTitle>
            <p className="mt-1.5 text-center font-serif text-[13px] italic text-muted-foreground">
              {drill === "klassement"
                ? "de eerste tien ploegen van de poule"
                : [etappeNaam, "de eerste tien"].filter(Boolean).join(" · ")}
            </p>

            {/* Schakelaar in krantstijl: inverse blok, geen pil, geen radius. */}
            <div className="mt-4 flex border-y border-foreground">
              {([["klassement", "Klassement"], ["etappe", etappeLabel]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDrill(k)}
                  className={cn(
                    "flex-1 py-2 font-oswald text-[10px] uppercase tracking-[0.18em] transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    drill === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {drill === "klassement"
                ? stand.slice(0, 10).map((p) => (
                    <Rij
                      key={p.rang}
                      nummer={p.rang}
                      naam={p.naam}
                      onder={[p.deelnemer, p.vandaag != null ? `+${p.vandaag} vandaag` : null].filter(Boolean).join(" · ") || null}
                      waarde={String(p.punten)}
                      eerste={p.rang === 1}
                      isMij={p.isMij}
                    />
                  ))
                : rituitslag.slice(0, 10).map((r) => (
                    <Rij key={r.positie} nummer={r.positie} naam={r.renner} onder={r.ploeg} eerste={r.positie === 1} />
                  ))}
            </div>

            <p className="mt-4 border-t-[2.5px] border-foreground pt-2 font-oswald text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Van onze redactie
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
