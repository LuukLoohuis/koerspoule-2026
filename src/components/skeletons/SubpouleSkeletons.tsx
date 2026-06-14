/**
 * Vorm-getrouwe skeletons voor de zwaarste subpoule-views. Retro perkament-tint
 * (bg-secondary) + animate-pulse. Pulse staat uit bij prefers-reduced-motion
 * (globale regel in index.css). Alleen tonen bij de EERSTE load (isLoading).
 */
import { Card, CardContent } from "@/components/ui/card";

const cell = "rounded bg-secondary/60 animate-pulse";

/** Klassement (etappe-bar + standings-rijen). */
export function StandingsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Etappe-bar */}
      <div className="retro-border bg-gradient-to-br from-card via-card to-secondary/20 p-3">
        <div className="flex items-end justify-between gap-2 h-32">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex-1 rounded-t bg-secondary/60 animate-pulse`} style={{ height: `${40 + ((i * 37) % 55)}%` }} />
          ))}
        </div>
      </div>
      {/* Klassement-tabel */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="p-4 border-b-2 border-foreground bg-secondary/50">
          <div className={`h-5 w-40 ${cell}`} />
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className={`h-6 w-6 ${cell}`} />
              <div className={`h-4 flex-1 ${cell}`} style={{ maxWidth: `${62 - i * 6}%` }} />
              <div className={`h-4 w-10 ${cell}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Heatmap-grid. */
export function HeatmapSkeleton() {
  return (
    <Card className="retro-border">
      <CardContent className="p-4 space-y-3">
        <div className={`h-5 w-44 ${cell}`} />
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}>
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className={`aspect-square ${cell}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
