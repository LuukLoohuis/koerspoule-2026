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

// 21 distinct hue values spread across the spectrum for each category row
const CATEGORY_HUES = [
  0, 220, 140, 30, 280, 180, 350, 90, 200, 50,
  310, 160, 15, 250, 120, 45, 330, 170, 75, 240, 100,
];

function getCategoryShade(catIndex: number, ratio: number) {
  // ratio = count / totalPlayers — high = popular (near white), low = rare (very dark)
  const hue = CATEGORY_HUES[catIndex % CATEGORY_HUES.length];

  // 5 distinct steps with extreme contrast range
  let saturation: number;
  let lightness: number;

  if (ratio <= 1 / 20) {
    // Uniek — very dark, fully saturated
    saturation = 85;
    lightness = 30;
  } else if (ratio <= 0.15) {
    // Zeldzaam — dark
    saturation = 70;
    lightness = 42;
  } else if (ratio <= 0.3) {
    // Gemiddeld — medium
    saturation = 50;
    lightness = 60;
  } else if (ratio <= 0.5) {
    // Populair — light
    saturation = 30;
    lightness = 82;
  } else {
    // Heel populair — near white/pastel
    saturation = 15;
    lightness = 94;
  }

  const textLight = lightness < 55;
  return {
    bg: `hsl(${hue} ${saturation}% ${lightness}%)`,
    text: textLight ? "text-white" : "text-foreground",
    badgeBg: `hsl(${hue} ${Math.min(saturation + 10, 90)}% ${Math.max(lightness - 12, 22)}%)`,
    badgeText: lightness - 12 < 55 ? "text-white" : "text-foreground",
  };
}

function getHeatLabel(ratio: number) {
  if (ratio <= 1 / 20) return "Uniek";
  if (ratio <= 0.15) return "Zeldzaam";
  if (ratio <= 0.3) return "Gemiddeld";
  if (ratio <= 0.5) return "Populair";
  return "Heel populair";
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

export default function LeCoupTactique({ standings, myUserName }: LeCoupTactiqueProps) {
  const [visiblePlayers, setVisiblePlayers] = useState<Set<string>>(() => new Set(standings.map(t => t.id)));
  const [showOnlyUnique, setShowOnlyUnique] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [sortMode, setSortMode] = useState<"standing" | "panache">("standing");

  const categories = riderCategories;
  const totalPlayers = standings.length;

  // Compute joker pick counts across all teams
  const jokerCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const team of standings) {
      for (const joker of team.jokers) {
        counts.set(joker.number, (counts.get(joker.number) || 0) + 1);
      }
    }
    return counts;
  }, [standings]);

  const { uniqueness, pickCounts, playerStats, mostTactical, averageOverlap } = useMemo(() => {
    const uniqueness = computeUniqueness(standings);
    const pickCounts = computePickCounts(standings);

    const playerStats = standings.map((t) => {
      const playerMap = uniqueness.get(t.userName);
      if (!playerMap) return { name: t.userName, id: t.id, avg: 0, uniqueCount: 0 };
      const vals = Array.from(playerMap.values());
      const uniqueCount = vals.filter(v => v >= 0.95).length;
      return { name: t.userName, id: t.id, avg: vals.reduce((a, b) => a + b, 0) / vals.length, uniqueCount };
    });

    const mostTactical = [...playerStats].sort((a, b) => b.uniqueCount - a.uniqueCount)[0];

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

  // For "alleen verschillen": find the most common pick per category
  const mostCommonPick = useMemo(() => {
    const result = new Map<number, number>();
    for (const cat of categories) {
      const catCounts = pickCounts.get(cat.id);
      if (!catCounts) continue;
      let maxCount = 0;
      let maxRider = 0;
      catCounts.forEach((count, riderNum) => {
        if (count > maxCount) { maxCount = count; maxRider = riderNum; }
      });
      result.set(cat.id, maxRider);
    }
    return result;
  }, [pickCounts]);

  const visibleTeams = sortedTeams.filter(t => visiblePlayers.has(t.id));
  const currentStats = playerStats.find(p => p.name === myUserName);
  const isMe = (name: string) => name === myUserName;
  const myId = standings.find(t => t.userName === myUserName)?.id;

  const togglePlayer = (id: string) => {
    setVisiblePlayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const showAll = () => setVisiblePlayers(new Set(standings.map(t => t.id)));
  const showOnlyMe = () => setVisiblePlayers(new Set(myId ? [myId] : []));
  const resetSelection = () => showAll();

  return (
    <section className="lg:col-span-3">
      <Card className="retro-border overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-5 px-4 md:px-6">
          <div>
            <CardTitle className="font-display text-xl md:text-2xl">
              Le Coup Tactique 🎯
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Uniek vs populair per categorie
            </p>
          </div>

          {/* Summary cards */}
          <div className="mt-4 grid gap-2 grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tactischst"
              value={mostTactical?.name ?? "—"}
              sub={`${mostTactical?.uniqueCount ?? 0} uniek`}
            />
            <StatCard
              label="Jij"
              value={myUserName}
              sub={`${currentStats?.uniqueCount ?? 0} uniek`}
              highlight
            />
            <StatCard
              label="Overlap"
              value={`${averageOverlap}×`}
              sub="gemiddeld"
            />
            <StatCard
              label="Weergave"
              value={showOnlyUnique ? "Échappée" : showOnlyDifferences ? "Verschillen" : "Peloton"}
              sub="Koersmodus"
            />
          </div>

          {/* Player toggles */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">Vergelijk</span>
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 rounded-full" onClick={showAll}>Alles</Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 rounded-full" onClick={showOnlyMe}>Alleen ik</Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 rounded-full" onClick={resetSelection}>Reset</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sortedTeams.map((team) => {
                const active = visiblePlayers.has(team.id);
                const isCurrent = isMe(team.userName);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => togglePlayer(team.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
                      active
                        ? isCurrent
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-foreground/20 bg-foreground/5 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground opacity-40"
                    )}
                  >
                    {team.userName}
                    {isCurrent && " 👈"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant={showOnlyUnique ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 rounded-full"
              onClick={() => { setShowOnlyUnique(prev => !prev); setShowOnlyDifferences(false); }}
            >
              🔥 Échappée
            </Button>
            <Button
              variant={showOnlyDifferences ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 rounded-full"
              onClick={() => { setShowOnlyDifferences(prev => !prev); setShowOnlyUnique(false); }}
            >
              🚴 Verschillen
            </Button>
            <div className="flex gap-0.5 border border-border rounded-full p-0.5">
              <Button
                variant={sortMode === "standing" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-6 rounded-full"
                onClick={() => setSortMode("standing")}
              >
                🏁 Klassement
              </Button>
              <Button
                variant={sortMode === "panache" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-6 rounded-full"
                onClick={() => setSortMode("panache")}
              >
                🦚 Panache
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <span className="h-2.5 w-5 rounded-sm" style={{ background: "linear-gradient(to right, hsl(0 80% 40%), hsl(0 30% 90%))" }} />
              <span>Donker = uniek · Licht = populair</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-medium text-primary">
              <span className="h-2.5 w-2.5 rounded-sm border-2 border-primary bg-card inline-block" />
              Jouw team
            </div>
          </div>
        </CardHeader>

        {/* Heatmap grid */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[900px] gap-1.5 p-4"
              style={{
                gridTemplateColumns: `180px repeat(${visibleTeams.length}, minmax(100px, 1fr))`,
              }}
            >
              {/* Empty corner */}
              <div className="sticky left-0 z-30 bg-background" />

              {/* Player column headers */}
              {visibleTeams.map((team) => {
                const isCurrent = isMe(team.userName);
                const stats = playerStats.find(p => p.name === team.userName);
                return (
                  <div
                    key={team.id}
                    className={cn(
                      "sticky top-0 z-20 rounded-xl border px-3 py-3 text-left",
                      isCurrent
                        ? "border-primary/40 bg-primary/5 shadow-sm ring-2 ring-primary/30"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="truncate text-sm font-bold font-display text-foreground">
                      {team.userName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {stats?.uniqueCount ?? 0} unieke picks
                    </div>
                    {isCurrent && (
                      <div className="mt-1 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        👈 jij
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Category rows */}
              {categories.map((cat, catIndex) => (
                <React.Fragment key={cat.id}>
                  {/* Category label */}
                  <div className="sticky left-0 z-10 flex items-center rounded-xl border border-border bg-secondary/50 px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: `hsl(${CATEGORY_HUES[catIndex % CATEGORY_HUES.length]} 60% 55%)` }}
                      />
                      <span className="truncate text-xs font-semibold text-muted-foreground font-sans">
                        {cat.name}
                      </span>
                    </div>
                  </div>

                  {/* Pick cells */}
                  {visibleTeams.map((team) => {
                    const pick = team.picks[cat.id];
                    const catCounts = pickCounts.get(cat.id);
                    const count = pick ? catCounts?.get(pick.number) ?? 1 : 0;
                    const ratio = count / totalPlayers;
                    const shade = getCategoryShade(catIndex, ratio);
                    const isCurrent = isMe(team.userName);
                    const isUnique = count === 1;
                    const label = getHeatLabel(ratio);

                    // "Verschillen" filter: hide if this pick matches the most common — but never hide my own team
                    const isDifference = pick ? pick.number !== mostCommonPick.get(cat.id) : false;
                    const shouldHideDiff = showOnlyDifferences && !isDifference && !isCurrent;
                    const shouldHideUnique = showOnlyUnique && !isUnique;
                    const shouldHide = shouldHideDiff || shouldHideUnique;

                    return (
                      <Tooltip key={`${team.id}-${cat.id}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative min-h-[60px] rounded-xl border px-2.5 py-2.5 transition-all cursor-default",
                              shade.text,
                              isCurrent && "ring-2 ring-primary/50 ring-offset-1",
                              shouldHide && "opacity-10 saturate-0",
                              isUnique && "shadow-[0_0_0_1px_rgba(220,38,38,0.2),0_4px_12px_rgba(220,38,38,0.12)]",
                            )}
                            style={{
                              backgroundColor: shade.bg,
                              borderColor: isUnique ? "hsl(0 70% 45%)" : "transparent",
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-bold leading-tight">
                                  {pick?.name ?? "—"}
                                </div>
                                <div className="mt-0.5 text-[10px] font-medium opacity-75">
                                  {label}
                                </div>
                              </div>
                              <span
                                className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", shade.badgeText)}
                                style={{ backgroundColor: shade.badgeBg }}
                              >
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
                          <p className="font-sans text-muted-foreground">{count}/{totalPlayers} spelers ({Math.round(ratio * 100)}%)</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Jokers rows */}
              {[0, 1].map((jokerIdx) => (
                <React.Fragment key={`joker-${jokerIdx}`}>
                  <div className="sticky left-0 z-10 flex items-center rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">🃏</span>
                      <span className="truncate text-xs font-semibold text-primary font-sans">
                        Joker {jokerIdx + 1}
                      </span>
                    </div>
                  </div>

                  {visibleTeams.map((team) => {
                    const joker = team.jokers[jokerIdx];
                    const count = joker ? jokerCounts.get(joker.number) ?? 1 : 0;
                    const ratio = count / totalPlayers;
                    const shade = getCategoryShade(categories.length + jokerIdx, ratio);
                    const isCurrent = isMe(team.userName);
                    const isUnique = count === 1;
                    const label = getHeatLabel(ratio);

                    const shouldHide = (showOnlyUnique && !isUnique) || (showOnlyDifferences && false);

                    return (
                      <Tooltip key={`${team.id}-joker-${jokerIdx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative min-h-[60px] rounded-xl border px-2.5 py-2.5 transition-all cursor-default",
                              shade.text,
                              isCurrent && "ring-2 ring-primary/50 ring-offset-1",
                              shouldHide && "opacity-10 saturate-0",
                              isUnique && "shadow-[0_0_0_1px_rgba(220,38,38,0.2),0_4px_12px_rgba(220,38,38,0.12)]",
                            )}
                            style={{
                              backgroundColor: shade.bg,
                              borderColor: isUnique ? "hsl(0 70% 45%)" : "transparent",
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-bold leading-tight">
                                  {joker?.name ?? "—"}
                                </div>
                                <div className="mt-0.5 text-[10px] font-medium opacity-75">
                                  {label}
                                </div>
                              </div>
                              <span
                                className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", shade.badgeText)}
                                style={{ backgroundColor: shade.badgeBg }}
                              >
                                {count}×
                              </span>
                            </div>
                            {isUnique && (
                              <div className="absolute right-1.5 top-1.5 text-xs">🔥</div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs space-y-0.5 max-w-[200px]">
                          <p className="font-display font-bold">{joker?.name ?? "—"} <span className="text-muted-foreground font-sans">#{joker?.number}</span></p>
                          <p className="text-muted-foreground font-sans">
                            {count === 1
                              ? "Unieke joker! 🔥"
                              : `${count - 1} ander${count - 1 > 1 ? "en" : ""} kozen ook deze joker`}
                          </p>
                          <p className="font-sans text-muted-foreground">{count}/{totalPlayers} spelers ({Math.round(ratio * 100)}%)</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Panache score footer */}
          <div className="border-t-2 border-foreground px-4 md:px-6 py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
              Panache Score — Risico vs zekerheid
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 mb-3 italic font-sans">
              Panache = gemiddelde uniekheid over alle categorieën. <code className="bg-muted px-1 rounded font-mono">1 − (mede-kiezers / spelers−1)</code>
            </p>
            <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {[...playerStats]
                .sort((a, b) => b.avg - a.avg)
                .map((stats, rank) => {
                  const team = standings.find(t => t.userName === stats.name);
                  const isCurrent = isMe(stats.name);
                  const panachePercent = Math.round(stats.avg * 100);
                  const uniqueCount = stats.uniqueCount;
                  const safeCount = categories.length - uniqueCount;
                  return (
                    <div
                      key={stats.id}
                      className={cn(
                        "rounded-xl border p-3",
                        isCurrent
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-secondary/30"
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground">#{rank + 1}</span>
                          <span className={cn("text-xs font-bold font-display truncate", isCurrent && "text-primary")}>
                            {stats.name}
                          </span>
                        </div>
                        <div className="text-xs font-bold font-mono text-foreground">
                          {panachePercent}%
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${panachePercent}%`,
                            background: `hsl(${panachePercent > 50 ? 0 : 40} ${50 + panachePercent * 0.3}% ${60 - panachePercent * 0.2}%)`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>🔥 {uniqueCount} uniek</span>
                        <span>🧱 {safeCount} veilig</span>
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
