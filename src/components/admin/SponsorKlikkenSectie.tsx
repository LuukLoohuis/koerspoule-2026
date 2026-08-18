/**
 * <SponsorKlikkenSectie> — hoe vaak er op een sponsorlink geklikt is.
 *
 * Staat hier en niet bij Prijzen, terwijl de meeste links daar ingevoerd
 * worden: je beoordeelt een prijssponsor naast je andere sponsoren, niet in
 * het scherm waar je hem toevallig hebt ingetypt. Het herkomstlabel zegt waar
 * de link vandaan komt.
 *
 * Dezelfde prijslink staat in de Krant én op de prijzenpagina. Die tellen
 * apart — "waar levert deze sponsor het meeste op" is juist de vraag.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSponsorKlikken, type SponsorKlikRij } from "@/hooks/useSponsorKlikken";

const PERIODES: { label: string; dagen: number | null }[] = [
  { label: "7 dagen", dagen: 7 },
  { label: "30 dagen", dagen: 30 },
  { label: "Altijd", dagen: null },
];

const PLEK_LABEL: Record<SponsorKlikRij["plek"], string> = {
  voorpagina: "Voorpagina",
  dagprijsbanner: "Krant · dagprijs",
  prijzenpagina: "Prijzenpagina",
};

export default function SponsorKlikkenSectie() {
  const [dagen, setDagen] = useState<number | null>(30);
  const { data: rijen = [], isLoading, error } = useSponsorKlikken(dagen);

  const totaal = rijen.reduce((som, r) => som + r.aantal, 0);
  const metKlik = rijen.filter((r) => r.aantal > 0).length;
  const periodeWoord = dagen === null ? "sinds de start" : `in de laatste ${dagen} dagen`;

  return (
    <Card className="retro-border">
      <CardHeader className="border-b-2 border-foreground bg-secondary/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Klikken op sponsorlinks
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading
                ? "Bezig met tellen…"
                : `${totaal} klikken ${periodeWoord}, verdeeld over ${metKlik} van de ${rijen.length} links`}
            </p>
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Periode">
            {PERIODES.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={p.dagen === dagen ? "default" : "outline"}
                className="h-7 text-xs"
                aria-pressed={p.dagen === dagen}
                onClick={() => setDagen(p.dagen)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <p className="p-5 text-sm text-destructive">
            Kon de klikken niet ophalen. Draait de migratie <code>20260818120000_sponsor_kliks</code> al?
          </p>
        ) : rijen.length === 0 && !isLoading ? (
          <p className="p-5 text-center text-sm italic text-muted-foreground">
            Nog geen sponsor of prijs met een link ingevuld.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {rijen.map((r) => {
              const aandeel = totaal > 0 ? Math.round((r.aantal / totaal) * 100) : 0;
              return (
                <div
                  key={`${r.bron}-${r.bron_id}-${r.veld}-${r.plek}`}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold">{r.naam}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-px font-mono text-[9px] uppercase tracking-wider",
                          r.bron === "prijs"
                            ? "border-[hsl(var(--vintage-gold))/0.6] text-[hsl(var(--vintage-gold))]"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {r.bron === "prijs" ? "via prijs" : "sponsor"}
                      </span>
                      <span className="rounded-full border border-border px-2 py-px font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {PLEK_LABEL[r.plek]}
                      </span>
                    </div>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{r.url}</p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-4 text-right">
                    <div>
                      <div className="font-display text-xl font-black tabular-nums">{r.aantal}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">klikken</div>
                    </div>
                    <div>
                      <div className="font-display text-xl font-black tabular-nums">{aandeel}%</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">van totaal</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
