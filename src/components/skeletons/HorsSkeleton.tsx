/**
 * Vormgetrouwe skeleton voor Hors Catégorie.
 *
 * Dit scherm rekende zonder laadweergave: alle datahooks vallen terug op lege
 * waarden, dus tijdens het laden stond er een compleet ingevuld scherm met
 * nullen — Monkey IQ op 0%, een rapportcijfer dat nergens op sloeg — dat daarna
 * omsprong naar de echte cijfers. Op precies het scherm dat over jouw
 * prestaties gaat is dat de vervelendste plek voor verkeerde getallen.
 *
 * Zelfde perkament-tint en pulse als de andere skeletons.
 */
const cell = "rounded bg-secondary/60 animate-pulse";

export default function HorsSkeleton() {
  return (
    <div className="space-y-5 pb-6" role="status" aria-busy="true">
      {/* Subbalk — onderstreepte labels */}
      <div className="flex items-end gap-5 border-b border-border pb-2 pt-2.5">
        {[70, 96, 118, 88, 82].map((w, i) => (
          <div key={i} className={`h-3.5 ${cell}`} style={{ width: w }} />
        ))}
      </div>

      {/* Monkey IQ-hero: percentage, ondertitel, twee vergelijkingsvakken */}
      <div className="ornate-frame retro-border bg-card p-5">
        <div className={`mx-auto h-3 w-28 ${cell}`} />
        <div className={`mx-auto mt-3 h-14 w-40 ${cell}`} />
        <div className={`mx-auto mt-3 h-3 w-56 ${cell}`} />
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className={`h-20 ${cell}`} />
          <div className={`h-3 w-6 ${cell}`} />
          <div className={`h-20 ${cell}`} />
        </div>
      </div>

      {/* Twee statblokken eronder */}
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((blok) => (
          <div key={blok} className="retro-border bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
            <div className="border-b-2 border-foreground bg-secondary/50 p-3">
              <div className={`h-4 w-36 ${cell}`} />
            </div>
            <div className="divide-y divide-border/40">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`h-6 w-6 shrink-0 rounded-full ${cell}`} />
                  <div className={`h-4 flex-1 ${cell}`} style={{ maxWidth: `${52 + ((i * 31) % 38)}%` }} />
                  <div className={`h-4 w-10 shrink-0 ${cell}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
