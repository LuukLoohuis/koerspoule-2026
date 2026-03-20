import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { riderCategories } from "@/data/riders";
import { subpoolTeams, computeUniqueness, computePickCounts } from "@/data/subpoolData";

interface LeCoupTactiqueProps {
  standings: typeof subpoolTeams;
  myUserName: string;
}

function getHeatStyle(count: number, totalPlayers: number) {
  const ratio = count / totalPlayers;
  if (count === 1) return {
    cell: "bg-red-600 text-white",
    badge: "bg-red-700 text-white",
    label: "Uniek",
    ring: "ring-red-500/30",
  };
  if (ratio <= 0.2) return {
    cell: "bg-orange-500 text-white",
    badge: "bg-orange-600 text-white",
    label: "Zeldzaam",
    ring: "",
  };
  if (ratio <= 0.35) return {
    cell: "bg-yellow-400 text-foreground",
    badge: "bg-yellow-500 text-foreground",
    label: "Gemiddeld",
    ring: "",
  };
  if (ratio <= 0.5) return {
    cell: "bg-yellow-200 text-foreground",
    badge: "bg-yellow-300 text-foreground",
    label: "Populair",
    ring: "",
  };
  return {
    cell: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    label: "Heel populair",
    ring: "",
  };
}

function StatCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border px-4 py-4",
      highlight ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/50"
    )}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-bold font-display text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function LegendChip({ label, className }: { label: string; className: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
      <span className={cn("h-3 w-3 rounded-full", className)} />
      <span>{label}</span>
    </div>
  );
}

export default function LeCoupTactique({ standings, myUserName }: LeCoupTactiqueProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showOnlyUnique, setShowOnlyUnique] = useState(false);
  const [sortMode, setSortMode] = useState<"standing" | "panache">("standing");

  const categories = riderCategories;
  const totalPlayers = standings.length;

  const { uniqueness, pickCounts, playerStats, mostTactical, averageOverlap } = useMemo(() => {
    const uniqueness = computeUniqueness(standings);
    const pickCounts = computePickCounts(standings);

    const playerStats = standings.map((t) => {
      const playerMap = uniqueness.get(t.userName);
      if (!playerMap) return { name: t.userName, avg: 0, uniqueCount: 0 };
      const vals = Array.from(playerMap.values());
      const uniqueCount = vals.filter(v => v >= 0.95).length;
      return { name: t.userName, avg: vals.reduce((a, b) => a + b, 0) / vals.length, uniqueCount };
    });

    const mostTactical = [...playerStats].sort((a, b) => b.uniqueCount - a.uniqueCount)[0];

    // Average overlap: for each pick, how many others share it
    let totalShared = 0;
    let totalCells = 0;
    for (const team of standings) {
      for (const cat of categories) {
        const pick = team.picks[cat.id];
        if (!pick) continue;
        const catCounts = pickCounts.get(cat.id);
        const count = catCounts?.get(pick.number) ?? 1;
        totalShared += count;
        totalCells += 1;
      }
    }
    const averageOverlap = totalCells ? (totalShared / totalCells).toFixed(1) : "0.0";

    return { uniqueness, pickCounts, playerStats, mostTactical, averageOverlap };
  }, [standings]);

  const sortedTeams = useMemo(() => {
    if (sortMode === "panache") {
      return [...standings].sort((a, b) => {
        const aAvg = playerStats.find(u => u.name === a.userName)?.avg ?? 0;
        const bAvg = playerStats.find(u => u.name === b.userName)?.avg ?? 0;
        return bAvg - aAvg;
      });
    }
    return standings;
  }, [standings, sortMode, playerStats]);

  const currentStats = playerStats.find(p => p.name === myUserName);
  const isMe = (name: string) => name === myUserName;

  return (
    <section className="lg:col-span-3">
      <Card className="retro-border overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-4 px-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-1.5 inline-flex items-center rounded-full bg-muted px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                Subpoule analyse
              </div>
              <CardTitle className="font-display text-xl md:text-2xl">
                Le Coup Tactique 🎯
              </CardTitle>
              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground font-sans">
                Zie in één oogopslag welke keuzes veilig zijn en welke spelers echt
                afwijken van het peloton. Hoe warmer de cel, hoe unieker de pick.
              </p>
              <p className="text-[10px] text-muted-foreground font-sans mt-1 italic">
                Berekening: per categorie <code className="bg-muted px-1 rounded font-mono">1 − (mede-kiezers / spelers−1)</code>, gemiddeld over alle categorieën.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showOnlyUnique ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 rounded-full"
                onClick={() => setShowOnlyUnique(prev => !prev)}
              >
                🔥 Alleen unieke picks
              </Button>
              <div className="flex gap-1 border border-border rounded-full p-0.5">
                <Button
                  variant={sortMode === "standing" ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 rounded-full"
                  onClick={() => setSortMode("standing")}
                >
                  Stand
                </Button>
                <Button
                  variant={sortMode === "panache" ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 rounded-full"
                  onClick={() => setSortMode("panache")}
                >
                  Panache ↓
                </Button>
              </div>
              {selectedPlayerId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-full"
                  onClick={() => setSelectedPlayerId(null)}
                >
                  Reset selectie
                </Button>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid gap-2.5 grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Meest tactische speler"
              value={mostTactical?.name ?? "—"}
              sub={`${mostTactical?.uniqueCount ?? 0} unieke picks`}
            />
            <StatCard
              label="Jouw team"
              value={myUserName}
              sub={`${currentStats?.uniqueCount ?? 0} unieke picks`}
              highlight
            />
            <StatCard
              label="Gemiddelde overlap"
              value={`${averageOverlap}×`}
              sub="gemiddeld aantal gelijke keuzes"
            />
            <StatCard
              label="Subpoule scan"
              value={showOnlyUnique ? "Uniek filter aan" : "Volledig overzicht"}
              sub="wissel tussen alle en uitschieters"
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <LegendChip label="Uniek (1×)" className="bg-red-600" />
            <LegendChip label="Zeldzaam (2–3×)" className="bg-orange-500" />
            <LegendChip label="Gemiddeld (4–5×)" className="bg-yellow-400" />
            <LegendChip label="Populair (6–7×)" className="bg-yellow-200" />
            <LegendChip label="Heel populair (8+×)" className="bg-muted" />
            <div className="ml-0 sm:ml-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="h-3 w-3 rounded-sm border-2 border-primary bg-card inline-block" />
              Jouw team
            </div>
          </div>
        </CardHeader>

        {/* Heatmap grid */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[1200px] gap-1.5 p-4"
              style={{
                gridTemplateColumns: `200px repeat(${sortedTeams.length}, minmax(110px, 1fr))`,
              }}
            >
              {/* Empty corner */}
              <div className="sticky left-0 z-30 bg-background" />

              {/* Player column headers */}
              {sortedTeams.map((team) => {
                const isCurrent = isMe(team.userName);
                const isSelected = selectedPlayerId === team.id;
                const stats = playerStats.find(p => p.name === team.userName);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(prev => prev === team.id ? null : team.id)}
                    className={cn(
                      "sticky top-0 z-20 rounded-xl border px-3 py-3 text-left transition-all",
                      isCurrent
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:bg-secondary/50",
                      isSelected && "ring-2 ring-foreground ring-offset-2"
                    )}
                  >
                    <div className="truncate text-sm font-bold font-display text-foreground">
                      {team.userName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {stats?.uniqueCount ?? 0} unieke picks
                    </div>
                    {isCurrent && (
                      <div className="mt-1.5 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        👈 jij
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Category rows */}
              {categories.map((cat) => (
                <React.Fragment key={cat.id}>
                  {/* Category label */}
                  <div className="sticky left-0 z-10 flex items-center rounded-xl border border-border bg-secondary/50 px-3 py-3">
                    <span className="truncate text-xs font-semibold text-muted-foreground font-sans">
                      {cat.name}
                    </span>
                  </div>

                  {/* Pick cells */}
                  {sortedTeams.map((team) => {
                    const playerMap = uniqueness.get(team.userName);
                    const score = playerMap?.get(cat.id) ?? 0;
                    const pick = team.picks[cat.id];
                    const catCounts = pickCounts.get(cat.id);
                    const count = pick ? catCounts?.get(pick.number) ?? 1 : 0;
                    const style = getHeatStyle(count, totalPlayers);
                    const isCurrent = isMe(team.userName);
                    const isSelected = selectedPlayerId === null || selectedPlayerId === team.id;
                    const isUnique = count === 1;
                    const shouldHide = showOnlyUnique && !isUnique;

                    return (
                      <Tooltip key={`${team.id}-${cat.id}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative min-h-[62px] rounded-xl border px-2.5 py-2.5 transition-all cursor-default",
                              style.cell,
                              isCurrent && "ring-2 ring-primary/50 ring-offset-1",
                              selectedPlayerId && !isSelected && "opacity-20",
                              shouldHide && "opacity-10 saturate-0",
                              isUnique && "shadow-[0_0_0_1px_rgba(220,38,38,0.15),0_6px_16px_rgba(220,38,38,0.14)]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-bold leading-tight">
                                  {pick?.name ?? "—"}
                                </div>
                                <div className="mt-0.5 text-[10px] font-medium opacity-75">
                                  {style.label}
                                </div>
                              </div>
                              <span className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                style.badge
                              )}>
                                {count}×
                              </span>
                            </div>
                            {isUnique && (
                              <div className="absolute right-1.5 top-1.5 text-xs">🔥</div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs space-y-0.5 max-w-[200px]">
                          <p className="font-display font-bold">{pick?.name ?? "—"} <span className="text-muted-foreground font-sans">#{pick?.number}</span></p>
                          <p className="text-muted-foreground font-sans">
                            {count === 1
                              ? "Unieke keuze! 🔥"
                              : `${count - 1} ander${count - 1 > 1 ? "en" : ""} kozen ook deze renner`}
                          </p>
                          <p className="font-sans text-muted-foreground">{count}/{totalPlayers} spelers</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Risk vs safety footer */}
          <div className="border-t-2 border-foreground px-4 md:px-6 py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
              Risico vs zekerheid
            </h3>
            <div className="mt-3 grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {sortedTeams.map((team) => {
                const stats = playerStats.find(p => p.name === team.userName);
                const uniqueCount = stats?.uniqueCount ?? 0;
                const safeCount = categories.length - uniqueCount;
                const isCurrent = isMe(team.userName);
                return (
                  <div
                    key={team.id}
                    className={cn(
                      "rounded-xl border p-3",
                      isCurrent
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-secondary/30"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className={cn("text-xs font-bold font-display truncate", isCurrent && "text-primary")}>
                        {team.userName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {uniqueCount}/{categories.length}
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${(uniqueCount / categories.length) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>🔥 {uniqueCount}</span>
                      <span>🧱 {safeCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
