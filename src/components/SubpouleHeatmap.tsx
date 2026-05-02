import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useSubpouleEntries } from "@/hooks/useSubpouleEntries";
import { cn } from "@/lib/utils";

type Props = { subpouleId: string };

const CATEGORY_HUES = [0, 220, 140, 30, 280, 180, 350, 90, 200, 50, 310, 160, 15, 250, 120, 45, 330, 170, 75, 240, 100];

export default function SubpouleHeatmap({ subpouleId }: Props) {
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);
  const { data, isLoading } = useSubpouleEntries(subpouleId, game?.id);

  // Pre-aggregate counts per category × rider once
  const aggregates = useMemo(() => {
    if (!data) return null;
    const totalPlayers = data.entries.length;
    // category_id → rider_id → count
    const counts = new Map<string, Map<string, number>>();
    for (const e of data.entries) {
      for (const [catId, riderIds] of e.picks) {
        if (!counts.has(catId)) counts.set(catId, new Map());
        const cm = counts.get(catId)!;
        for (const riderId of riderIds) {
          cm.set(riderId, (cm.get(riderId) ?? 0) + 1);
        }
      }
    }
    return { counts, totalPlayers };
  }, [data]);

  if (isLoading || !data || !aggregates) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }

  if (aggregates.totalPlayers === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Nog geen teams in deze subpoule.</CardContent>
      </Card>
    );
  }

  const sortedCats = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <Card className="retro-border">
      <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
        <CardTitle className="font-display flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-primary" />
          Populariteit per categorie
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Donker = vaak gekozen · Licht = zeldzaam · Totaal {aggregates.totalPlayers} deelnemer{aggregates.totalPlayers !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {sortedCats.map((cat, catIdx) => {
          const cm = aggregates.counts.get(cat.id);
          if (!cm || cm.size === 0) {
            return (
              <div key={cat.id} className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
                <span className="font-display font-bold">{cat.name}</span> — geen keuzes
              </div>
            );
          }
          const items = Array.from(cm.entries())
            .map(([riderId, count]) => ({
              riderId,
              count,
              rider: data.ridersById.get(riderId),
              ratio: count / aggregates.totalPlayers,
            }))
            .sort((a, b) => b.count - a.count);

          const hue = CATEGORY_HUES[catIdx % CATEGORY_HUES.length];

          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `hsl(${hue} 60% 50%)` }}
                />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {cat.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map(({ riderId, count, rider, ratio }) => {
                  // Simple normalization — darker = more popular
                  const lightness = Math.max(35, 92 - ratio * 70);
                  const saturation = Math.min(80, 25 + ratio * 70);
                  const textLight = lightness < 55;
                  const pct = Math.round(ratio * 100);
                  return (
                    <Tooltip key={riderId}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs font-medium cursor-default transition-transform hover:scale-105",
                            textLight ? "text-white" : "text-foreground"
                          )}
                          style={{
                            backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
                            borderColor: `hsl(${hue} ${saturation}% ${Math.max(25, lightness - 15)}%)`,
                          }}
                        >
                          <span className="truncate inline-block max-w-[140px] align-middle">{rider?.name ?? "—"}</span>
                          <span className="ml-1.5 opacity-80 tabular-nums">{count}×</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-display font-bold">{rider?.name ?? "Onbekend"}</p>
                        <p className="text-muted-foreground">
                          {count} van {aggregates.totalPlayers} ({pct}%)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
