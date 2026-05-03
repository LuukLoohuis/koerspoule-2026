import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Swords, Crown, Star, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpouleEntries, type PredictionEntry } from "@/hooks/useSubpouleEntries";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

const CLASSIFICATION_LABELS: Record<string, string> = {
  gc: "Eindpodium",
  points: "Puntentrui",
  kom: "Bergtrui",
  youth: "Jongerentrui",
};
const CLASSIFICATION_ORDER = ["gc", "points", "kom", "youth"] as const;

function predictionsByClass(list: PredictionEntry[]) {
  const map = new Map<string, PredictionEntry[]>();
  for (const p of list) {
    const arr = map.get(p.classification) ?? [];
    arr.push(p);
    map.set(p.classification, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
  return map;
}

type Props = { subpouleId: string };

export default function SubpouleBenchmark({ subpouleId }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data, isLoading } = useSubpouleEntries(subpouleId, game?.id);
  const { data: categories = [] } = useCategories(game?.id);

  const [query, setQuery] = useState("");
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const me = useMemo(
    () => data?.entries.find((e) => e.user_id === user?.id) ?? null,
    [data, user?.id]
  );
  const opponent = useMemo(
    () => (opponentId ? data?.entries.find((e) => e.user_id === opponentId) ?? null : null),
    [data, opponentId]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.entries
      .filter((e) => e.user_id !== user?.id)
      .filter((e) => {
        if (!q) return true;
        return (
          e.display_name.toLowerCase().includes(q) ||
          (e.team_name?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [data, query, user?.id]);

  // Set-intersection (light)
  const overlap = useMemo(() => {
    if (!me || !opponent) return null;
    const mine = new Set(Array.from(me.picks.values()).flat());
    const theirs = new Set(Array.from(opponent.picks.values()).flat());
    const sharedPicks: string[] = [];
    for (const id of mine) if (theirs.has(id)) sharedPicks.push(id);
    const sharedJokers: string[] = [];
    for (const id of me.jokers) if (opponent.jokers.has(id)) sharedJokers.push(id);
    const totalUnique = new Set([...mine, ...theirs]).size;
    const pct = totalUnique > 0 ? Math.round((sharedPicks.length / totalUnique) * 100) : 0;
    return { sharedPicks, sharedJokers, pct, diffCount: totalUnique - sharedPicks.length };
  }, [me, opponent]);

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Je hebt nog geen team in deze koers. Maak eerst een team aan om te kunnen vergelijken.
        </CardContent>
      </Card>
    );
  }

  const sortedCats = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const ridersById = data?.ridersById ?? new Map();

  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <Swords className="h-5 w-5 text-primary" /> Team Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam of teamnaam..."
              className="pl-9"
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-md">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {query ? "Geen resultaten" : "Geen andere deelnemers in deze subpoule."}
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.user_id}
                  onClick={() => setOpponentId(e.user_id === opponentId ? null : e.user_id)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center justify-between text-left hover:bg-secondary/40 transition-colors",
                    opponentId === e.user_id && "bg-accent/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.display_name}</div>
                    {e.team_name && (
                      <div className="text-xs text-muted-foreground truncate">{e.team_name}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold tabular-nums">{e.total_points}</div>
                    <div className="text-[10px] text-muted-foreground">pt</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {opponent && overlap && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
            <CardTitle className="font-display flex items-center justify-between gap-2 text-base flex-wrap">
              <span>Jij vs {opponent.display_name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono">{overlap.pct}% overlap</Badge>
                <Badge variant="outline" className="font-mono">{overlap.diffCount} verschil</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-2 px-3 py-3 border-b-2 border-foreground bg-muted/30 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jouw renners</p>
                <p className="font-display font-bold text-lg tabular-nums">{me.picks.size}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gedeeld</p>
                <p className="font-display font-bold text-lg tabular-nums text-primary">{overlap.sharedPicks.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hun renners</p>
                <p className="font-display font-bold text-lg tabular-nums">{opponent.picks.size}</p>
              </div>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Jij</span>
              <span className="text-center">Categorie</span>
              <span className="text-right">{opponent.display_name}</span>
            </div>

            {/* Categories */}
            <div className="divide-y divide-border">
              {sortedCats.map((cat) => {
                const myIds = me.picks.get(cat.id) ?? [];
                const oppIds = opponent.picks.get(cat.id) ?? [];
                const same = myIds.some((id) => oppIds.includes(id));

                return (
                  <div key={cat.id} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-sm items-center">
                    <div className={cn("truncate", same && "text-primary font-medium")}>
                      {myIds.length === 0 ? "—" : myIds.map((id) => ridersById.get(id)?.name ?? "—").join(", ")}
                    </div>
                    <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
                        {cat.short_name || cat.name}
                      </span>
                      {same && (
                        <Star className="h-3 w-3 text-primary fill-primary" />
                      )}
                    </div>
                    <div className={cn("truncate text-right", same && "text-primary font-medium")}>
                      {oppIds.length === 0 ? "—" : oppIds.map((id) => ridersById.get(id)?.name ?? "—").join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Jokers */}
            <div className="border-t-2 border-foreground bg-muted/10">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-bold">Jokers</span>
                {overlap.sharedJokers.length > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {overlap.sharedJokers.length} gedeeld
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-sm items-center">
                <div className="space-y-1">
                  {Array.from(me.jokers).length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    Array.from(me.jokers).map((id) => {
                      const shared = opponent.jokers.has(id);
                      return (
                        <div key={id} className={cn("truncate", shared && "text-primary font-medium")}>
                          {ridersById.get(id)?.name ?? "—"}
                        </div>
                      );
                    })
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-[80px] text-center">Joker</span>
                <div className="space-y-1 text-right">
                  {Array.from(opponent.jokers).length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    Array.from(opponent.jokers).map((id) => {
                      const shared = me.jokers.has(id);
                      return (
                        <div key={id} className={cn("truncate", shared && "text-primary font-medium")}>
                          {ridersById.get(id)?.name ?? "—"}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Predictions */}
            {(me.predictions.length > 0 || opponent.predictions.length > 0) && (
              <div className="border-t-2 border-foreground bg-muted/10">
                <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-bold">Voorspellingen</span>
                </div>
                {(() => {
                  const myMap = predictionsByClass(me.predictions);
                  const oppMap = predictionsByClass(opponent.predictions);
                  return (
                    <div className="divide-y divide-border">
                      {CLASSIFICATION_ORDER.map((cls) => {
                        const myList = myMap.get(cls) ?? [];
                        const oppList = oppMap.get(cls) ?? [];
                        if (myList.length === 0 && oppList.length === 0) return null;
                        return (
                          <div key={cls} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-sm items-center">
                            <div className="space-y-0.5">
                              {myList.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                myList.map((p) => {
                                  const shared = oppList.some((o) => o.position === p.position && o.rider_id === p.rider_id);
                                  return (
                                    <div key={`${cls}-me-${p.position}`} className={cn("truncate", shared && "text-primary font-medium")}>
                                      {cls === "gc" ? `${p.position}. ` : ""}{ridersById.get(p.rider_id)?.name ?? "—"}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-[80px] text-center">
                              {CLASSIFICATION_LABELS[cls]}
                            </span>
                            <div className="space-y-0.5 text-right">
                              {oppList.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                oppList.map((p) => {
                                  const shared = myList.some((m2) => m2.position === p.position && m2.rider_id === p.rider_id);
                                  return (
                                    <div key={`${cls}-opp-${p.position}`} className={cn("truncate", shared && "text-primary font-medium")}>
                                      {cls === "gc" ? `${p.position}. ` : ""}{ridersById.get(p.rider_id)?.name ?? "—"}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
