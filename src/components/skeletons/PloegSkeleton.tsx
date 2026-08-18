/**
 * Vorm-getrouwe skeleton voor de Volgwagen → Mijn Ploeg.
 *
 * Dit was het laatst overgebleven scherm met een tekstregel ("Ploeg laden…")
 * in plaats van een vorm, terwijl het juist het scherm is dat iedereen als
 * eerste opent. Zelfde perkament-tint en pulse als de subpoule-skeletons.
 */
const cell = "rounded bg-secondary/60 animate-pulse";

export default function PloegSkeleton() {
  return (
    <div className="space-y-3 pb-4" role="status" aria-busy="true">
      {/* Dashboardkop */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="p-4">
          <div className={`h-3 w-24 ${cell}`} />
          <div className={`mt-2 h-7 w-48 ${cell}`} />
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-16 ${cell}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Rennerlijst, twee categorieblokken */}
      {Array.from({ length: 2 }).map((_, blok) => (
        <div key={blok} className="retro-border bg-card overflow-hidden">
          <div className="border-b-2 border-foreground bg-secondary/50 p-3">
            <div className={`h-4 w-32 ${cell}`} />
          </div>
          <div className="divide-y divide-border/40">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className={`h-6 w-6 shrink-0 rounded-full ${cell}`} />
                <div className={`h-4 flex-1 ${cell}`} style={{ maxWidth: `${55 + ((i * 29) % 35)}%` }} />
                <div className={`h-4 w-9 shrink-0 ${cell}`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
